-- Up Migration
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS contact_person TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT;

-- Down Migration
ALTER TABLE public.customers
  DROP COLUMN IF EXISTS address,
  DROP COLUMN IF EXISTS contact_person;
