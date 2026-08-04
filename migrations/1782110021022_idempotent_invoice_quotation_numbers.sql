CREATE SEQUENCE IF NOT EXISTS public.crm_quotation_number_seq;
CREATE SEQUENCE IF NOT EXISTS public.customer_invoice_number_seq;

DO $$
DECLARE
  max_quote_seq integer;
  max_invoice_seq integer;
BEGIN
  SELECT COALESCE(MAX((substring(quotation_number FROM 'QT-[0-9]{6}-([0-9]+)$'))::integer), 0)
  INTO max_quote_seq
  FROM public.quotations
  WHERE quotation_number ~ '^QT-[0-9]{6}-[0-9]+$';

  PERFORM setval('public.crm_quotation_number_seq', GREATEST(max_quote_seq, 1), true);

  SELECT COALESCE(MAX((substring(invoice_number FROM 'INV-[0-9]{6}-([0-9]+)$'))::integer), 0)
  INTO max_invoice_seq
  FROM public.customer_invoices
  WHERE invoice_number ~ '^INV-[0-9]{6}-[0-9]+$';

  PERFORM setval('public.customer_invoice_number_seq', GREATEST(max_invoice_seq, 1), true);
END $$;

ALTER TABLE IF EXISTS public.quotations
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(120);

ALTER TABLE IF EXISTS public.customer_invoices
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(120);

CREATE UNIQUE INDEX IF NOT EXISTS ux_quotations_idempotency_key
  ON public.quotations (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_customer_invoices_idempotency_key
  ON public.customer_invoices (idempotency_key)
  WHERE idempotency_key IS NOT NULL;
