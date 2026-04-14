-- =============================================================
-- Multi-Tenant — Phase 2: add tenant_id to all operational tables
-- Strategy per table:
--   1) ADD COLUMN nullable
--   2) BACKFILL to the 'passareiro' tenant
--   3) SET NOT NULL
--   4) CREATE INDEX (tenant_id, ...)
-- RLS policies are NOT enabled here yet — Phase 3 will do it.
-- =============================================================

-- Local var: capture passareiro tenant id once
do $$
declare v_tenant uuid;
begin
  select id into v_tenant from public.tenants where slug = 'passareiro';
  if v_tenant is null then raise exception 'Tenant passareiro nao encontrado. Corre Phase 1 primeiro.'; end if;

  -- === 1. employees ============================================
  if not exists (select 1 from information_schema.columns where table_name = 'employees' and column_name = 'tenant_id') then
    alter table public.employees add column tenant_id uuid references public.tenants(id) on delete restrict;
  end if;
  update public.employees set tenant_id = v_tenant where tenant_id is null;
  alter table public.employees alter column tenant_id set not null;
  create index if not exists idx_employees_tenant on public.employees(tenant_id);

  -- === 2. activity_types =======================================
  if not exists (select 1 from information_schema.columns where table_name = 'activity_types' and column_name = 'tenant_id') then
    alter table public.activity_types add column tenant_id uuid references public.tenants(id) on delete restrict;
  end if;
  update public.activity_types set tenant_id = v_tenant where tenant_id is null;
  alter table public.activity_types alter column tenant_id set not null;
  create index if not exists idx_activity_types_tenant on public.activity_types(tenant_id);

  -- === 3. activities ===========================================
  if not exists (select 1 from information_schema.columns where table_name = 'activities' and column_name = 'tenant_id') then
    alter table public.activities add column tenant_id uuid references public.tenants(id) on delete restrict;
  end if;
  update public.activities set tenant_id = v_tenant where tenant_id is null;
  alter table public.activities alter column tenant_id set not null;
  create index if not exists idx_activities_tenant_date on public.activities(tenant_id, date);

  -- === 4. vehicles =============================================
  if not exists (select 1 from information_schema.columns where table_name = 'vehicles' and column_name = 'tenant_id') then
    alter table public.vehicles add column tenant_id uuid references public.tenants(id) on delete restrict;
  end if;
  update public.vehicles set tenant_id = v_tenant where tenant_id is null;
  alter table public.vehicles alter column tenant_id set not null;
  create index if not exists idx_vehicles_tenant on public.vehicles(tenant_id);

  -- === 5. fuel_logs ============================================
  if not exists (select 1 from information_schema.columns where table_name = 'fuel_logs' and column_name = 'tenant_id') then
    alter table public.fuel_logs add column tenant_id uuid references public.tenants(id) on delete restrict;
  end if;
  update public.fuel_logs set tenant_id = v_tenant where tenant_id is null;
  alter table public.fuel_logs alter column tenant_id set not null;
  create index if not exists idx_fuel_logs_tenant_date on public.fuel_logs(tenant_id, date);

  -- === 6. products =============================================
  if not exists (select 1 from information_schema.columns where table_name = 'products' and column_name = 'tenant_id') then
    alter table public.products add column tenant_id uuid references public.tenants(id) on delete restrict;
  end if;
  update public.products set tenant_id = v_tenant where tenant_id is null;
  alter table public.products alter column tenant_id set not null;
  create index if not exists idx_products_tenant on public.products(tenant_id);

  -- === 7. stock_movements ======================================
  if not exists (select 1 from information_schema.columns where table_name = 'stock_movements' and column_name = 'tenant_id') then
    alter table public.stock_movements add column tenant_id uuid references public.tenants(id) on delete restrict;
  end if;
  update public.stock_movements set tenant_id = v_tenant where tenant_id is null;
  alter table public.stock_movements alter column tenant_id set not null;
  create index if not exists idx_stock_movements_tenant_date on public.stock_movements(tenant_id, date);

  -- === 8. feed_items (legacy) =================================
  if not exists (select 1 from information_schema.columns where table_name = 'feed_items' and column_name = 'tenant_id') then
    alter table public.feed_items add column tenant_id uuid references public.tenants(id) on delete restrict;
  end if;
  update public.feed_items set tenant_id = v_tenant where tenant_id is null;
  alter table public.feed_items alter column tenant_id set not null;
  create index if not exists idx_feed_items_tenant on public.feed_items(tenant_id);

  -- === 9. feed_logs ============================================
  if not exists (select 1 from information_schema.columns where table_name = 'feed_logs' and column_name = 'tenant_id') then
    alter table public.feed_logs add column tenant_id uuid references public.tenants(id) on delete restrict;
  end if;
  update public.feed_logs set tenant_id = v_tenant where tenant_id is null;
  alter table public.feed_logs alter column tenant_id set not null;
  create index if not exists idx_feed_logs_tenant_date on public.feed_logs(tenant_id, date);

  -- === 10. expense_categories =================================
  if not exists (select 1 from information_schema.columns where table_name = 'expense_categories' and column_name = 'tenant_id') then
    alter table public.expense_categories add column tenant_id uuid references public.tenants(id) on delete restrict;
  end if;
  update public.expense_categories set tenant_id = v_tenant where tenant_id is null;
  alter table public.expense_categories alter column tenant_id set not null;
  create index if not exists idx_expense_categories_tenant on public.expense_categories(tenant_id);

  -- === 11. general_expenses ===================================
  if not exists (select 1 from information_schema.columns where table_name = 'general_expenses' and column_name = 'tenant_id') then
    alter table public.general_expenses add column tenant_id uuid references public.tenants(id) on delete restrict;
  end if;
  update public.general_expenses set tenant_id = v_tenant where tenant_id is null;
  alter table public.general_expenses alter column tenant_id set not null;
  create index if not exists idx_general_expenses_tenant_date on public.general_expenses(tenant_id, date);

  -- === 12. expenses (vehicle) =================================
  if not exists (select 1 from information_schema.columns where table_name = 'expenses' and column_name = 'tenant_id') then
    alter table public.expenses add column tenant_id uuid references public.tenants(id) on delete restrict;
  end if;
  update public.expenses set tenant_id = v_tenant where tenant_id is null;
  alter table public.expenses alter column tenant_id set not null;
  create index if not exists idx_expenses_tenant_date on public.expenses(tenant_id, date);

end $$;

-- Sanity checks (read-only — just raise notice with counts)
do $$
declare v_counts record;
begin
  for v_counts in
    select 'employees' t, count(*) c from employees union all
    select 'activities', count(*) from activities union all
    select 'fuel_logs', count(*) from fuel_logs union all
    select 'feed_logs', count(*) from feed_logs union all
    select 'products', count(*) from products union all
    select 'general_expenses', count(*) from general_expenses union all
    select 'expenses', count(*) from expenses
  loop
    raise notice 'Table % has % rows (all now tenanted).', v_counts.t, v_counts.c;
  end loop;
end $$;

-- =============================================================
-- End of Phase 2. RLS not enabled yet — app continues to work
-- exactly as before (no policies filter by tenant_id yet).
-- =============================================================
