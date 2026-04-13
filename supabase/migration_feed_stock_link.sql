-- Migration: Link feed_items to products for automatic stock deduction
-- When a feed log is submitted, stock is automatically deducted from the linked product

-- Add product_id FK to feed_items
ALTER TABLE feed_items ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL;

-- Create index for the FK
CREATE INDEX IF NOT EXISTS idx_feed_items_product_id ON feed_items(product_id);

-- Add feed_log_id to stock_movements so we can trace which feed log caused the movement
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS feed_log_id UUID;
