-- =============================================================
-- Multi-Tenant — Phase 3B: RLS policies on operational tables
--
-- ⚠️ ORDER OF OPERATIONS ⚠️
-- Before running this file:
--   1. Run 03a_jwt_hook.sql (creates the hook function)
--   2. In Supabase Dashboard → Authentication → Hooks:
--      enable "Custom Access Token" hook pointing to
--      public.custom_access_token_hook
--   3. Every user must log out and log back in (new JWT has tenant_id)
--
-- Only then run this file. Otherwise users without tenant_id in JWT
-- will see zero data.
-- =============================================================

-- Drop old generic policies if they exist, then create tenant-scoped ones.

-- === employees =====================================================
alter table public.employees enable row level security;
drop policy if exists "Auth read employees" on public.employees;
drop policy if exists "Auth insert employees" on public.employees;
drop policy if exists "Auth update employees" on public.employees;
drop policy if exists "Auth delete employees" on public.employees;
drop policy if exists tenant_read_employees on public.employees;
drop policy if exists tenant_write_employees on public.employees;

create policy tenant_read_employees on public.employees for select
  using (public.is_platform_admin() or tenant_id = public.current_tenant_id());

create policy tenant_write_employees on public.employees for all
  using (public.is_platform_admin() or tenant_id = public.current_tenant_id())
  with check (public.is_platform_admin() or tenant_id = public.current_tenant_id());

-- === activity_types ================================================
alter table public.activity_types enable row level security;
drop policy if exists "Auth read activity_types" on public.activity_types;
drop policy if exists "Auth insert activity_types" on public.activity_types;
drop policy if exists "Auth update activity_types" on public.activity_types;
drop policy if exists "Auth delete activity_types" on public.activity_types;
drop policy if exists tenant_read_activity_types on public.activity_types;
drop policy if exists tenant_write_activity_types on public.activity_types;

create policy tenant_read_activity_types on public.activity_types for select
  using (public.is_platform_admin() or tenant_id = public.current_tenant_id());

create policy tenant_write_activity_types on public.activity_types for all
  using (public.is_platform_admin() or tenant_id = public.current_tenant_id())
  with check (public.is_platform_admin() or tenant_id = public.current_tenant_id());

-- === activities ====================================================
alter table public.activities enable row level security;
drop policy if exists "Auth read activities" on public.activities;
drop policy if exists "Auth insert activities" on public.activities;
drop policy if exists "Auth update activities" on public.activities;
drop policy if exists "Auth delete activities" on public.activities;
drop policy if exists tenant_read_activities on public.activities;
drop policy if exists tenant_write_activities on public.activities;

create policy tenant_read_activities on public.activities for select
  using (public.is_platform_admin() or tenant_id = public.current_tenant_id());

create policy tenant_write_activities on public.activities for all
  using (public.is_platform_admin() or tenant_id = public.current_tenant_id())
  with check (public.is_platform_admin() or tenant_id = public.current_tenant_id());

-- === vehicles ======================================================
alter table public.vehicles enable row level security;
drop policy if exists "Auth read vehicles" on public.vehicles;
drop policy if exists "Auth insert vehicles" on public.vehicles;
drop policy if exists "Auth update vehicles" on public.vehicles;
drop policy if exists "Auth delete vehicles" on public.vehicles;
drop policy if exists tenant_read_vehicles on public.vehicles;
drop policy if exists tenant_write_vehicles on public.vehicles;

create policy tenant_read_vehicles on public.vehicles for select
  using (public.is_platform_admin() or tenant_id = public.current_tenant_id());

create policy tenant_write_vehicles on public.vehicles for all
  using (public.is_platform_admin() or tenant_id = public.current_tenant_id())
  with check (public.is_platform_admin() or tenant_id = public.current_tenant_id());

-- === fuel_logs =====================================================
alter table public.fuel_logs enable row level security;
drop policy if exists "Auth read fuel_logs" on public.fuel_logs;
drop policy if exists "Auth insert fuel_logs" on public.fuel_logs;
drop policy if exists "Auth update fuel_logs" on public.fuel_logs;
drop policy if exists "Auth delete fuel_logs" on public.fuel_logs;
drop policy if exists tenant_read_fuel_logs on public.fuel_logs;
drop policy if exists tenant_write_fuel_logs on public.fuel_logs;

create policy tenant_read_fuel_logs on public.fuel_logs for select
  using (public.is_platform_admin() or tenant_id = public.current_tenant_id());

create policy tenant_write_fuel_logs on public.fuel_logs for all
  using (public.is_platform_admin() or tenant_id = public.current_tenant_id())
  with check (public.is_platform_admin() or tenant_id = public.current_tenant_id());

-- === products ======================================================
alter table public.products enable row level security;
drop policy if exists "Auth read products" on public.products;
drop policy if exists "Auth insert products" on public.products;
drop policy if exists "Auth update products" on public.products;
drop policy if exists "Auth delete products" on public.products;
drop policy if exists tenant_read_products on public.products;
drop policy if exists tenant_write_products on public.products;

create policy tenant_read_products on public.products for select
  using (public.is_platform_admin() or tenant_id = public.current_tenant_id());

create policy tenant_write_products on public.products for all
  using (public.is_platform_admin() or tenant_id = public.current_tenant_id())
  with check (public.is_platform_admin() or tenant_id = public.current_tenant_id());

