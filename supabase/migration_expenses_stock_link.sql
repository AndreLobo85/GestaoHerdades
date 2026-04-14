-- Link vehicle expenses to products (optional association), mirror of general_expenses
alter table public.expenses add column if not exists product_id uuid references public.products(id) on delete set null;
alter table public.expenses add column if not exists product_quantity numeric(10,2);

-- Allow stock_movements to reference vehicle expenses
alter table public.stock_movements add column if not exists expense_id uuid references public.expenses(id) on delete set null;
create index if not exists idx_stock_movements_vehicle_expense on public.stock_movements(expense_id);
