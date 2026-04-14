-- =============================================================
-- Multi-Tenant — Phase 1: Foundations (ADDITIVE, safe to run)
-- Creates global tenant/user/module tables + audit log + helpers.
-- Does NOT touch existing operational tables yet.
-- =============================================================

-- 1. Tenants
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null check (slug ~ '^[a-z0-9-]{3,32}$'),
  name text not null,
  status text not null default 'active'
    check (status in ('trial','active','suspended','inactive')),
  trial_ends_at timestamptz,
  plan text not null default 'starter',
  quotas jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

-- 2. Tenant <-> User link
create table if not exists public.tenant_users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'utilizador' check (role in ('admin','utilizador')),
  status text not null default 'active' check (status in ('active','inactive','pending')),
  last_selected boolean not null default false,
  invited_by uuid references auth.users(id),
  created_at timestamptz default now(),
  unique (tenant_id, user_id)
);
create index if not exists idx_tenant_users_user on public.tenant_users(user_id);
create index if not exists idx_tenant_users_tenant on public.tenant_users(tenant_id);

-- 3. Module feature-flags per tenant
create table if not exists public.tenant_modules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  module_key text not null,
  enabled boolean not null default true,
  config jsonb default '{}'::jsonb,
  unique (tenant_id, module_key)
);
create index if not exists idx_tenant_modules_tenant on public.tenant_modules(tenant_id);

-- 4. Platform super-admins
create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

-- 5. Audit log (cross-tenant, immutable for normal users)
create table if not exists public.audit_log (
  id bigserial primary key,
  tenant_id uuid references public.tenants(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  table_name text,
  record_id uuid,
  before jsonb,
  after jsonb,
  ip inet,
  created_at timestamptz default now()
);
create index if not exists idx_audit_tenant_time on public.audit_log(tenant_id, created_at desc);

-- 6. Helper functions
create or replace function public.user_tenants()
returns setof uuid language sql stable security definer set search_path = public as $$
  select tenant_id from public.tenant_users
   where user_id = auth.uid() and status = 'active'
$$;

create or replace function public.current_tenant_id()
returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id', '')::uuid
$$;

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid())
$$;

-- 7. RLS on the new global tables (platform-admin only, except self-reads)
alter table public.tenants enable row level security;
alter table public.tenant_users enable row level security;
alter table public.tenant_modules enable row level security;
alter table public.platform_admins enable row level security;
alter table public.audit_log enable row level security;

-- tenants: platform admins full, authenticated users can read tenants they belong to
drop policy if exists tenants_admin_all on public.tenants;
create policy tenants_admin_all on public.tenants
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());

drop policy if exists tenants_read_own on public.tenants;
create policy tenants_read_own on public.tenants
  for select using (
    id in (select tenant_id from public.tenant_users where user_id = auth.uid() and status = 'active')
  );

-- tenant_users: platform admins full; user can read own rows
drop policy if exists tenant_users_admin_all on public.tenant_users;
create policy tenant_users_admin_all on public.tenant_users
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());

drop policy if exists tenant_users_read_self on public.tenant_users;
create policy tenant_users_read_self on public.tenant_users
  for select using (user_id = auth.uid());

-- tenant_modules: platform admins full; authenticated users read only for their active tenant
drop policy if exists tenant_modules_admin_all on public.tenant_modules;
create policy tenant_modules_admin_all on public.tenant_modules
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());

drop policy if exists tenant_modules_read on public.tenant_modules;
create policy tenant_modules_read on public.tenant_modules
  for select using (
    tenant_id in (select tenant_id from public.tenant_users where user_id = auth.uid() and status = 'active')
  );

-- platform_admins: only platform admins can manage
drop policy if exists platform_admins_manage on public.platform_admins;
create policy platform_admins_manage on public.platform_admins
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());

-- audit_log: platform admins read all, user reads own tenant events
drop policy if exists audit_admin_read on public.audit_log;
create policy audit_admin_read on public.audit_log
  for select using (public.is_platform_admin());

drop policy if exists audit_tenant_read on public.audit_log;
create policy audit_tenant_read on public.audit_log
  for select using (
    tenant_id = public.current_tenant_id()
  );

-- INSERT allowed to any authenticated (triggers will write here)
drop policy if exists audit_insert on public.audit_log;
create policy audit_insert on public.audit_log
  for insert with check (auth.role() = 'authenticated' or public.is_platform_admin());

-- 8. Seed tenant "passareiro" (existing data belongs here)
insert into public.tenants (slug, name, status, plan)
  values ('passareiro', 'Herdade do Passareiro', 'active', 'enterprise')
  on conflict (slug) do nothing;

-- 9. Default modules enabled for the seed tenant
insert into public.tenant_modules (tenant_id, module_key, enabled)
select t.id, m.key, true
  from public.tenants t
 cross join (values
   ('activities'), ('fuel'), ('feed'), ('stock'),
   ('expenses'), ('vehicles'), ('employees')
 ) as m(key)
 where t.slug = 'passareiro'
on conflict (tenant_id, module_key) do nothing;

-- 10. Associate ALL existing active profiles with the seed tenant
--     Preserves their current role; defaults to 'utilizador' if missing
insert into public.tenant_users (tenant_id, user_id, role, status, last_selected)
select t.id, p.id,
       coalesce(p.role, 'utilizador'),
       case when p.status = 'active' then 'active' else 'inactive' end,
       true
  from public.profiles p
 cross join public.tenants t
 where t.slug = 'passareiro'
on conflict (tenant_id, user_id) do nothing;

-- 11. Mark existing admins as platform_admins (initial bootstrap)
--     You can revoke later via: delete from platform_admins where user_id = '...';
insert into public.platform_admins (user_id)
select id from public.profiles where role = 'admin' and status = 'active'
on conflict (user_id) do nothing;

-- =============================================================
-- End of Phase 1. No existing operational tables were modified.
-- Next phase will ADD tenant_id columns (nullable first, then NOT NULL).
-- =============================================================
