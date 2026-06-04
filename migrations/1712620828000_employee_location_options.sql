-- Up Migration
CREATE TABLE IF NOT EXISTS public.employee_locations (
  id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
  kind varchar(20) NOT NULL,
  country varchar(80) NOT NULL DEFAULT 'Pakistan',
  province varchar(100),
  name varchar(120) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT employee_locations_pkey PRIMARY KEY (id),
  CONSTRAINT employee_locations_kind_check CHECK ((kind)::text = ANY (ARRAY['province'::text, 'district'::text, 'city'::text, 'town'::text])),
  CONSTRAINT employee_locations_country_check CHECK (country = 'Pakistan')
);

CREATE UNIQUE INDEX IF NOT EXISTS employee_locations_unique_active_name
  ON public.employee_locations (kind, country, COALESCE(province, ''), LOWER(name));

CREATE TRIGGER trg_employee_locations_updated_at
  BEFORE UPDATE ON public.employee_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.employee_locations (kind, country, province, name, is_active)
VALUES
  ('province', 'Pakistan', NULL, 'Punjab', true),
  ('province', 'Pakistan', NULL, 'Sindh', true),
  ('province', 'Pakistan', NULL, 'Khyber Pakhtunkhwa', true),
  ('province', 'Pakistan', NULL, 'Balochistan', true),
  ('province', 'Pakistan', NULL, 'Islamabad Capital Territory', true),
  ('province', 'Pakistan', NULL, 'Gilgit-Baltistan', true),
  ('province', 'Pakistan', NULL, 'Azad Jammu and Kashmir', true),
  ('city', 'Pakistan', 'Punjab', 'Lahore', true),
  ('city', 'Pakistan', 'Punjab', 'Faisalabad', true),
  ('city', 'Pakistan', 'Punjab', 'Rawalpindi', true),
  ('city', 'Pakistan', 'Punjab', 'Multan', true),
  ('city', 'Pakistan', 'Punjab', 'Gujranwala', true),
  ('city', 'Pakistan', 'Punjab', 'Sialkot', true),
  ('city', 'Pakistan', 'Punjab', 'Sargodha', true),
  ('city', 'Pakistan', 'Punjab', 'Bahawalpur', true),
  ('city', 'Pakistan', 'Punjab', 'Sheikhupura', true),
  ('city', 'Pakistan', 'Sindh', 'Karachi', true),
  ('city', 'Pakistan', 'Sindh', 'Hyderabad', true),
  ('city', 'Pakistan', 'Sindh', 'Sukkur', true),
  ('city', 'Pakistan', 'Sindh', 'Larkana', true),
  ('city', 'Pakistan', 'Sindh', 'Nawabshah', true),
  ('city', 'Pakistan', 'Khyber Pakhtunkhwa', 'Peshawar', true),
  ('city', 'Pakistan', 'Khyber Pakhtunkhwa', 'Mardan', true),
  ('city', 'Pakistan', 'Khyber Pakhtunkhwa', 'Abbottabad', true),
  ('city', 'Pakistan', 'Khyber Pakhtunkhwa', 'Swat', true),
  ('city', 'Pakistan', 'Balochistan', 'Quetta', true),
  ('city', 'Pakistan', 'Balochistan', 'Gwadar', true),
  ('city', 'Pakistan', 'Balochistan', 'Turbat', true),
  ('city', 'Pakistan', 'Islamabad Capital Territory', 'Islamabad', true),
  ('city', 'Pakistan', 'Gilgit-Baltistan', 'Gilgit', true),
  ('city', 'Pakistan', 'Gilgit-Baltistan', 'Skardu', true),
  ('city', 'Pakistan', 'Azad Jammu and Kashmir', 'Muzaffarabad', true),
  ('city', 'Pakistan', 'Azad Jammu and Kashmir', 'Mirpur', true),
  ('district', 'Pakistan', 'Punjab', 'Lahore', true),
  ('district', 'Pakistan', 'Punjab', 'Faisalabad', true),
  ('district', 'Pakistan', 'Punjab', 'Rawalpindi', true),
  ('district', 'Pakistan', 'Sindh', 'Karachi Central', true),
  ('district', 'Pakistan', 'Sindh', 'Karachi East', true),
  ('district', 'Pakistan', 'Sindh', 'Hyderabad', true),
  ('district', 'Pakistan', 'Khyber Pakhtunkhwa', 'Peshawar', true),
  ('district', 'Pakistan', 'Balochistan', 'Quetta', true),
  ('town', 'Pakistan', 'Punjab', 'Gulberg', true),
  ('town', 'Pakistan', 'Punjab', 'Model Town', true),
  ('town', 'Pakistan', 'Punjab', 'Johar Town', true),
  ('town', 'Pakistan', 'Sindh', 'Clifton', true),
  ('town', 'Pakistan', 'Sindh', 'Gulshan-e-Iqbal', true),
  ('town', 'Pakistan', 'Islamabad Capital Territory', 'G-9', true),
  ('town', 'Pakistan', 'Islamabad Capital Territory', 'F-10', true)
ON CONFLICT DO NOTHING;

-- Down Migration
DROP TRIGGER IF EXISTS trg_employee_locations_updated_at ON public.employee_locations;
DROP TABLE IF EXISTS public.employee_locations;
