-- Up Migration
ALTER TABLE public.inventory_movements
  ADD COLUMN IF NOT EXISTS stock_balance_after NUMERIC,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS inventory_movements_idempotency_unique
  ON public.inventory_movements (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS inventory_movements_product_created_idx
  ON public.inventory_movements (product_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS inventory_items_serial_unique
  ON public.inventory_items (product_id, LOWER(serial_number))
  WHERE serial_number IS NOT NULL AND TRIM(serial_number) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS inventory_items_imei_unique
  ON public.inventory_items (product_id, LOWER(imei))
  WHERE imei IS NOT NULL AND TRIM(imei) <> '';

ALTER TABLE public.installer_dispatch_items
  ADD COLUMN IF NOT EXISTS qr_token UUID NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS installer_dispatch_items_qr_token_unique
  ON public.installer_dispatch_items (qr_token);

CREATE TABLE IF NOT EXISTS public.field_material_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number VARCHAR(40) NOT NULL UNIQUE,
  dispatch_id UUID NOT NULL REFERENCES public.installer_field_dispatches(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  item_description TEXT NOT NULL,
  requested_quantity NUMERIC NOT NULL CHECK (requested_quantity > 0),
  reason TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT field_material_requests_status_check
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'ISSUED'))
);

CREATE INDEX IF NOT EXISTS field_material_requests_dispatch_idx
  ON public.field_material_requests (dispatch_id, created_at DESC);

-- Down Migration
DROP TABLE IF EXISTS public.field_material_requests;
DROP INDEX IF EXISTS public.installer_dispatch_items_qr_token_unique;
ALTER TABLE public.installer_dispatch_items DROP COLUMN IF EXISTS qr_token;
DROP INDEX IF EXISTS public.inventory_items_imei_unique;
DROP INDEX IF EXISTS public.inventory_items_serial_unique;
DROP INDEX IF EXISTS public.inventory_movements_product_created_idx;
DROP INDEX IF EXISTS public.inventory_movements_idempotency_unique;
ALTER TABLE public.inventory_movements
  DROP COLUMN IF EXISTS idempotency_key,
  DROP COLUMN IF EXISTS stock_balance_after;
