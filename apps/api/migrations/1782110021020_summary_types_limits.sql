-- Patch: classify invoice summaries and enforce editable client summary limits.

ALTER TABLE public.customer_invoice_summaries
  ADD COLUMN IF NOT EXISTS summary_type VARCHAR(80) NOT NULL DEFAULT 'operational_expenses',
  ADD COLUMN IF NOT EXISTS summary_limit NUMERIC(18, 6) NOT NULL DEFAULT 2000000,
  ADD COLUMN IF NOT EXISTS is_over_limit BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE public.customer_invoice_summaries
SET is_over_limit = total_amount > summary_limit
WHERE summary_limit > 0;

CREATE INDEX IF NOT EXISTS idx_customer_invoice_summaries_type
  ON public.customer_invoice_summaries(summary_type);
