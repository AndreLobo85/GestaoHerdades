-- =============================================================
-- Multi-Tenant — Phase 4: Super-Admin RPCs
-- All require is_platform_admin() to execute.
-- =============================================================

-- 1. List all tenants with basic stats (platform admin only)
create or replace function public.admin_list_tenants()
returns table (
  id uuid,
  slug text,
  name text,
  status text,
  plan text,
  trial_ends_at timestamptz,
  users_count bigint,
  modules_enabled bigint,
  created_at timestamptz
) language sql stable security definer set search_path = public as $$
  select
    t.id, t.slug, t.name, t.status, t.plan, t.trial_ends_at,
    (select count(*) from public.tenant_users where tenant_id = t.id and status = 'active') as users_count,
    (select count(*) from public.tenant_modules where tenant_id = t.id and enabled = true) as modules_enabled,
    t.created_at
  from public.tenants t
  where public.is_platform_admin()
  order by t.created_at desc;
$$;

grant execute on function public.admin_list_tenants() to authenticated;

-- 2. Create new tenant (with default modules enabled)
create or replace function public.admin_create_tenant(
  p_name text,
  p_slug text,
  p_plan text default 'starter',
  p_status text default 'trial'
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_tenant_id uuid;
begin
  if not public.is_platform_admin() then raise exception 'Acesso negado'; end if;
  if p_slug !~ '^[a-z0-9-]{3,32}$' then raise exception 'Slug invalido (usar a-z, 0-9, hifen; 3-32 chars)'; end if;

  insert into public.tenants (slug, name, plan, status, created_by)
  values (p_slug, p_name, p_plan, p_status, auth.uid())
  returning id into v_tenant_id;

  -- Default modules enabled
  insert into public.tenant_modules (tenant_id, module_key, enabled)
  select v_tenant_id, m.key, true
    from (values ('activities'),('fuel'),('feed'),('stock'),('expenses'),('vehicles'),('employees')) as m(key);

  return v_tenant_id;
end;
$$;

grant execute on function public.admin_create_tenant(text, text, text, text) to authenticated;

-- 3. Update tenant (name, status, plan, trial)
create or replace function public.admin_update_tenant(
  p_tenant_id uuid,
  p_name text default null,
  p_status text default null,
  p_plan text default null,
  p_trial_ends_at timestamptz default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'Acesso negado'; end if;
  update public.tenants
     set name = coalesce(p_name, name),
         status = coalesce(p_status, status),
         plan = coalesce(p_plan, plan),
         trial_ends_at = coalesce(p_trial_ends_at, trial_ends_at)
   where id = p_tenant_id;
end;
$$;

grant execute on function public.admin_update_tenant(uuid, text, text, text, timestamptz) to authenticated;

-- 4. Toggle module (ligar/desligar per tenant)
create or replace function public.admin_toggle_module(
  p_tenant_id uuid,
  p_module_key text,
  p_enabled boolean
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'Acesso negado'; end if;
  insert into public.tenant_modules (tenant_id, module_key, enabled)
  values (p_tenant_id, p_module_key, p_enabled)
  on conflict (tenant_id, module_key) do update set enabled = p_enabled;
end;
$$;

grant execute on function public.admin_toggle_module(uuid, text, boolean) to authenticated;

-- 5. List users of a tenant
create or replace function public.admin_list_tenant_users(p_tenant_id uuid)
returns table (
  user_id uuid,
  email text,
  full_name text,
  role text,
  status text,
  created_at timestamptz
) language sql stable security definer set search_path = public as $$
  select tu.user_id, au.email, p.full_name, tu.role, tu.status, tu.created_at
    from public.tenant_users tu
    join auth.users au on au.id = tu.user_id
    left join public.profiles p on p.id = tu.user_id
   where public.is_platform_admin()
     and tu.tenant_id = p_tenant_id
   order by tu.created_at desc;
$$;

grant execute on function public.admin_list_tenant_users(uuid) to authenticated;

-- 6. Assign existing user to tenant (by email) — used in "approve" flow
create or replace function public.admin_assign_user(
  p_tenant_id uuid,
  p_email text,
  p_role text default 'utilizador'
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_user_id uuid;
begin
  if not public.is_platform_admin() then raise exception 'Acesso negado'; end if;
  if p_role not in ('admin','utilizador') then raise exception 'Role invalido'; end if;

  select id into v_user_id from auth.users where email = lower(p_email);
  if v_user_id is null then
    raise exception 'Utilizador com email % nao existe. Pede-lhe para se registar primeiro.', p_email;
  end if;

  insert into public.tenant_users (tenant_id, user_id, role, status, invited_by)
  values (p_tenant_id, v_user_id, p_role, 'active', auth.uid())
  on conflict (tenant_id, user_id) do update
     set role = excluded.role, status = 'active';

  -- Mark profile active too
  update public.profiles set status = 'active' where id = v_user_id and status = 'pending';

  return v_user_id;
end;
$$;

grant execute on function public.admin_assign_user(uuid, text, text) to authenticated;

-- 7. Remove user from tenant (soft = inactive)
create or replace function public.admin_remove_user_from_tenant(
  p_tenant_id uuid,
  p_user_id uuid
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'Acesso negado'; end if;
  update public.tenant_users
     set status = 'inactive'
   where tenant_id = p_tenant_id and user_id = p_user_id;
end;
$$;

grant execute on function public.admin_remove_user_from_tenant(uuid, uuid) to authenticated;

-- 8. List pending users (no active tenant membership)
create or replace function public.admin_list_pending_users()
returns table (
  user_id uuid,
  email text,
  full_name text,
  profile_status text,
  created_at timestamptz
) language sql stable security definer set search_path = public as $$
  select p.id, au.email, p.full_name, p.status, p.created_at
    from public.profiles p
    join auth.users au on au.id = p.id
   where public.is_platform_admin()
     and not exists (
       select 1 from public.tenant_users tu
        where tu.user_id = p.id and tu.status = 'active'
     )
   order by p.created_at desc;
$$;

grant execute on function public.admin_list_pending_users() to authenticated;

-- 9. List modules of a tenant
create or replace function public.admin_list_tenant_modules(p_tenant_id uuid)
returns table (module_key text, enabled boolean) language sql stable security definer set search_path = public as $$
  select module_key, enabled
    from public.tenant_modules
   where public.is_platform_admin() and tenant_id = p_tenant_id
   order by module_key;
$$;

grant execute on function public.admin_list_tenant_modules(uuid) to authenticated;
