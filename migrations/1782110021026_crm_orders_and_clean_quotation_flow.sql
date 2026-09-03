CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SEQUENCE IF NOT EXISTS public.crm_quotation_number_seq;
CREATE SEQUENCE IF NOT EXISTS public.crm_order_number_seq;

ALTER TABLE IF EXISTS public.quotations
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(120),
  ADD COLUMN IF NOT EXISTS client_approval_token TEXT,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS client_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approval_remarks TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE public.quotations
SET client_approval_token = gen_random_uuid()::text
WHERE client_approval_token IS NULL;

ALTER TABLE IF EXISTS public.quotations
  DROP CONSTRAINT IF EXISTS quotations_status_check;

ALTER TABLE IF EXISTS public.quotations
  ADD CONSTRAINT quotations_status_check
  CHECK (status IN ('DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'EXPIRED', 'IN_PROGRESS', 'COMPLETED'));

CREATE UNIQUE INDEX IF NOT EXISTS ux_quotations_idempotency_key
  ON public.quotations (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_quotations_client_approval_token
  ON public.quotations (client_approval_token)
  WHERE client_approval_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.crm_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(100) NOT NULL UNIQUE,
  quotation_id UUID NOT NULL UNIQUE REFERENCES public.quotations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  token_number VARCHAR(100) NOT NULL UNIQUE,
  status VARCHAR(50) NOT NULL DEFAULT 'READY_FOR_INVENTORY',
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_orders_customer_id ON public.crm_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_orders_status ON public.crm_orders(status);

DO $$
DECLARE
  max_quote_seq integer;
  max_order_seq integer;
BEGIN
  SELECT COALESCE(MAX((substring(quotation_number FROM '^QT-(?:[0-9]{4}|[0-9]{6})-([0-9]+)$'))::integer), 0)
  INTO max_quote_seq
  FROM public.quotations
  WHERE quotation_number ~ '^QT-(?:[0-9]{4}|[0-9]{6})-[0-9]+$';

  PERFORM setval('public.crm_quotation_number_seq', GREATEST(max_quote_seq, 1), max_quote_seq > 0);

  SELECT COALESCE(MAX((substring(order_number FROM '^ORD-[0-9]{4}-([0-9]+)$'))::integer), 0)
  INTO max_order_seq
  FROM public.crm_orders
  WHERE order_number ~ '^ORD-[0-9]{4}-[0-9]+$';

  PERFORM setval('public.crm_order_number_seq', GREATEST(max_order_seq, 1), max_order_seq > 0);
END $$;
