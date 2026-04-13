-- Gestao Herdades - Auth & Roles Migration
-- Run this in Supabase SQL Editor AFTER migration.sql

-- 1. Profiles table (linked to auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null default '',
  role text not null default 'utilizador' check (role in ('admin', 'utilizador')),
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Profiles RLS: users read own, admins read all
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Admin can read all profiles"
  on public.profiles for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 2. Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'utilizador'
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. Replace permissive policies with authenticated-only

-- employees
drop policy if exists "Allow all on employees" on public.employees;
create policy "Auth read employees" on public.employees for select using (auth.role() = 'authenticated');
create policy "Auth insert employees" on public.employees for insert with check (auth.role() = 'authenticated');
create policy "Auth update employees" on public.employees for update using (auth.role() = 'authenticated');
create policy "Auth delete employees" on public.employees for delete using (auth.role() = 'authenticated');

-- activity_types
drop policy if exists "Allow all on activity_types" on public.activity_types;
create policy "Auth read activity_types" on public.activity_types for select using (auth.role() = 'authenticated');
create policy "Auth insert activity_types" on public.activity_types for insert with check (auth.role() = 'authenticated');
create policy "Auth update activity_types" on public.activity_types for update using (auth.role() = 'authenticated');
create policy "Auth delete activity_types" on public.activity_types for delete using (auth.role() = 'authenticated');

-- activities
drop policy if exists "Allow all on activities" on public.activities;
create policy "Auth read activities" on public.activities for select using (auth.role() = 'authenticated');
create policy "Auth insert activities" on public.activities for insert with check (auth.role() = 'authenticated');
create policy "Auth update activities" on public.activities for update using (auth.role() = 'authenticated');
create policy "Auth delete activities" on public.activities for delete using (auth.role() = 'authenticated');

-- vehicles
drop policy if exists "Allow all on vehicles" on public.vehicles;
create policy "Auth read vehicles" on public.vehicles for select using (auth.role() = 'authenticated');
create policy "Auth insert vehicles" on public.vehicles for insert with check (auth.role() = 'authenticated');
create policy "Auth update vehicles" on public.vehicles for update using (auth.role() = 'authenticated');
create policy "Auth delete vehicles" on public.vehicles for delete using (auth.role() = 'authenticated');

-- fuel_logs
drop policy if exists "Allow all on fuel_logs" on public.fuel_logs;
create policy "Auth read fuel_logs" on public.fuel_logs for select using (auth.role() = 'authenticated');
create policy "Auth insert fuel_logs" on public.fuel_logs for insert with check (auth.role() = 'authenticated');
create policy "Auth update fuel_logs" on public.fuel_logs for update using (auth.role() = 'authenticated');
create policy "Auth delete fuel_logs" on public.fuel_logs for delete using (auth.role() = 'authenticated');

-- feed_items
drop policy if exists "Allow all on feed_items" on public.feed_items;
create policy "Auth read feed_items" on public.feed_items for select using (auth.role() = 'authenticated');
create policy "Auth insert feed_items" on public.feed_items for insert with check (auth.role() = 'authenticated');
create policy "Auth update feed_items" on public.feed_items for update using (auth.role() = 'authenticated');
create policy "Auth delete feed_items" on public.feed_items for delete using (auth.role() = 'authenticated');

-- feed_logs
drop policy if exists "Allow all on feed_logs" on public.feed_logs;
create policy "Auth read feed_logs" on public.feed_logs for select using (auth.role() = 'authenticated');
create policy "Auth insert feed_logs" on public.feed_logs for insert with check (auth.role() = 'authenticated');
create policy "Auth update feed_logs" on public.feed_logs for update using (auth.role() = 'authenticated');
create policy "Auth delete feed_logs" on public.feed_logs for delete using (auth.role() = 'authenticated');

-- 4. To promote first admin user (run after creating user via Dashboard):
-- UPDATE public.profiles SET role = 'admin' WHERE id = (SELECT id FROM auth.users WHERE email = 'your-admin@email.com');
