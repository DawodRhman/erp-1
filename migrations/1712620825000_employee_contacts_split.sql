-- Up Migration
CREATE TABLE IF NOT EXISTS public.employee_contacts (
  employee_id varchar(10) PRIMARY KEY REFERENCES public.employee_info(employee_id) ON DELETE CASCADE,
  primary_phone varchar(20) NOT NULL,
  alternate_phone varchar(20),
  permanent_country varchar(80) NOT NULL DEFAULT 'Pakistan',
  permanent_province varchar(80),
  permanent_district varchar(100),
  permanent_city varchar(100),
  permanent_town varchar(100),
  permanent_street varchar(255),
  permanent_postal_code varchar(20),
  postal_country varchar(80) NOT NULL DEFAULT 'Pakistan',
  postal_province varchar(80),
  postal_district varchar(100),
  postal_city varchar(100),
  postal_town varchar(100),
  postal_street varchar(255),
  postal_postal_code varchar(20),
  same_as_permanent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_employee_contacts_updated_at ON public.employee_contacts;
CREATE TRIGGER trg_employee_contacts_updated_at
  BEFORE UPDATE ON public.employee_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.employee_contacts (
  employee_id,
  primary_phone,
  alternate_phone,
  permanent_country,
  permanent_street,
  postal_country,
  postal_street,
  same_as_permanent
)
SELECT
  employee_id,
  contact_1,
  contact_2,
  'Pakistan',
  perment_address,
  'Pakistan',
  postal_address,
  COALESCE(NULLIF(perment_address, ''), '') = COALESCE(NULLIF(postal_address, ''), '')
FROM public.emergency_contacts
WHERE contact_1 IS NOT NULL
ON CONFLICT (employee_id) DO NOTHING;

ALTER TABLE public.emergency_contacts
  DROP COLUMN IF EXISTS contact_1,
  DROP COLUMN IF EXISTS contact_2,
  DROP COLUMN IF EXISTS perment_address,
  DROP COLUMN IF EXISTS postal_address;

-- Down Migration
ALTER TABLE public.emergency_contacts
  ADD COLUMN IF NOT EXISTS contact_1 varchar(20),
  ADD COLUMN IF NOT EXISTS contact_2 varchar(20),
  ADD COLUMN IF NOT EXISTS perment_address varchar(300),
  ADD COLUMN IF NOT EXISTS postal_address varchar(300);

UPDATE public.emergency_contacts ec
SET
  contact_1 = COALESCE(ec.contact_1, empc.primary_phone),
  contact_2 = COALESCE(ec.contact_2, empc.alternate_phone),
  perment_address = COALESCE(
    ec.perment_address,
    concat_ws(', ',
      NULLIF(empc.permanent_street, ''),
      NULLIF(empc.permanent_town, ''),
      NULLIF(empc.permanent_city, ''),
      NULLIF(empc.permanent_district, ''),
      NULLIF(empc.permanent_province, ''),
      NULLIF(empc.permanent_country, ''),
      NULLIF(empc.permanent_postal_code, '')
    )
  ),
  postal_address = COALESCE(
    ec.postal_address,
    concat_ws(', ',
      NULLIF(empc.postal_street, ''),
      NULLIF(empc.postal_town, ''),
      NULLIF(empc.postal_city, ''),
      NULLIF(empc.postal_district, ''),
      NULLIF(empc.postal_province, ''),
      NULLIF(empc.postal_country, ''),
      NULLIF(empc.postal_postal_code, '')
    )
  )
FROM public.employee_contacts empc
WHERE empc.employee_id = ec.employee_id;

DROP TRIGGER IF EXISTS trg_employee_contacts_updated_at ON public.employee_contacts;
DROP TABLE IF EXISTS public.employee_contacts;
