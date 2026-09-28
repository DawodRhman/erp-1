-- Keep inventory demo data aligned with the simplified dashboard.

DO $$
DECLARE
  rec RECORD;
  fixed_number TEXT;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'installer_field_dispatches'
  ) THEN
    FOR rec IN
      SELECT id, dispatch_number
      FROM public.installer_field_dispatches
      WHERE dispatch_number ~ '^DSP-[0-9]{6}-[0-9]+$'
    LOOP
      fixed_number := regexp_replace(rec.dispatch_number, '^DSP-([0-9]{4})[0-9]{2}-', 'DSP-\1-');

      IF NOT EXISTS (
        SELECT 1
        FROM public.installer_field_dispatches
        WHERE dispatch_number = fixed_number
          AND id <> rec.id
      ) THEN
        UPDATE public.installer_field_dispatches
        SET dispatch_number = fixed_number,
            updated_at = NOW()
        WHERE id = rec.id;
      END IF;
    END LOOP;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'inventory_movements'
      AND column_name = 'product_id'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'inventory_movements'
      AND column_name = 'inventory_item_id'
  ) THEN
    UPDATE public.inventory_movements im
    SET product_id = ii.product_id
    FROM public.inventory_items ii
    WHERE im.inventory_item_id = ii.id
      AND im.product_id IS NULL
      AND ii.product_id IS NOT NULL;
  END IF;
END $$;
