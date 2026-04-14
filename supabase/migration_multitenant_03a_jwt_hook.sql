-- =============================================================
-- Multi-Tenant — Phase 3A: JWT custom access token hook
-- Adds tenant_id + is_platform_admin claims to every access token.
-- =============================================================

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable set search_path = public as $$
declare
  claims jsonb;
  v_user_id uuid;
  v_tenant uuid;
  v_is_platform boolean;
  v_role text;
begin
  claims := event->'claims';
  v_user_id := (event->>'user_id')::uuid;

  -- Pick preferred tenant: last_selected=true, then oldest active membership
  select tu.tenant_id, tu.role
    into v_tenant, v_role
    from public.tenant_users tu
   where tu.user_id = v_user_id and tu.status = 'active'
   order by tu.last_selected desc nulls last, tu.created_at asc
   limit 1;

  select exists (select 1 from public.platform_admins where user_id = v_user_id)
    into v_is_platform;

  claims := claims || jsonb_build_object(
    'tenant_id', v_tenant,
    'tenant_role', coalesce(v_role, ''),
    'is_platform_admin', coalesce(v_is_platform, false)
  );

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

-- Grant execute so Supabase Auth can call the hook
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

-- switch_tenant RPC: used by frontend when user picks another herdade
create or replace function public.switch_tenant(p_tenant_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.tenant_users
     where user_id = auth.uid()
       and tenant_id = p_tenant_id
       and status = 'active'
  ) then
    raise exception 'Sem acesso a este tenant';
  end if;

  update public.tenant_users
     set last_selected = (tenant_id = p_tenant_id)
   where user_id = auth.uid();
end;
$$;

grant execute on function public.switch_tenant(uuid) to authenticated;

-- list_my_tenants RPC: returns tenants the current user can access
create or replace function public.list_my_tenants()
returns table (
  id uuid,
  slug text,
  name text,
  role text,
  status text,
  is_current boolean
) language sql stable security definer set search_path = public as $$
  select t.id, t.slug, t.name, tu.role, tu.status, tu.last_selected
    from public.tenant_users tu
    join public.tenants t on t.id = tu.tenant_id
   where tu.user_id = auth.uid()
     and tu.status = 'active'
     and t.status in ('active','trial')
   order by tu.last_selected desc nulls last, t.name asc;
$$;

grant execute on function public.list_my_tenants() to authenticated;
