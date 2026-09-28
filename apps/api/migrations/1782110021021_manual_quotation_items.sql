ALTER TABLE IF EXISTS public.quotation_items
  ALTER COLUMN product_id DROP NOT NULL;

ALTER TABLE IF EXISTS public.quotation_items
  ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE IF EXISTS public.quotation_items
  ADD COLUMN IF NOT EXISTS item_description TEXT;

UPDATE public.quotation_items
SET description = COALESCE(description, item_description)
WHERE description IS NULL;

UPDATE public.quotation_items
SET item_description = COALESCE(item_description, description)
WHERE item_description IS NULL;
