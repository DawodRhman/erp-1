CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SEQUENCE IF NOT EXISTS public.crm_order_number_seq;

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

ALTER TABLE IF EXISTS public.quotations
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS client_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approval_remarks TEXT,
  ADD COLUMN IF NOT EXISTS client_approval_token TEXT;

UPDATE public.quotations
SET status = 'SENT',
    updated_at = NOW()
WHERE status = 'IN_PROGRESS';

UPDATE public.quotations
SET status = 'APPROVED',
    updated_at = NOW()
WHERE status = 'COMPLETED';

UPDATE public.quotations
SET client_approval_token = gen_random_uuid()::text
WHERE client_approval_token IS NULL;

ALTER TABLE IF EXISTS public.quotations
  DROP CONSTRAINT IF EXISTS quotations_status_check;

ALTER TABLE IF EXISTS public.quotations
  ADD CONSTRAINT quotations_status_check
  CHECK (status IN ('DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'EXPIRED'));

CREATE UNIQUE INDEX IF NOT EXISTS ux_quotations_client_approval_token
  ON public.quotations (client_approval_token)
  WHERE client_approval_token IS NOT NULL;

ALTER TABLE IF EXISTS public.customer_complaints
  ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN IF NOT EXISTS crm_order_id UUID REFERENCES public.crm_orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE IF EXISTS public.customer_complaints
  DROP CONSTRAINT IF EXISTS customer_complaints_priority_check;

ALTER TABLE IF EXISTS public.customer_complaints
  ADD CONSTRAINT customer_complaints_priority_check
  CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH'));

CREATE INDEX IF NOT EXISTS idx_customer_complaints_crm_order_id
  ON public.customer_complaints(crm_order_id);

CREATE INDEX IF NOT EXISTS idx_customer_complaints_priority
  ON public.customer_complaints(priority);

WITH approved_without_order AS (
  SELECT q.id AS quotation_id, q.customer_id
  FROM public.quotations q
  LEFT JOIN public.crm_orders o ON o.quotation_id = q.id
  WHERE q.status = 'APPROVED'
    AND o.id IS NULL
  ORDER BY q.created_at ASC, q.id ASC
),
numbered AS (
  SELECT
    quotation_id,
    customer_id,
    nextval('public.crm_order_number_seq')::int AS seq
  FROM approved_without_order
)
INSERT INTO public.crm_orders (order_number, quotation_id, customer_id, token_number, status)
SELECT
  'ORD-' || EXTRACT(YEAR FROM NOW())::int || '-' || LPAD(seq::text, 4, '0'),
  quotation_id,
  customer_id,
  'TKN-' || EXTRACT(YEAR FROM NOW())::int || '-' || LPAD(seq::text, 4, '0'),
  'READY_FOR_INVENTORY'
FROM numbered
ON CONFLICT (quotation_id) DO NOTHING;
