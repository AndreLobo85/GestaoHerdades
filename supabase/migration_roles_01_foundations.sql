-- =============================================================
-- Dynamic Roles — Phase A: Foundations
-- Additive migration. Does NOT yet alter any RLS policies.
-- =============================================================

-- 1. Roles per tenant
create table if not exists public.tenant_roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  key text not null,
  name text not null,
  description text,
  is_system boolean not null default false,
  created_at timestamptz default now(),
  created_by uuid references auth.users(id),
  unique (tenant_id, key)
);
create index if not exists idx_tenant_roles_tenant on public.tenant_roles(tenant_id);

alter table public.tenant_roles enable row level security;

drop policy if exists tenant_roles_admin_all on public.tenant_roles;
create policy tenant_roles_admin_all on public.tenant_roles
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());

drop policy if exists tenant_roles_read_members on public.tenant_roles;
create policy tenant_roles_read_members on public.tenant_roles
  for select using (
    tenant_id in (select tenant_id from public.tenant_users where user_id = auth.uid() and status = 'active')
  );

-- 2. Permissions per role (module + action → allowed)
create table if not exists public.tenant_role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.tenant_roles(id) on delete cascade,
  module_key text not null,
  action text not null,
  allowed boolean not null default false,
  unique (role_id, module_key, action)
);
create index if not exists idx_trp_role on public.tenant_role_permissions(role_id);

alter table public.tenant_role_permissions enable row level security;

drop policy if exists trp_admin_all on public.tenant_role_permissions;
create policy trp_admin_all on public.tenant_role_permissions
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());

drop policy if exists trp_read_members on public.tenant_role_permissions;
create policy trp_read_members on public.tenant_role_permissions
  for select using (
    role_id in (
      select r.id from public.tenant_roles r
      join public.tenant_users tu on tu.tenant_id = r.tenant_id
      where tu.user_id = auth.uid() and tu.status = 'active'
    )
  );

-- 3. Add role_id to tenant_users (nullable, backfill later)
alter table public.tenant_users
  add column if not exists role_id uuid references public.tenant_roles(id) on delete restrict;

-- 4. Seed system roles for every existing tenant
do $seed$
declare t record;
  v_admin_id uuid;
  v_user_id uuid;
  m text;
  a text;
  modules text[] := array['activities','fuel','feed','stock','expenses','vehicles','employees'];
  actions text[] := array['view','create','edit','delete','export','manage'];
begin
  for t in select id from public.tenants loop
    -- Admin role
    insert into public.tenant_roles (tenant_id, key, name, description, is_system)
    values (t.id, 'admin', 'Admin', 'Acesso total à herdade', true)
    on conflict (tenant_id, key) do update set name = excluded.name
    returning id into v_admin_id;
    if v_admin_id is null then
      select id into v_admin_id from public.tenant_roles where tenant_id = t.id and key = 'admin';
    end if;

    -- Utilizador role
    insert into public.tenant_roles (tenant_id, key, name, description, is_system)
    values (t.id, 'utilizador', 'Utilizador', 'Acesso de leitura aos módulos operacionais', true)
    on conflict (tenant_id, key) do update set name = excluded.name
    returning id into v_user_id;
    if v_user_id is null then
      select id into v_user_id from public.tenant_roles where tenant_id = t.id and key = 'utilizador';
    end if;

    -- Permissions for Admin: everything = true
    foreach m in array modules loop
      foreach a in array actions loop
        insert into public.tenant_role_permissions (role_id, module_key, action, allowed)
        values (v_admin_id, m, a, true)
        on conflict (role_id, module_key, action) do update set allowed = true;
      end loop;
    end loop;
    -- Virtual permissions for Admin
    insert into public.tenant_role_permissions (role_id, module_key, action, allowed) values
      (v_admin_id, 'users', 'invite', true),
      (v_admin_id, 'users', 'manage_roles', true),
      (v_admin_id, 'tenant', 'settings', true)
    on conflict (role_id, module_key, action) do update set allowed = true;

    -- Permissions for Utilizador: view-only on operational modules
    foreach m in array modules loop
      insert into public.tenant_role_permissions (role_id, module_key, action, allowed)
      values (v_user_id, m, 'view', true)
      on conflict (role_id, module_key, action) do update set allowed = true;
      foreach a in array actions loop
        if a <> 'view' then
          insert into public.tenant_role_permissions (role_id, module_key, action, allowed)
          values (v_user_id, m, a, false)
          on conflict (role_id, module_key, action) do nothing;
        end if;
      end loop;
    end loop;
    -- Virtual denied for Utilizador
    insert into public.tenant_role_permissions (role_id, module_key, action, allowed) values
      (v_user_id, 'users', 'invite', false),
      (v_user_id, 'users', 'manage_roles', false),
      (v_user_id, 'tenant', 'settings', false)
    on conflict (role_id, module_key, action) do nothing;
  end loop;
