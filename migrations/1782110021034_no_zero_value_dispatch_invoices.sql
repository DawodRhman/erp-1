-- Zero-value installer adjustments are operational closures, not payable invoices.
UPDATE public.installer_field_dispatches d
SET status = 'NO_CHARGE',
    notes = CONCAT_WS(E'\n', NULLIF(d.notes, ''), 'No charge: every chargeable item was returned; Finance invoice not required.'),
    updated_at = NOW()
WHERE d.id IN (
  SELECT i.dispatch_id
  FROM public.customer_invoices i
  WHERE i.dispatch_id IS NOT NULL
    AND COALESCE(i.total_amount, 0) <= 0
    AND COALESCE(i.notes, '') LIKE '%installer_returns%'
);

UPDATE public.crm_orders o
SET status = 'COMPLETED',
    updated_at = NOW()
WHERE o.quotation_id IN (
  SELECT i.quotation_id
  FROM public.customer_invoices i
  WHERE i.quotation_id IS NOT NULL
    AND COALESCE(i.total_amount, 0) <= 0
    AND COALESCE(i.notes, '') LIKE '%installer_returns%'
)
  AND o.status <> 'CANCELLED';

UPDATE public.customer_invoices i
SET status = 'VOIDED',
    notes = (
      COALESCE(NULLIF(i.notes, ''), '{}')::jsonb
      || jsonb_build_object(
        'finance_approval_status', 'NO_CHARGE',
        'no_charge_reason', 'Every chargeable item was returned; no payable invoice is required.'
      )
    )::text,
    updated_at = NOW()
WHERE COALESCE(i.total_amount, 0) <= 0
  AND COALESCE(i.notes, '') LIKE '%installer_returns%';
