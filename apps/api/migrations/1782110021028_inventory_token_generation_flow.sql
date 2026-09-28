CREATE SEQUENCE IF NOT EXISTS public.inventory_token_number_seq;

ALTER TABLE public.crm_orders
  ALTER COLUMN token_number DROP NOT NULL,
  ALTER COLUMN status SET DEFAULT 'PENDING_REVIEW';

UPDATE public.crm_orders
SET status = 'PENDING_REVIEW'
WHERE status = 'READY_FOR_INVENTORY'
  AND token_number IS NULL;

UPDATE public.crm_orders
SET status = 'TOKEN_GENERATED'
WHERE status = 'READY_FOR_INVENTORY'
  AND token_number IS NOT NULL;

SELECT setval(
  'public.inventory_token_number_seq',
  GREATEST(
    (
      SELECT COALESCE(MAX((substring(token_number FROM '^TKN-[0-9]{4}-([0-9]+)$'))::integer), 0)
      FROM public.crm_orders
      WHERE token_number ~ '^TKN-[0-9]{4}-[0-9]+$'
    ),
    1
  ),
  (
    SELECT COALESCE(MAX((substring(token_number FROM '^TKN-[0-9]{4}-([0-9]+)$'))::integer), 0) > 0
    FROM public.crm_orders
    WHERE token_number ~ '^TKN-[0-9]{4}-[0-9]+$'
  )
);