end
$seed$;

-- 5. Backfill tenant_users.role_id from the legacy text column
update public.tenant_users tu
   set role_id = tr.id
  from public.tenant_roles tr
 where tr.tenant_id = tu.tenant_id
   and tr.key = tu.role
   and tu.role_id is null;

-- 6. Hook into admin_create_tenant to seed roles for NEW tenants too
create or replace function public.admin_create_tenant(
  p_name text,
  p_slug text,
  p_plan text default 'starter',
  p_status text default 'trial'
) returns uuid language plpgsql security definer set search_path = public as $func_create$
declare
  v_tenant_id uuid;
  v_admin_id uuid;
  v_user_id uuid;
  m text;
  a text;
  modules text[] := array['activities','fuel','feed','stock','expenses','vehicles','employees'];
  actions text[] := array['view','create','edit','delete','export','manage'];
begin
  if not public.is_platform_admin() then raise exception 'Acesso negado'; end if;
  if p_slug !~ '^[a-z0-9-]{3,32}$' then raise exception 'Slug invalido (a-z, 0-9, hifen; 3-32 chars)'; end if;

  insert into public.tenants (slug, name, plan, status, created_by)
  values (p_slug, p_name, p_plan, p_status, auth.uid())
  returning id into v_tenant_id;

  -- Default modules enabled
  insert into public.tenant_modules (tenant_id, module_key, enabled)
  select v_tenant_id, m, true
    from unnest(modules) m;

  -- System roles
  insert into public.tenant_roles (tenant_id, key, name, description, is_system)
  values (v_tenant_id, 'admin', 'Admin', 'Acesso total à herdade', true)
  returning id into v_admin_id;

  insert into public.tenant_roles (tenant_id, key, name, description, is_system)
  values (v_tenant_id, 'utilizador', 'Utilizador', 'Acesso de leitura aos módulos operacionais', true)
  returning id into v_user_id;

  -- Admin permissions: all true
  foreach m in array modules loop
    foreach a in array actions loop
      insert into public.tenant_role_permissions (role_id, module_key, action, allowed)
      values (v_admin_id, m, a, true);
    end loop;
  end loop;
  insert into public.tenant_role_permissions (role_id, module_key, action, allowed) values
    (v_admin_id, 'users', 'invite', true),
    (v_admin_id, 'users', 'manage_roles', true),
    (v_admin_id, 'tenant', 'settings', true);

  -- Utilizador permissions: view on operational modules
  foreach m in array modules loop
    insert into public.tenant_role_permissions (role_id, module_key, action, allowed)
    values (v_user_id, m, 'view', true);
  end loop;

  return v_tenant_id;
end;
$func_create$;

-- 7. Helper: has_permission() — not yet used by policies (Phase B will wire it)
create or replace function public.has_permission(p_module text, p_action text)
returns boolean language sql stable security definer set search_path = public as $func_has$
  select public.is_platform_admin() or exists (
    select 1 from public.tenant_users tu
      join public.tenant_role_permissions p on p.role_id = tu.role_id
     where tu.user_id = auth.uid()
       and tu.tenant_id = public.current_tenant_id()
       and tu.status = 'active'
       and p.module_key = p_module
       and p.action = p_action
       and p.allowed = true
  );
$func_has$;

grant execute on function public.has_permission(text, text) to authenticated;

-- 8. RPCs for Super-Admin / tenant admin to list and edit roles
create or replace function public.admin_list_tenant_roles(p_tenant_id uuid)
returns table (
  id uuid, key text, name text, description text, is_system boolean,
  users_count bigint, created_at timestamptz
) language sql stable security definer set search_path = public as $func_listroles$
  select r.id, r.key, r.name, r.description, r.is_system,
         (select count(*) from public.tenant_users where role_id = r.id and status = 'active'),
         r.created_at
    from public.tenant_roles r
   where (public.is_platform_admin() or exists (
            select 1 from public.tenant_users where user_id = auth.uid() and tenant_id = p_tenant_id and status = 'active'
         ))
     and r.tenant_id = p_tenant_id
   order by r.is_system desc, r.name asc;
$func_listroles$;

grant execute on function public.admin_list_tenant_roles(uuid) to authenticated;

