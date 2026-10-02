-- Up Migration: align legacy constraints with the product form contract.
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS items_item_type_check,
  DROP CONSTRAINT IF EXISTS items_tracking_type_check;

ALTER TABLE public.products
  ADD CONSTRAINT items_item_type_check
    CHECK (product_type IN ('ASSET', 'CONSUMABLE', 'SERVICE', 'RENTAL', 'LICENSE')),
  ADD CONSTRAINT items_tracking_type_check
    CHECK (tracking_type IN ('SERIAL', 'IMEI', 'BATCH', 'NONE'));

-- IMEI-tracked units store their identity in the IMEI column, so a serial
-- number must not be mandatory for those records.
ALTER TABLE public.inventory_items
  ALTER COLUMN serial_number DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique
  ON public.products (LOWER(sku));

-- Down Migration
DROP INDEX IF EXISTS public.products_sku_unique;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS items_item_type_check,
  DROP CONSTRAINT IF EXISTS items_tracking_type_check;

ALTER TABLE public.products
  ADD CONSTRAINT items_item_type_check
    CHECK (product_type IN ('ASSET', 'CONSUMABLE', 'SERVICE')),
  ADD CONSTRAINT items_tracking_type_check
    CHECK (tracking_type IN ('SERIAL', 'IMEI', 'NONE'));

-- Do not restore NOT NULL automatically because valid IMEI-only rows may now
-- exist and would make a rollback unsafe.
