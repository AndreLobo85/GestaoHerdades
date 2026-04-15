-- =============================================================
-- Auto-fill tenant_id on INSERT from JWT claim (current_tenant_id)
-- Saves frontend from needing to pass it in every insert.
-- =============================================================

create or replace function public.fill_tenant_id()
returns trigger language plpgsql security definer set search_path = public as $fill$
begin
  if new.tenant_id is null then
    new.tenant_id := public.current_tenant_id();
  end if;
  if new.tenant_id is null then
    raise exception 'tenant_id ausente: utilizador sem herdade ativa';
  end if;
  return new;
end;
$fill$;

-- Apply trigger to every operational table with tenant_id
do $$
declare t text;
begin
  for t in
    select unnest(array[
      'employees','activity_types','activities','vehicles','fuel_logs',
      'products','stock_movements','feed_items','feed_logs',
      'expense_categories','general_expenses','expenses'
    ])
  loop
    execute format('drop trigger if exists trg_fill_tenant_id on public.%I', t);
    execute format('create trigger trg_fill_tenant_id before insert on public.%I for each row execute function public.fill_tenant_id()', t);
  end loop;
end $$;
