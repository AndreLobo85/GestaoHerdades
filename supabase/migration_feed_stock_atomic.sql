-- Migration: Atomic stock operations for feed-stock integration
-- Fixes race conditions by moving stock arithmetic to server-side functions

-- 1. Add FK and index on feed_log_id (was missing)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'stock_movements_feed_log_id_fkey'
  ) THEN
    ALTER TABLE stock_movements
      ADD CONSTRAINT stock_movements_feed_log_id_fkey
      FOREIGN KEY (feed_log_id) REFERENCES feed_logs(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_stock_movements_feed_log_id ON stock_movements(feed_log_id);

-- 2. Atomic stock deduction: inserts feed_log + stock_movement + updates product in one transaction
CREATE OR REPLACE FUNCTION deduct_stock_for_feed(
  p_product_id UUID,
  p_quantity NUMERIC,
  p_feed_log_id UUID,
  p_date TEXT,
  p_item_name TEXT,
  p_item_unit TEXT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_current NUMERIC;
BEGIN
  -- Lock the row to prevent concurrent updates
  SELECT current_quantity INTO v_current
  FROM products WHERE id = p_product_id FOR UPDATE;

  IF v_current IS NULL THEN
    RAISE EXCEPTION 'Produto nao encontrado';
  END IF;

  IF p_quantity > v_current THEN
    RAISE EXCEPTION 'Stock insuficiente para %: disponivel % %', p_item_name, v_current, p_item_unit;
  END IF;

  -- Deduct stock
  UPDATE products SET current_quantity = current_quantity - p_quantity
  WHERE id = p_product_id;

  -- Create audit movement
  INSERT INTO stock_movements (product_id, type, quantity, reason, feed_log_id, notes, date)
  VALUES (p_product_id, 'saida', p_quantity, 'Alimentacao animal', p_feed_log_id,
          'Auto: ' || p_item_name || ' - ' || p_quantity || ' ' || p_item_unit, p_date);
END;
$$;

-- 3. Atomic stock restoration: restores stock when a feed_log is deleted
CREATE OR REPLACE FUNCTION restore_stock_for_feed(
  p_feed_log_id UUID
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_movement RECORD;
BEGIN
  -- Find the stock movement linked to this feed log
  SELECT product_id, quantity INTO v_movement
  FROM stock_movements WHERE feed_log_id = p_feed_log_id;

  IF v_movement IS NOT NULL THEN
    -- Restore stock atomically
    UPDATE products SET current_quantity = current_quantity + v_movement.quantity
    WHERE id = v_movement.product_id;

    -- Remove the stock movement
    DELETE FROM stock_movements WHERE feed_log_id = p_feed_log_id;
  END IF;
END;
$$;

-- 4. Bulk restore: restores all stock for a feed_item before deletion
CREATE OR REPLACE FUNCTION restore_stock_for_feed_item(
  p_feed_item_id UUID
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_log RECORD;
BEGIN
  -- Loop through all feed logs for this item
  FOR v_log IN SELECT id FROM feed_logs WHERE feed_item_id = p_feed_item_id
  LOOP
    -- Restore stock for each log
    PERFORM restore_stock_for_feed(v_log.id);
  END LOOP;

  -- Delete all feed logs for this item
  DELETE FROM feed_logs WHERE feed_item_id = p_feed_item_id;
END;
$$;
