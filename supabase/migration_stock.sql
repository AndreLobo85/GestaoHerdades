-- =============================================
-- Stock Management Module
-- =============================================

-- 1. Products catalog
create table if not exists public.products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  unit text not null default 'unidades',
  current_quantity numeric(10,2) not null default 0 check (current_quantity >= 0),
  min_stock_alert numeric(10,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz default now()
);

create index if not exists idx_products_active on public.products(active);

alter table public.products enable row level security;
create policy "Auth read products" on public.products for select using (auth.role() = 'authenticated');
create policy "Auth insert products" on public.products for insert with check (auth.role() = 'authenticated');
create policy "Auth update products" on public.products for update using (auth.role() = 'authenticated');
create policy "Auth delete products" on public.products for delete using (auth.role() = 'authenticated');

-- 2. Stock movements (audit trail)
create table if not exists public.stock_movements (
  id uuid default gen_random_uuid() primary key,
  product_id uuid not null references public.products(id) on delete cascade,
  type text not null check (type in ('entrada', 'saida')),
  quantity numeric(10,2) not null check (quantity > 0),
  reason text not null default '',
  general_expense_id uuid references public.general_expenses(id) on delete set null,
  notes text not null default '',
  date date not null default current_date,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz default now()
);

create index if not exists idx_stock_movements_product on public.stock_movements(product_id);
create index if not exists idx_stock_movements_date on public.stock_movements(date);
create index if not exists idx_stock_movements_expense on public.stock_movements(general_expense_id);

alter table public.stock_movements enable row level security;
create policy "Auth read stock_movements" on public.stock_movements for select using (auth.role() = 'authenticated');
create policy "Auth insert stock_movements" on public.stock_movements for insert with check (auth.role() = 'authenticated');
create policy "Auth update stock_movements" on public.stock_movements for update using (auth.role() = 'authenticated');
create policy "Auth delete stock_movements" on public.stock_movements for delete using (auth.role() = 'authenticated');

-- 3. Link expenses to products (optional association)
alter table public.general_expenses add column if not exists product_id uuid references public.products(id) on delete set null;
alter table public.general_expenses add column if not exists product_quantity numeric(10,2);

-- 4. Add stock view to role_views
insert into public.role_views (role, view_key, view_label, view_icon, enabled) values
  ('admin', 'stock', 'Stock', 'inventory_2', true),
  ('utilizador', 'stock', 'Stock', 'inventory_2', false)
on conflict do nothing;
