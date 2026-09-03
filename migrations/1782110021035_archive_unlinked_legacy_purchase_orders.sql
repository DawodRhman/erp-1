-- Preserve legacy test POs for audit, but remove them from the actionable receive queue.
UPDATE public.purchase_orders po
SET status = 'CANCELLED',
    notes = CONCAT_WS(
      E'\n',
      NULLIF(po.notes, ''),
      'Archived legacy test PO: supplier and expected delivery date were not set.'
    ),
    updated_at = NOW()
WHERE po.vendor_id IS NULL
  AND po.expected_delivery_date IS NULL
  AND po.crm_order_id IS NULL
  AND po.quotation_id IS NULL
  AND UPPER(COALESCE(po.status, '')) = 'ORDERED'
  AND NOT EXISTS (
    SELECT 1
    FROM public.purchase_order_items poi
    WHERE poi.purchase_order_id = po.id
      AND COALESCE(poi.received_quantity, 0) > 0
  );
