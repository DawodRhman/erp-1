-- Normalize inventory token/serial lifecycle demo data.

DO $$
DECLARE
  rec RECORD;
  next_serial TEXT;
  seq INT := 1;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'inventory_items'
  ) THEN
    FOR rec IN
      SELECT id
      FROM public.inventory_items
      WHERE serial_number ~ '^SN-HIK-2024-[0-9]+$'
      ORDER BY serial_number, id
    LOOP
      LOOP
        next_serial := 'SN-2026-' || LPAD(seq::text, 5, '0');
        seq := seq + 1;

        EXIT WHEN NOT EXISTS (
          SELECT 1
          FROM public.inventory_items
          WHERE serial_number = next_serial
            AND id <> rec.id
        );
      END LOOP;

      UPDATE public.inventory_items
      SET serial_number = next_serial,
          updated_at = NOW()
      WHERE id = rec.id;
    END LOOP;
  END IF;
END $$;
