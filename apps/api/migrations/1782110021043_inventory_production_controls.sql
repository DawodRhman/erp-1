-- Up Migration: production controls for the Inventory bounded context.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS preferred_vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reorder_quantity NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;

ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3) NOT NULL DEFAULT 'PKR',
  ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(18,6) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS payment_terms TEXT,
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS public.inventory_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_code VARCHAR(40) NOT NULL UNIQUE,
  warehouse_name TEXT NOT NULL,
  room_number TEXT,
  rack_number TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (warehouse_name, room_number, rack_number)
);

INSERT INTO public.inventory_locations (location_code, warehouse_name)
VALUES ('MAIN', 'Main Warehouse')
ON CONFLICT (location_code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.inventory_stock_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.crm_orders(id) ON DELETE CASCADE,
  quotation_item_id UUID NOT NULL REFERENCES public.quotation_items(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
  requested_quantity NUMERIC NOT NULL CHECK (requested_quantity > 0),
  reserved_quantity NUMERIC NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  status VARCHAR(30) NOT NULL DEFAULT 'SHORTAGE'
    CHECK (status IN ('RESERVED', 'PARTIALLY_RESERVED', 'SHORTAGE', 'ISSUED', 'RELEASED', 'CANCELLED')),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (order_id, quotation_item_id)
);

CREATE INDEX IF NOT EXISTS inventory_stock_reservations_product_status_idx
  ON public.inventory_stock_reservations (product_id, status);

CREATE TABLE IF NOT EXISTS public.inventory_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number VARCHAR(40) NOT NULL UNIQUE,
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE RESTRICT,
  idempotency_key VARCHAR(160) NOT NULL UNIQUE,
  evidence_url TEXT,
  received_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS public.inventory_receipt_number_seq;

CREATE TABLE IF NOT EXISTS public.inventory_receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES public.inventory_receipts(id) ON DELETE CASCADE,
  purchase_order_item_id UUID NOT NULL REFERENCES public.purchase_order_items(id) ON DELETE RESTRICT,
  product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
  received_quantity NUMERIC NOT NULL CHECK (received_quantity > 0),
  condition VARCHAR(20) NOT NULL DEFAULT 'NEW',
  batch_lot_number TEXT,
  serial_numbers JSONB NOT NULL DEFAULT '[]'::jsonb,
  warehouse_location TEXT,
  room_number TEXT,
  rack_number TEXT
);

CREATE TABLE IF NOT EXISTS public.inventory_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adjustment_number VARCHAR(40) NOT NULL UNIQUE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity_delta NUMERIC NOT NULL CHECK (quantity_delta <> 0),
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'POSTED')),
  requested_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS public.inventory_adjustment_number_seq;

CREATE TABLE IF NOT EXISTS public.inventory_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type VARCHAR(60) NOT NULL,
  aggregate_id UUID,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  correlation_id UUID,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT
);

CREATE INDEX IF NOT EXISTS inventory_outbox_unpublished_idx
  ON public.inventory_outbox (occurred_at)
  WHERE published_at IS NULL;

CREATE INDEX IF NOT EXISTS products_catalog_filter_idx
  ON public.products (category_id, product_type, tracking_type, warehouse_location);

-- Down Migration
DROP INDEX IF EXISTS public.products_catalog_filter_idx;
DROP TABLE IF EXISTS public.inventory_outbox;
DROP TABLE IF EXISTS public.inventory_adjustments;
DROP SEQUENCE IF EXISTS public.inventory_adjustment_number_seq;
DROP TABLE IF EXISTS public.inventory_receipt_items;
DROP TABLE IF EXISTS public.inventory_receipts;
DROP SEQUENCE IF EXISTS public.inventory_receipt_number_seq;
DROP TABLE IF EXISTS public.inventory_stock_reservations;
DROP TABLE IF EXISTS public.inventory_locations;

ALTER TABLE public.purchase_orders
  DROP COLUMN IF EXISTS version,
  DROP COLUMN IF EXISTS payment_terms,
  DROP COLUMN IF EXISTS exchange_rate,
  DROP COLUMN IF EXISTS currency_code;

ALTER TABLE public.products
  DROP COLUMN IF EXISTS version,
  DROP COLUMN IF EXISTS reorder_quantity,
  DROP COLUMN IF EXISTS preferred_vendor_id;
