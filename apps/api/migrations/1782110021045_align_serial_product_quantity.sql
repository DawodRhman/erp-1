-- Up Migration: align the legacy aggregate quantity with the serial register.
-- For SERIAL and IMEI products, AVAILABLE inventory_items are the stock source
-- of truth. The aggregate remains synchronized for compatibility with older
-- reports and integrations.
WITH serial_stock AS (
  SELECT
    p.id AS product_id,
    COUNT(i.id) FILTER (WHERE i.current_status = 'AVAILABLE')::numeric AS available_quantity
  FROM public.products p
  LEFT JOIN public.inventory_items i ON i.product_id = p.id
  WHERE UPPER(COALESCE(p.tracking_type, 'NONE')) IN ('SERIAL', 'IMEI')
  GROUP BY p.id
)
UPDATE public.products p
SET quantity = serial_stock.available_quantity,
    updated_at = NOW()
FROM serial_stock
WHERE p.id = serial_stock.product_id
  AND COALESCE(p.quantity, 0) IS DISTINCT FROM serial_stock.available_quantity;

-- Down Migration: this is a one-way legacy data correction. Existing
-- quantities are retained because the prior stale values are not valid stock.