create or replace function public.admin_list_role_permissions(p_role_id uuid)
returns table (module_key text, action text, allowed boolean)
language sql stable security definer set search_path = public as $func_listperms$
  select p.module_key, p.action, p.allowed
    from public.tenant_role_permissions p
    join public.tenant_roles r on r.id = p.role_id
   where p.role_id = p_role_id
     and (public.is_platform_admin() or exists (
            select 1 from public.tenant_users where user_id = auth.uid() and tenant_id = r.tenant_id and status = 'active'
         ))
   order by p.module_key, p.action;
$func_listperms$;

grant execute on function public.admin_list_role_permissions(uuid) to authenticated;

create or replace function public.admin_upsert_role(
  p_tenant_id uuid,
  p_role_id uuid,        -- null = create new
  p_key text,
  p_name text,
  p_description text
) returns uuid language plpgsql security definer set search_path = public as $func_upsertrole$
declare v_id uuid;
begin
  if not (public.is_platform_admin() or exists (
    select 1 from public.tenant_users tu
      join public.tenant_roles r on r.id = tu.role_id
      join public.tenant_role_permissions p on p.role_id = r.id
     where tu.user_id = auth.uid() and tu.tenant_id = p_tenant_id
       and tu.status = 'active' and p.module_key = 'users' and p.action = 'manage_roles' and p.allowed = true
  )) then raise exception 'Acesso negado'; end if;

  if p_role_id is null then
    insert into public.tenant_roles (tenant_id, key, name, description, is_system, created_by)
    values (p_tenant_id, p_key, p_name, p_description, false, auth.uid())
    returning id into v_id;
  else
    update public.tenant_roles
       set name = p_name, description = p_description
     where id = p_role_id and tenant_id = p_tenant_id
    returning id into v_id;
  end if;

  return v_id;
end;
$func_upsertrole$;

grant execute on function public.admin_upsert_role(uuid, uuid, text, text, text) to authenticated;

create or replace function public.admin_set_role_permission(
  p_role_id uuid, p_module_key text, p_action text, p_allowed boolean
) returns void language plpgsql security definer set search_path = public as $func_setperm$
declare v_tenant_id uuid; v_is_system boolean;
begin
  select tenant_id, is_system into v_tenant_id, v_is_system
    from public.tenant_roles where id = p_role_id;
  if v_tenant_id is null then raise exception 'Role não encontrado'; end if;

  if not (public.is_platform_admin() or exists (
    select 1 from public.tenant_users tu
      join public.tenant_role_permissions p on p.role_id = tu.role_id
     where tu.user_id = auth.uid() and tu.tenant_id = v_tenant_id
       and tu.status = 'active' and p.module_key = 'users' and p.action = 'manage_roles' and p.allowed = true
  )) then raise exception 'Acesso negado'; end if;

  -- Do not allow editing system 'admin' (always full access)
  if v_is_system and exists (select 1 from public.tenant_roles where id = p_role_id and key = 'admin') and not p_allowed then
    raise exception 'Não pode retirar permissões ao role Admin';
  end if;

  insert into public.tenant_role_permissions (role_id, module_key, action, allowed)
  values (p_role_id, p_module_key, p_action, p_allowed)
  on conflict (role_id, module_key, action) do update set allowed = excluded.allowed;
end;
$func_setperm$;

grant execute on function public.admin_set_role_permission(uuid, text, text, boolean) to authenticated;

create or replace function public.admin_delete_role(p_role_id uuid)
returns void language plpgsql security definer set search_path = public as $func_delrole$
declare v_tenant_id uuid; v_is_system boolean;
begin
  select tenant_id, is_system into v_tenant_id, v_is_system
    from public.tenant_roles where id = p_role_id;
  if v_tenant_id is null then return; end if;

  if v_is_system then raise exception 'Não pode eliminar um role do sistema'; end if;

  if not (public.is_platform_admin() or exists (
    select 1 from public.tenant_users tu
      join public.tenant_role_permissions p on p.role_id = tu.role_id
     where tu.user_id = auth.uid() and tu.tenant_id = v_tenant_id
       and tu.status = 'active' and p.module_key = 'users' and p.action = 'manage_roles' and p.allowed = true
  )) then raise exception 'Acesso negado'; end if;

  if exists (select 1 from public.tenant_users where role_id = p_role_id) then
    raise exception 'Role tem utilizadores atribuídos; mova-os primeiro';
  end if;

  delete from public.tenant_roles where id = p_role_id;
end;
$func_delrole$;

grant execute on function public.admin_delete_role(uuid) to authenticated;
