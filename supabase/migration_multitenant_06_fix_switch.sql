-- =============================================================
-- Fix: platform admins can impersonate any tenant; persist choice.
-- =============================================================

-- 1. Add active_tenant_id to platform_admins to remember last switch
alter table public.platform_admins
  add column if not exists active_tenant_id uuid references public.tenants(id) on delete set null;

-- 2. switch_tenant
create or replace function public.switch_tenant(p_tenant_id uuid)
returns void language plpgsql security definer set search_path = public as $func_switch$
begin
  if public.is_platform_admin() then
    update public.platform_admins
       set active_tenant_id = p_tenant_id
     where user_id = auth.uid();
    update public.tenant_users
       set last_selected = (tenant_id = p_tenant_id)
     where user_id = auth.uid();
    return;
  end if;

  if not exists (
    select 1 from public.tenant_users
     where user_id = auth.uid()
       and tenant_id = p_tenant_id
       and status = 'active'
  ) then
    raise exception 'Sem acesso a esta herdade';
  end if;

  update public.tenant_users
     set last_selected = (tenant_id = p_tenant_id)
   where user_id = auth.uid();
end;
$func_switch$;

-- 3. JWT hook
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable security definer set search_path = public as $func_hook$
declare
  claims jsonb;
  v_user_id uuid;
  v_tenant uuid;
  v_is_platform boolean;
  v_role text;
begin
  claims := event->'claims';
  v_user_id := (event->>'user_id')::uuid;

  select exists (select 1 from public.platform_admins where user_id = v_user_id)
    into v_is_platform;

  if v_is_platform then
    select active_tenant_id into v_tenant
      from public.platform_admins
     where user_id = v_user_id;

    if v_tenant is null then
      select tenant_id into v_tenant from public.tenant_users
       where user_id = v_user_id and status = 'active'
       order by last_selected desc nulls last, created_at asc limit 1;
    end if;

    if v_tenant is null then
      select id into v_tenant from public.tenants
       where status in ('active','trial') order by created_at asc limit 1;
    end if;

    select tu.role into v_role from public.tenant_users tu
     where tu.user_id = v_user_id and tu.tenant_id = v_tenant and tu.status = 'active';
    v_role := coalesce(v_role, 'admin');
  else
    select tu.tenant_id, tu.role
      into v_tenant, v_role
      from public.tenant_users tu
     where tu.user_id = v_user_id and tu.status = 'active'
     order by tu.last_selected desc nulls last, tu.created_at asc
     limit 1;
  end if;

  claims := claims || jsonb_build_object(
    'tenant_id', v_tenant,
    'tenant_role', coalesce(v_role, ''),
    'is_platform_admin', coalesce(v_is_platform, false)
  );
  event := jsonb_set(event, '{claims}', claims);
  return event;
exception when others then
  return event;
end;
$func_hook$;

-- 4. list_my_tenants (includes all tenants for platform admins)
create or replace function public.list_my_tenants()
returns table (
  id uuid,
  slug text,
  name text,
  role text,
  status text,
  is_current boolean
) language plpgsql stable security definer set search_path = public as $func_list$
begin
  if public.is_platform_admin() then
    return query
      select t.id, t.slug, t.name,
             coalesce(tu.role, 'admin') as role,
             t.status,
             coalesce(tu.last_selected, false) as is_current
        from public.tenants t
        left join public.tenant_users tu
          on tu.tenant_id = t.id and tu.user_id = auth.uid() and tu.status = 'active'
       where t.status in ('active','trial')
       order by t.name asc;
  else
    return query
      select t.id, t.slug, t.name, tu.role, tu.status, tu.last_selected
        from public.tenant_users tu
        join public.tenants t on t.id = tu.tenant_id
       where tu.user_id = auth.uid()
         and tu.status = 'active'
         and t.status in ('active','trial')
       order by tu.last_selected desc nulls last, t.name asc;
  end if;
end;
$func_list$;
