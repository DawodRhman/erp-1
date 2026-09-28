-- Up Migration
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sub_category TEXT,
  ADD COLUMN IF NOT EXISTS brand_make TEXT,
  ADD COLUMN IF NOT EXISTS condition VARCHAR(20) NOT NULL DEFAULT 'NEW',
  ADD COLUMN IF NOT EXISTS sku VARCHAR(100),
  ADD COLUMN IF NOT EXISTS model_no TEXT,
  ADD COLUMN IF NOT EXISTS selling_price NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS country_of_origin TEXT,
  ADD COLUMN IF NOT EXISTS batch_lot_number TEXT,
  ADD COLUMN IF NOT EXISTS expiry_date DATE,
  ADD COLUMN IF NOT EXISTS warranty_date DATE,
  ADD COLUMN IF NOT EXISTS product_image_url TEXT,
  ADD COLUMN IF NOT EXISTS warehouse_location TEXT,
  ADD COLUMN IF NOT EXISTS room_number TEXT,
  ADD COLUMN IF NOT EXISTS rack_number TEXT,
  ADD COLUMN IF NOT EXISTS custom_attributes JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.products
SET selling_price = COALESCE(selling_price, unit_price, 0)
WHERE selling_price IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique
  ON public.products (LOWER(sku))
  WHERE sku IS NOT NULL AND TRIM(sku) <> '';

ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS sku VARCHAR(100),
  ADD COLUMN IF NOT EXISTS batch_lot_number TEXT,
  ADD COLUMN IF NOT EXISTS expiry_date DATE,
  ADD COLUMN IF NOT EXISTS warranty_date DATE,
  ADD COLUMN IF NOT EXISTS warehouse_location TEXT,
  ADD COLUMN IF NOT EXISTS room_number TEXT,
  ADD COLUMN IF NOT EXISTS rack_number TEXT,
  ADD COLUMN IF NOT EXISTS product_image_url TEXT,
  ADD COLUMN IF NOT EXISTS custom_attributes JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.inventory_movements
  ADD COLUMN IF NOT EXISTS vendor_id UUID,
  ADD COLUMN IF NOT EXISTS warehouse_location TEXT,
  ADD COLUMN IF NOT EXISTS room_number TEXT,
  ADD COLUMN IF NOT EXISTS rack_number TEXT;

ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS warehouse_location TEXT,
  ADD COLUMN IF NOT EXISTS room_number TEXT,
  ADD COLUMN IF NOT EXISTS rack_number TEXT;

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS vendor_code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS ntn_number TEXT,
  ADD COLUMN IF NOT EXISTS gst_number TEXT,
  ADD COLUMN IF NOT EXISTS payment_terms TEXT,
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS vendors_code_unique
  ON public.vendors (LOWER(vendor_code))
  WHERE vendor_code IS NOT NULL AND TRIM(vendor_code) <> '';

CREATE TABLE IF NOT EXISTS public.product_custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_key VARCHAR(100) NOT NULL UNIQUE,
  label TEXT NOT NULL,
  field_type VARCHAR(30) NOT NULL DEFAULT 'TEXT',
  applies_to VARCHAR(30) NOT NULL DEFAULT 'PRODUCT',
  required BOOLEAN NOT NULL DEFAULT FALSE,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.invoice_adjustment_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.customer_invoices(id) ON DELETE CASCADE,
  quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL,
  dispatch_id UUID REFERENCES public.installer_field_dispatches(id) ON DELETE SET NULL,
  action_type VARCHAR(50) NOT NULL,
  item_description TEXT,
  old_quantity NUMERIC,
  new_quantity NUMERIC,
  old_amount NUMERIC(14,2),
  new_amount NUMERIC(14,2),
  reason TEXT,
  before_snapshot JSONB,
  after_snapshot JSONB,
  changed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS requirement_title TEXT,
  ADD COLUMN IF NOT EXISTS requirement_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS service_category VARCHAR(80),
  ADD COLUMN IF NOT EXISTS approval_stage VARCHAR(50) NOT NULL DEFAULT 'CRM_DRAFT',
  ADD COLUMN IF NOT EXISTS management_approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS management_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS management_approval_note TEXT,
  ADD COLUMN IF NOT EXISTS client_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sales_handoff_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS technical_handoff_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS client_signoff_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS client_signoff_name TEXT,
  ADD COLUMN IF NOT EXISTS client_signoff_note TEXT,
  ADD COLUMN IF NOT EXISTS tax_mode VARCHAR(30) NOT NULL DEFAULT 'GST',
  ADD COLUMN IF NOT EXISTS dollar_rate NUMERIC(14,4) NOT NULL DEFAULT 1;

