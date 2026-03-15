-- Add relist_source_order_id to orders (safe for existing DBs; idempotent)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS relist_source_order_id TEXT REFERENCES orders(id);
