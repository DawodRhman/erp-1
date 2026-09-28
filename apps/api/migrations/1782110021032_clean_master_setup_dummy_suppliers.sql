-- Up Migration

DO $$
DECLARE
  service_category_id uuid;
  rental_category_id uuid;
  cyber_category_id uuid;
  consulting_category_id uuid;
  facility_category_id uuid;
BEGIN
  INSERT INTO public.item_categories (category_name, description)
  SELECT category_name, description
  FROM (
    VALUES
      ('Service & Maintenance', 'Installation, maintenance, warranty and operational service items'),
      ('Rental Services', 'Equipment rental and leased service items'),
      ('Cybersecurity Services', 'Security assessment, firewall, SIEM and cyber readiness services'),
      ('Training & Consulting', 'Survey, training, commissioning support and advisory work'),
      ('Electrical & Facility Services', 'Electrical safety and facility maintenance work')
  ) AS seed(category_name, description)
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.item_categories ic
    WHERE ic.category_name = seed.category_name
  );

  SELECT id INTO service_category_id FROM public.item_categories WHERE category_name = 'Service & Maintenance' LIMIT 1;
  SELECT id INTO rental_category_id FROM public.item_categories WHERE category_name = 'Rental Services' LIMIT 1;
  SELECT id INTO cyber_category_id FROM public.item_categories WHERE category_name = 'Cybersecurity Services' LIMIT 1;
  SELECT id INTO consulting_category_id FROM public.item_categories WHERE category_name = 'Training & Consulting' LIMIT 1;
  SELECT id INTO facility_category_id FROM public.item_categories WHERE category_name = 'Electrical & Facility Services' LIMIT 1;

  UPDATE public.products
  SET category_id = service_category_id,
      updated_at = NOW()
  WHERE product_name IN (
    'CCTV Annual Maintenance Contract',
    'Commissioning Day Rate',
    'Health Check Quarterly',
    'Extended Warranty 3yr'
  );

  UPDATE public.products
  SET category_id = rental_category_id,
      updated_at = NOW()
  WHERE product_name IN (
    'Fiber OTDR Rental Day',
    'Forklift Reach Truck Rent Day',
    'Generator Diesel 50kVA Rent',
    'Drone perimeter patrol lease monthly'
  );

  UPDATE public.products
  SET category_id = cyber_category_id,
      updated_at = NOW()
  WHERE product_name IN (
    'Penetration Test Bundle',
    'Vulnerability Scan Quarterly',
    'Firewall Rule Review Sprint',
    'Container policy gate starter',
    'Incident tabletop cyber drill',
    'Certificate of destruction digital vault'
  );

  UPDATE public.products
  SET category_id = consulting_category_id,
      updated_at = NOW()
  WHERE product_name IN (
    'Site Survey Consulting Day',
    'Training Essentials Seat'
  );

  UPDATE public.products
  SET category_id = facility_category_id,
      updated_at = NOW()
  WHERE product_name IN (
    'Cooling tower fill replacement job',
    'Arc flash study lite'
  );
END $$;

UPDATE public.purchase_orders
SET vendor_id = NULL
WHERE vendor_id IN (
  SELECT id
  FROM public.vendors
  WHERE COALESCE(contact_person, '') = 'Sales Desk'
    AND COALESCE(email, '') = 'sales@vendor.pk'
    AND COALESCE(phone, '') = '0300-1234567'
);

DELETE FROM public.vendors
WHERE COALESCE(contact_person, '') = 'Sales Desk'
  AND COALESCE(email, '') = 'sales@vendor.pk'
  AND COALESCE(phone, '') = '0300-1234567';

-- Down Migration

-- Intentionally does not recreate dummy suppliers.
