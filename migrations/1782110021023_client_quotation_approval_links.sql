ALTER TABLE IF EXISTS public.quotations
  ADD COLUMN IF NOT EXISTS client_approval_token TEXT,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS client_approved_at TIMESTAMPTZ;

UPDATE public.quotations
SET client_approval_token = gen_random_uuid()::text
WHERE client_approval_token IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_quotations_client_approval_token
  ON public.quotations (client_approval_token)
  WHERE client_approval_token IS NOT NULL;
