-- Patch existing extracted ERP databases so the React inventory/CRM workflow can run
-- even when earlier base tables already existed with fewer columns.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_type VARCHAR(50) NOT NULL DEFAULT 'ASSET',
  ADD COLUMN IF NOT EXISTS tracking_type VARCHAR(50) NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS min_stock_level INT NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS imei VARCHAR(120),
  ADD COLUMN IF NOT EXISTS location VARCHAR(200),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.item_categories
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS quotation_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS price_tier VARCHAR(80) NOT NULL DEFAULT 'Standard',
  ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'PKR',
  ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(12, 4) NOT NULL DEFAULT 1.0000,
  ADD COLUMN IF NOT EXISTS subtotal NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS template_style VARCHAR(160) NOT NULL DEFAULT 'HBL Sales Tax Invoice',
  ADD COLUMN IF NOT EXISTS terms TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE public.quotations
SET quotation_number = quotation_id
WHERE quotation_number IS NULL
  AND quotation_id IS NOT NULL;

ALTER TABLE public.quotations
  DROP CONSTRAINT IF EXISTS quotations_status_check;

ALTER TABLE public.quotations
  ADD CONSTRAINT quotations_status_check
  CHECK (status IN ('DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED'));

CREATE TABLE IF NOT EXISTS public.customer_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    vehicle_number VARCHAR(80) NOT NULL,
    make VARCHAR(80),
    model VARCHAR(80),
    vin VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tracker_installations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    installation_no VARCHAR(100) NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES public.customer_vehicles(id) ON DELETE SET NULL,
    tracker_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
    technician_name VARCHAR(120),
    status VARCHAR(50) NOT NULL DEFAULT 'REQUESTED',
    installation_date TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customer_complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_no VARCHAR(100) NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    tracker_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
    complaint_type VARCHAR(100) NOT NULL DEFAULT 'DEVICE_OFFLINE',
    status VARCHAR(50) NOT NULL DEFAULT 'TAKEN',
    description TEXT,
    reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);
