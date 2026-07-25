-- Migration: Customer-Specific Special Invoice Draft Templates
-- Provisions customer_invoice_drafts table, trigger for auto-draft creation upon customer registration,
-- and default seed rows.

CREATE TABLE IF NOT EXISTS public.customer_invoice_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL UNIQUE REFERENCES public.customers(id) ON DELETE CASCADE,
    payment_terms VARCHAR(50) NOT NULL DEFAULT 'NET30', -- NET15, NET30, DUE_ON_RECEIPT, ADVANCE
    default_discount_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    custom_notes TEXT DEFAULT 'Thank you for your business. Please process payment as per agreed payment terms.',
    template_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger function to automatically create a special draft template when a customer is registered
CREATE OR REPLACE FUNCTION public.fn_auto_create_customer_invoice_draft()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.customer_invoice_drafts (customer_id, payment_terms, custom_notes, template_items)
    VALUES (
        NEW.id,
        'NET30',
        CONCAT('Special Draft Template for ', NEW.customer_name, '. Please remit payment according to terms.'),
        '[]'::jsonb
    )
    ON CONFLICT (customer_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_create_customer_invoice_draft ON public.customers;
CREATE TRIGGER trg_auto_create_customer_invoice_draft
AFTER INSERT ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.fn_auto_create_customer_invoice_draft();

-- Backfill pre-existing customers if any exist without draft templates
INSERT INTO public.customer_invoice_drafts (customer_id, payment_terms, custom_notes, template_items)
SELECT
    c.id,
    'NET30',
    CONCAT('Special Draft Template for ', c.customer_name, '. Please remit payment according to terms.'),
    '[]'::jsonb
FROM public.customers c
ON CONFLICT (customer_id) DO NOTHING;
