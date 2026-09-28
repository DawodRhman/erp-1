-- Up Migration
ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS custom_attributes JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Down Migration
ALTER TABLE public.purchase_orders
  DROP COLUMN IF EXISTS custom_attributes;
