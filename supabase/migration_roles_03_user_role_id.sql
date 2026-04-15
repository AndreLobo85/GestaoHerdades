-- =============================================================
-- Phase B/C wiring: user creation/assign now uses role_id;
-- list_tenant_users returns role name from tenant_roles.
-- =============================================================

-- 1. Update Utilizador default seed to match current UX (no access to stock/expenses by default)
do $patch$
declare r record;
begin
  for r in
    select tr.id from public.tenant_roles tr
     where tr.key = 'utilizador' and tr.is_system = true
  loop
    update public.tenant_role_permissions
       set allowed = false
     where role_id = r.id
       and module_key in ('stock','expenses')
       and action = 'view';
  end loop;
end
$patch$;

-- 2. tenant_add_user: accept role_id OR role text; sync both columns
create or replace function public.tenant_add_user(
  p_tenant_id uuid,
  p_email text,
  p_role text default 'utilizador',
  p_role_id uuid default null
) returns uuid language plpgsql security definer set search_path = public as $func_add$
declare
  v_user_id uuid;
  v_role_id uuid := p_role_id;
  v_role_text text := p_role;
begin
  if not (
    public.is_platform_admin()
    or exists (
      select 1 from public.tenant_users
       where user_id = auth.uid() and tenant_id = p_tenant_id and role = 'admin' and status = 'active'
    )
  ) then
    raise exception 'Acesso negado';
  end if;

  select id into v_user_id from auth.users where lower(email) = lower(p_email);
  if v_user_id is null then raise exception 'Utilizador com email % nao existe.', p_email; end if;

  -- Resolve role_id from text if not provided
  if v_role_id is null then
    select id into v_role_id from public.tenant_roles
     where tenant_id = p_tenant_id and key = v_role_text;
    if v_role_id is null then raise exception 'Role % nao encontrado nesta herdade.', v_role_text; end if;
  else
    select key into v_role_text from public.tenant_roles
     where id = v_role_id and tenant_id = p_tenant_id;
    if v_role_text is null then raise exception 'Role nao encontrado nesta herdade.'; end if;
  end if;

  -- Legacy text role only accepts 'admin' or 'utilizador' due to CHECK constraint
  if v_role_text not in ('admin','utilizador') then
    -- For custom roles, default the legacy column to 'utilizador'
    insert into public.tenant_users (tenant_id, user_id, role, role_id, status, invited_by)
    values (p_tenant_id, v_user_id, 'utilizador', v_role_id, 'active', auth.uid())
    on conflict (tenant_id, user_id) do update
       set role = 'utilizador', role_id = excluded.role_id, status = 'active';
  else
    insert into public.tenant_users (tenant_id, user_id, role, role_id, status, invited_by)
    values (p_tenant_id, v_user_id, v_role_text, v_role_id, 'active', auth.uid())
    on conflict (tenant_id, user_id) do update
       set role = excluded.role, role_id = excluded.role_id, status = 'active';
  end if;

  update public.profiles set status = 'active' where id = v_user_id;
  return v_user_id;
end;
$func_add$;

grant execute on function public.tenant_add_user(uuid, text, text, uuid) to authenticated;

-- 3. admin_assign_user: same upgrade
create or replace function public.admin_assign_user(
  p_tenant_id uuid,
  p_email text,
  p_role text default 'utilizador',
  p_role_id uuid default null
) returns uuid language plpgsql security definer set search_path = public as $func_assign$
declare
  v_user_id uuid;
  v_role_id uuid := p_role_id;
  v_role_text text := p_role;
begin
  if not public.is_platform_admin() then raise exception 'Acesso negado'; end if;

  select id into v_user_id from auth.users where lower(email) = lower(p_email);
  if v_user_id is null then raise exception 'Utilizador com email % nao existe.', p_email; end if;

  if v_role_id is null then
    select id into v_role_id from public.tenant_roles where tenant_id = p_tenant_id and key = v_role_text;
    if v_role_id is null then raise exception 'Role % nao encontrado nesta herdade.', v_role_text; end if;
  else
    select key into v_role_text from public.tenant_roles where id = v_role_id and tenant_id = p_tenant_id;
    if v_role_text is null then raise exception 'Role nao encontrado nesta herdade.'; end if;
  end if;

  if v_role_text not in ('admin','utilizador') then
    insert into public.tenant_users (tenant_id, user_id, role, role_id, status, invited_by)
    values (p_tenant_id, v_user_id, 'utilizador', v_role_id, 'active', auth.uid())
    on conflict (tenant_id, user_id) do update
       set role = 'utilizador', role_id = excluded.role_id, status = 'active';
  else
    insert into public.tenant_users (tenant_id, user_id, role, role_id, status, invited_by)
    values (p_tenant_id, v_user_id, v_role_text, v_role_id, 'active', auth.uid())
    on conflict (tenant_id, user_id) do update
       set role = excluded.role, role_id = excluded.role_id, status = 'active';
  end if;

  update public.profiles set status = 'active' where id = v_user_id and status = 'pending';
  return v_user_id;
end;
$func_assign$;

grant execute on function public.admin_assign_user(uuid, text, text, uuid) to authenticated;

-- 4. admin_list_tenant_users now returns role name from tenant_roles
drop function if exists public.admin_list_tenant_users(uuid);
create function public.admin_list_tenant_users(p_tenant_id uuid)
returns table (
  user_id uuid,
  email text,
  full_name text,
  role text,             -- legacy text
  role_id uuid,
  role_name text,        -- pretty name from tenant_roles
  status text,
  created_at timestamptz
) language sql stable security definer set search_path = public as $func_listusers$
  select tu.user_id, au.email, p.full_name, tu.role, tu.role_id, tr.name, tu.status, tu.created_at
    from public.tenant_users tu
    join auth.users au on au.id = tu.user_id
    left join public.profiles p on p.id = tu.user_id
    left join public.tenant_roles tr on tr.id = tu.role_id
   where public.is_platform_admin()
     and tu.tenant_id = p_tenant_id
   order by tu.created_at desc;
$func_listusers$;

grant execute on function public.admin_list_tenant_users(uuid) to authenticated;
