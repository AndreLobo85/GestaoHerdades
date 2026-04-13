-- Expenses table (linked to vehicles)
create table if not exists public.expenses (
  id uuid default gen_random_uuid() primary key,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  date date not null default current_date,
  km numeric(10,1) not null default 0,
  description text not null default '',
  invoice_number text not null default '',
  invoice_amount numeric(10,2) not null default 0,
  invoice_file_url text default null,
  created_by uuid references auth.users(id) default auth.uid(),
  created_at timestamptz default now()
);

create index if not exists idx_expenses_vehicle on public.expenses(vehicle_id);
create index if not exists idx_expenses_date on public.expenses(date);

alter table public.expenses enable row level security;

create policy "Auth read expenses" on public.expenses for select using (auth.role() = 'authenticated');
create policy "Auth insert expenses" on public.expenses for insert with check (auth.role() = 'authenticated');
create policy "Auth update expenses" on public.expenses for update using (auth.role() = 'authenticated');
create policy "Auth delete expenses" on public.expenses for delete using (auth.role() = 'authenticated');

-- Storage bucket for invoice files (create manually in Dashboard > Storage if needed)
-- insert into storage.buckets (id, name, public) values ('invoices', 'invoices', true);
