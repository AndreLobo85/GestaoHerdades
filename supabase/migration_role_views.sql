-- Role-based view permissions
create table if not exists public.role_views (
  id uuid default gen_random_uuid() primary key,
  role text not null,
  view_key text not null,
  view_label text not null,
  view_icon text not null default 'visibility',
  enabled boolean not null default true,
  unique(role, view_key)
);

alter table public.role_views enable row level security;
create policy "Auth read role_views" on public.role_views for select using (auth.role() = 'authenticated');
create policy "Auth update role_views" on public.role_views for update using (auth.role() = 'authenticated');
create policy "Auth insert role_views" on public.role_views for insert with check (auth.role() = 'authenticated');
create policy "Auth delete role_views" on public.role_views for delete using (auth.role() = 'authenticated');

-- Seed defaults for admin (all enabled)
insert into public.role_views (role, view_key, view_label, view_icon, enabled) values
  ('admin', 'dashboard', 'Dashboard', 'dashboard', true),
  ('admin', 'atividades', 'Horas/Atividades', 'timer', true),
  ('admin', 'gasoleo', 'Consumo Gasoleo', 'local_gas_station', true),
  ('admin', 'alimentacao', 'Alimentacao Animal', 'agriculture', true),
  ('admin', 'despesas', 'Despesas', 'receipt_long', true),
  ('admin', 'definicoes', 'Definicoes', 'settings', true)
on conflict (role, view_key) do nothing;

-- Seed defaults for utilizador (no admin views)
insert into public.role_views (role, view_key, view_label, view_icon, enabled) values
  ('utilizador', 'dashboard', 'Dashboard', 'dashboard', true),
  ('utilizador', 'atividades', 'Horas/Atividades', 'timer', true),
  ('utilizador', 'gasoleo', 'Consumo Gasoleo', 'local_gas_station', true),
  ('utilizador', 'alimentacao', 'Alimentacao Animal', 'agriculture', true),
  ('utilizador', 'despesas', 'Despesas', 'receipt_long', false),
  ('utilizador', 'definicoes', 'Definicoes', 'settings', false)
on conflict (role, view_key) do nothing;
