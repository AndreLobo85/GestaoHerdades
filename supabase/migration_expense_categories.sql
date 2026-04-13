-- Expense Categories (submenus for organizing expenses)
create table if not exists public.expense_categories (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  icon text not null default 'receipt_long',
  position int not null default 0,
  active boolean not null default true,
  created_at timestamptz default now()
);

alter table public.expense_categories enable row level security;
create policy "Auth all on expense_categories" on public.expense_categories for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Seed "Veiculos" as the built-in category
insert into public.expense_categories (name, icon, position) values
  ('Veiculos', 'directions_car', 0)
on conflict (name) do nothing;

-- General Expenses (category-based, not tied to vehicles)
create table if not exists public.general_expenses (
  id uuid default gen_random_uuid() primary key,
  category_id uuid not null references public.expense_categories(id) on delete cascade,
  date date not null default current_date,
  description text not null default '',
  invoice_number text not null default '',
  invoice_amount numeric(10,2) not null default 0,
  invoice_file_url text default null,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz default now()
);

create index if not exists idx_general_expenses_category on public.general_expenses(category_id);
create index if not exists idx_general_expenses_date on public.general_expenses(date);

alter table public.general_expenses enable row level security;
create policy "Auth read general_expenses" on public.general_expenses for select using (auth.role() = 'authenticated');
create policy "Auth insert general_expenses" on public.general_expenses for insert with check (auth.role() = 'authenticated');
create policy "Auth update general_expenses" on public.general_expenses for update using (auth.role() = 'authenticated');
create policy "Auth delete general_expenses" on public.general_expenses for delete using (auth.role() = 'authenticated');
