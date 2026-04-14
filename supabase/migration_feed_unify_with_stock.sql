-- =============================================
-- Unify Feed with Stock
-- Stock (products) becomes the single source of feed items.
-- =============================================

-- 1. Flag products as "feed" to appear in Alimentacao Diaria
alter table public.products add column if not exists is_feed boolean not null default false;

-- Backfill: mark products already linked via feed_items as feed
update public.products p
   set is_feed = true
  from public.feed_items fi
 where fi.product_id = p.id
   and fi.active = true;

-- 2. Allow feed_logs to point at products directly (keep feed_item_id for historical compat)
alter table public.feed_logs add column if not exists product_id uuid references public.products(id) on delete set null;
create index if not exists idx_feed_logs_product on public.feed_logs(product_id);

-- Backfill existing feed_logs with product_id via feed_items
update public.feed_logs fl
   set product_id = fi.product_id
  from public.feed_items fi
 where fl.feed_item_id = fi.id
   and fl.product_id is null
   and fi.product_id is not null;

-- 3. Update RPC: deduct stock referencing product directly (p_feed_log_id still links audit)
-- Signature unchanged; p_date cast to date.
CREATE OR REPLACE FUNCTION deduct_stock_for_feed(
  p_product_id UUID,
  p_quantity NUMERIC,
  p_feed_log_id UUID,
  p_date TEXT,
  p_item_name TEXT,
  p_item_unit TEXT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_current NUMERIC;
BEGIN
  SELECT current_quantity INTO v_current FROM products WHERE id = p_product_id FOR UPDATE;
  IF v_current IS NULL THEN RAISE EXCEPTION 'Produto nao encontrado'; END IF;
  IF p_quantity > v_current THEN
    RAISE EXCEPTION 'Stock insuficiente para %: disponivel % %', p_item_name, v_current, p_item_unit;
  END IF;
  UPDATE products SET current_quantity = current_quantity - p_quantity WHERE id = p_product_id;
  INSERT INTO stock_movements (product_id, type, quantity, reason, feed_log_id, notes, date)
  VALUES (p_product_id, 'saida', p_quantity, 'Alimentacao animal', p_feed_log_id,
          'Auto: ' || p_item_name || ' - ' || p_quantity || ' ' || p_item_unit, p_date::date);
END; $$;
