-- Patch: preserve editable invoice calculations and store client-wise monthly summaries.

ALTER TABLE public.customer_invoices
  ALTER COLUMN exchange_rate TYPE NUMERIC(18, 6),
  ALTER COLUMN tax_rate TYPE NUMERIC(10, 6),
  ALTER COLUMN subtotal TYPE NUMERIC(18, 6),
  ALTER COLUMN tax_amount TYPE NUMERIC(18, 6),
  ALTER COLUMN total_amount TYPE NUMERIC(18, 6);

ALTER TABLE public.customer_invoice_items
  ALTER COLUMN quantity TYPE NUMERIC(18, 6),
  ALTER COLUMN unit_price TYPE NUMERIC(18, 6),
  ALTER COLUMN total_without_tax TYPE NUMERIC(18, 6),
  ALTER COLUMN tax_amount TYPE NUMERIC(18, 6),
  ALTER COLUMN total_with_tax TYPE NUMERIC(18, 6);

CREATE TABLE IF NOT EXISTS public.customer_invoice_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  summary_period VARCHAR(160) NOT NULL,
  invoice_ids UUID[] NOT NULL DEFAULT '{}',
  invoice_numbers JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(18, 6) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(18, 6) NOT NULL DEFAULT 0,
  total_amount NUMERIC(18, 6) NOT NULL DEFAULT 0,
  branch_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
