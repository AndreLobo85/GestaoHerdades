-- Gestao Herdades - Database Schema
-- Run this in Supabase SQL Editor

-- 1. Employees
create table if not exists public.employees (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  role text not null default '',
  active boolean not null default true,
  created_at timestamptz default now()
);

-- 2. Activity Types
create table if not exists public.activity_types (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  active boolean not null default true
);

-- Seed default activity types
insert into public.activity_types (name) values
  ('Vinha'),
  ('Montado'),
  ('Animais'),
  ('Olival'),
  ('Reparacoes'),
  ('Outros')
on conflict (name) do nothing;

-- 3. Activities (hours log)
create table if not exists public.activities (
  id uuid default gen_random_uuid() primary key,
  employee_id uuid not null references public.employees(id) on delete cascade,
  date date not null,
  activity_type_id uuid not null references public.activity_types(id) on delete restrict,
  hours numeric(4,1) not null check (hours > 0 and hours <= 24),
  description text not null default '',
  created_at timestamptz default now()
);

create index if not exists idx_activities_date on public.activities(date);
create index if not exists idx_activities_employee on public.activities(employee_id);

-- 4. Vehicles
create table if not exists public.vehicles (
  id uuid default gen_random_uuid() primary key,
  brand text not null,
  model text not null default '',
  plate text not null,
  vehicle_type text not null check (vehicle_type in ('machine', 'vehicle')) default 'vehicle',
  current_km numeric(10,1) not null default 0,
  active boolean not null default true,
  created_at timestamptz default now()
);

-- 5. Fuel Logs
create table if not exists public.fuel_logs (
  id uuid default gen_random_uuid() primary key,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  date date not null,
  fuel_type text not null check (fuel_type in ('agricola', 'rodoviario')),
  hours_or_km numeric(10,1) not null default 0,
  liters numeric(8,1) not null check (liters > 0),
  notes text not null default '',
  created_at timestamptz default now()
);

create index if not exists idx_fuel_logs_date on public.fuel_logs(date);

-- 6. Feed Items
create table if not exists public.feed_items (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  unit text not null default 'unidades',
  active boolean not null default true
);

-- Seed default feed items
insert into public.feed_items (name, unit) values
  ('Fardos de feno', 'fardos'),
  ('Bolas de fenosilagem', 'bolas'),
  ('Tacos', 'unidades'),
  ('Racao vacada', 'kg'),
  ('Racao vitelos', 'kg')
on conflict (name) do nothing;

-- 7. Feed Logs
create table if not exists public.feed_logs (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  feed_item_id uuid not null references public.feed_items(id) on delete restrict,
  quantity numeric(8,1) not null check (quantity > 0),
  notes text not null default '',
  created_at timestamptz default now()
);

create index if not exists idx_feed_logs_date on public.feed_logs(date);

-- Enable RLS (Row Level Security) - open for now, restrict later with auth
alter table public.employees enable row level security;
alter table public.activity_types enable row level security;
alter table public.activities enable row level security;
alter table public.vehicles enable row level security;
alter table public.fuel_logs enable row level security;
alter table public.feed_items enable row level security;
alter table public.feed_logs enable row level security;

-- Permissive policies (allow all for anon/authenticated - tighten later)
create policy "Allow all on employees" on public.employees for all using (true) with check (true);
create policy "Allow all on activity_types" on public.activity_types for all using (true) with check (true);
create policy "Allow all on activities" on public.activities for all using (true) with check (true);
create policy "Allow all on vehicles" on public.vehicles for all using (true) with check (true);
create policy "Allow all on fuel_logs" on public.fuel_logs for all using (true) with check (true);
create policy "Allow all on feed_items" on public.feed_items for all using (true) with check (true);
create policy "Allow all on feed_logs" on public.feed_logs for all using (true) with check (true);
