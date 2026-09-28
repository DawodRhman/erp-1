-- Up Migration
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS customer_category VARCHAR(40) NOT NULL DEFAULT 'ORGANIZATION',
  ADD COLUMN IF NOT EXISTS organization_type VARCHAR(60),
  ADD COLUMN IF NOT EXISTS service_categories TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS service_description TEXT;

ALTER TABLE public.customers ALTER COLUMN company_name DROP NOT NULL;

UPDATE public.customers
SET company_name = NULL
WHERE NULLIF(BTRIM(company_name), '') IS NOT NULL
  AND LOWER(BTRIM(company_name)) = LOWER(BTRIM(customer_name));

UPDATE public.customers
SET organization_type = NULLIF(BTRIM(customer_type), '')
WHERE organization_type IS NULL
  AND customer_category <> 'INDIVIDUAL';

ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_customer_category_check;
ALTER TABLE public.customers ADD CONSTRAINT customers_customer_category_check
  CHECK (customer_category IN ('INDIVIDUAL', 'ORGANIZATION', 'GROUP_OF_COMPANIES', 'GOVERNMENT', 'NON_PROFIT'));

-- Down Migration
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_customer_category_check;
UPDATE public.customers SET company_name = customer_name WHERE company_name IS NULL;
ALTER TABLE public.customers ALTER COLUMN company_name SET NOT NULL;
ALTER TABLE public.customers
  DROP COLUMN IF EXISTS service_description,
  DROP COLUMN IF EXISTS service_categories,
  DROP COLUMN IF EXISTS organization_type,
  DROP COLUMN IF EXISTS customer_category;