-- === stock_movements ===============================================
alter table public.stock_movements enable row level security;
drop policy if exists "Auth read stock_movements" on public.stock_movements;
drop policy if exists "Auth insert stock_movements" on public.stock_movements;
drop policy if exists "Auth update stock_movements" on public.stock_movements;
drop policy if exists "Auth delete stock_movements" on public.stock_movements;
drop policy if exists tenant_read_stock_movements on public.stock_movements;
drop policy if exists tenant_write_stock_movements on public.stock_movements;

create policy tenant_read_stock_movements on public.stock_movements for select
  using (public.is_platform_admin() or tenant_id = public.current_tenant_id());

create policy tenant_write_stock_movements on public.stock_movements for all
  using (public.is_platform_admin() or tenant_id = public.current_tenant_id())
  with check (public.is_platform_admin() or tenant_id = public.current_tenant_id());

-- === feed_items ====================================================
alter table public.feed_items enable row level security;
drop policy if exists "Auth read feed_items" on public.feed_items;
drop policy if exists "Auth insert feed_items" on public.feed_items;
drop policy if exists "Auth update feed_items" on public.feed_items;
drop policy if exists "Auth delete feed_items" on public.feed_items;
drop policy if exists tenant_read_feed_items on public.feed_items;
drop policy if exists tenant_write_feed_items on public.feed_items;

create policy tenant_read_feed_items on public.feed_items for select
  using (public.is_platform_admin() or tenant_id = public.current_tenant_id());

create policy tenant_write_feed_items on public.feed_items for all
  using (public.is_platform_admin() or tenant_id = public.current_tenant_id())
  with check (public.is_platform_admin() or tenant_id = public.current_tenant_id());

-- === feed_logs =====================================================
alter table public.feed_logs enable row level security;
drop policy if exists "Auth read feed_logs" on public.feed_logs;
drop policy if exists "Auth insert feed_logs" on public.feed_logs;
drop policy if exists "Auth update feed_logs" on public.feed_logs;
drop policy if exists "Auth delete feed_logs" on public.feed_logs;
drop policy if exists tenant_read_feed_logs on public.feed_logs;
drop policy if exists tenant_write_feed_logs on public.feed_logs;

create policy tenant_read_feed_logs on public.feed_logs for select
  using (public.is_platform_admin() or tenant_id = public.current_tenant_id());

create policy tenant_write_feed_logs on public.feed_logs for all
  using (public.is_platform_admin() or tenant_id = public.current_tenant_id())
  with check (public.is_platform_admin() or tenant_id = public.current_tenant_id());

-- === expense_categories ============================================
alter table public.expense_categories enable row level security;
drop policy if exists "Auth read expense_categories" on public.expense_categories;
drop policy if exists "Auth insert expense_categories" on public.expense_categories;
drop policy if exists "Auth update expense_categories" on public.expense_categories;
drop policy if exists "Auth delete expense_categories" on public.expense_categories;
drop policy if exists tenant_read_expense_categories on public.expense_categories;
drop policy if exists tenant_write_expense_categories on public.expense_categories;

create policy tenant_read_expense_categories on public.expense_categories for select
  using (public.is_platform_admin() or tenant_id = public.current_tenant_id());

create policy tenant_write_expense_categories on public.expense_categories for all
  using (public.is_platform_admin() or tenant_id = public.current_tenant_id())
  with check (public.is_platform_admin() or tenant_id = public.current_tenant_id());

-- === general_expenses ==============================================
alter table public.general_expenses enable row level security;
drop policy if exists "Auth read general_expenses" on public.general_expenses;
drop policy if exists "Auth insert general_expenses" on public.general_expenses;
drop policy if exists "Auth update general_expenses" on public.general_expenses;
drop policy if exists "Auth delete general_expenses" on public.general_expenses;
drop policy if exists tenant_read_general_expenses on public.general_expenses;
drop policy if exists tenant_write_general_expenses on public.general_expenses;

create policy tenant_read_general_expenses on public.general_expenses for select
  using (public.is_platform_admin() or tenant_id = public.current_tenant_id());

create policy tenant_write_general_expenses on public.general_expenses for all
  using (public.is_platform_admin() or tenant_id = public.current_tenant_id())
  with check (public.is_platform_admin() or tenant_id = public.current_tenant_id());

-- === expenses (vehicle) ============================================
alter table public.expenses enable row level security;
drop policy if exists "Auth read expenses" on public.expenses;
drop policy if exists "Auth insert expenses" on public.expenses;
drop policy if exists "Auth update expenses" on public.expenses;
drop policy if exists "Auth delete expenses" on public.expenses;
drop policy if exists tenant_read_expenses on public.expenses;
drop policy if exists tenant_write_expenses on public.expenses;

create policy tenant_read_expenses on public.expenses for select
  using (public.is_platform_admin() or tenant_id = public.current_tenant_id());

create policy tenant_write_expenses on public.expenses for all
  using (public.is_platform_admin() or tenant_id = public.current_tenant_id())
  with check (public.is_platform_admin() or tenant_id = public.current_tenant_id());

-- =============================================================
-- End of Phase 3B. Tenant isolation is now enforced at the DB layer.
-- Verify by logging in and checking you still see your data.
-- If data disappears: the JWT hook is not enabled OR you need to log out+in.
-- =============================================================