ALTER TABLE public.crm_orders
  ADD COLUMN IF NOT EXISTS sales_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS technical_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS client_signoff_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS client_signoff_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS client_signoff_name TEXT,
  ADD COLUMN IF NOT EXISTS client_signoff_note TEXT;

-- Down Migration
DROP TABLE IF EXISTS public.invoice_adjustment_audit;
DROP TABLE IF EXISTS public.product_custom_field_definitions;

ALTER TABLE public.crm_orders
  DROP COLUMN IF EXISTS client_signoff_note,
  DROP COLUMN IF EXISTS client_signoff_name,
  DROP COLUMN IF EXISTS client_signoff_at,
  DROP COLUMN IF EXISTS client_signoff_status,
  DROP COLUMN IF EXISTS technical_status,
  DROP COLUMN IF EXISTS sales_status;

ALTER TABLE public.quotations
  DROP COLUMN IF EXISTS dollar_rate,
  DROP COLUMN IF EXISTS tax_mode,
  DROP COLUMN IF EXISTS client_signoff_note,
  DROP COLUMN IF EXISTS client_signoff_name,
  DROP COLUMN IF EXISTS client_signoff_at,
  DROP COLUMN IF EXISTS technical_handoff_at,
  DROP COLUMN IF EXISTS sales_handoff_at,
  DROP COLUMN IF EXISTS client_reviewed_at,
  DROP COLUMN IF EXISTS management_approval_note,
  DROP COLUMN IF EXISTS management_approved_at,
  DROP COLUMN IF EXISTS management_approved_by,
  DROP COLUMN IF EXISTS approval_stage,
  DROP COLUMN IF EXISTS service_category,
  DROP COLUMN IF EXISTS requirement_type,
  DROP COLUMN IF EXISTS requirement_title;

DROP INDEX IF EXISTS public.vendors_code_unique;

ALTER TABLE public.vendors
  DROP COLUMN IF EXISTS notes,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS payment_terms,
  DROP COLUMN IF EXISTS gst_number,
  DROP COLUMN IF EXISTS ntn_number,
  DROP COLUMN IF EXISTS vendor_code;

ALTER TABLE public.purchase_orders
  DROP COLUMN IF EXISTS rack_number,
  DROP COLUMN IF EXISTS room_number,
  DROP COLUMN IF EXISTS warehouse_location;

ALTER TABLE public.inventory_movements
  DROP COLUMN IF EXISTS rack_number,
  DROP COLUMN IF EXISTS room_number,
  DROP COLUMN IF EXISTS warehouse_location,
  DROP COLUMN IF EXISTS vendor_id;

ALTER TABLE public.inventory_items
  DROP COLUMN IF EXISTS custom_attributes,
  DROP COLUMN IF EXISTS product_image_url,
  DROP COLUMN IF EXISTS rack_number,
  DROP COLUMN IF EXISTS room_number,
  DROP COLUMN IF EXISTS warehouse_location,
  DROP COLUMN IF EXISTS warranty_date,
  DROP COLUMN IF EXISTS expiry_date,
  DROP COLUMN IF EXISTS batch_lot_number,
  DROP COLUMN IF EXISTS sku;

DROP INDEX IF EXISTS public.products_sku_unique;

ALTER TABLE public.products
  DROP COLUMN IF EXISTS custom_attributes,
  DROP COLUMN IF EXISTS rack_number,
  DROP COLUMN IF EXISTS room_number,
  DROP COLUMN IF EXISTS warehouse_location,
  DROP COLUMN IF EXISTS product_image_url,
  DROP COLUMN IF EXISTS warranty_date,
  DROP COLUMN IF EXISTS expiry_date,
  DROP COLUMN IF EXISTS batch_lot_number,
  DROP COLUMN IF EXISTS country_of_origin,
  DROP COLUMN IF EXISTS selling_price,
  DROP COLUMN IF EXISTS model_no,
  DROP COLUMN IF EXISTS sku,
  DROP COLUMN IF EXISTS condition,
  DROP COLUMN IF EXISTS brand_make,
  DROP COLUMN IF EXISTS sub_category;
