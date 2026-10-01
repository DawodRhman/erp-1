-- Up Migration: align legacy catalog records with the production Inventory contract.
INSERT INTO public.item_categories (category_name, description)
SELECT 'General Procurement', 'Fallback category for migrated stock records awaiting detailed classification.'
WHERE NOT EXISTS (
  SELECT 1 FROM public.item_categories WHERE LOWER(category_name) = LOWER('General Procurement')
);

UPDATE public.products p
SET category_id = c.id,
    updated_at = NOW()
FROM public.item_categories c
WHERE LOWER(c.category_name) = LOWER('General Procurement')
  AND p.category_id IS NULL
  AND COALESCE(p.product_type, 'ASSET') <> 'SERVICE';

UPDATE public.products
SET sku = LEFT(
      COALESCE(
        NULLIF(
          TRIM(BOTH '-' FROM REGEXP_REPLACE(
            UPPER(COALESCE(NULLIF(brand_make, ''), NULLIF(model_no, ''), product_name)),
            '[^A-Z0-9]+',
            '-',
            'g'
          )),
          ''
        ),
        'ITEM'
      ),
      80
    ) || '-' || UPPER(LEFT(REPLACE(id::text, '-', ''), 8)),
    updated_at = NOW()
WHERE sku IS NULL OR TRIM(sku) = '';

ALTER TABLE public.products
  ALTER COLUMN sku SET NOT NULL;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_sku_not_blank;

ALTER TABLE public.products
  ADD CONSTRAINT products_sku_not_blank CHECK (TRIM(sku) <> '');

-- Down Migration: constraints can be relaxed, but generated business identifiers are retained.
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_sku_not_blank;

ALTER TABLE public.products
  ALTER COLUMN sku DROP NOT NULL;
