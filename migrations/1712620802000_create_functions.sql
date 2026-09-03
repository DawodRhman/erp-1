-- Up Migration
CREATE FUNCTION public.generate_csid() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.csid := 'CS-' || LPAD(nextval('public.customer_seq')::TEXT, 8, '0'); RETURN NEW; END; $$;

CREATE FUNCTION public.generate_do_id() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.do_id := 'DO-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(nextval('public.do_seq')::TEXT, 4, '0'); RETURN NEW; END; $$;

CREATE FUNCTION public.generate_grn_id() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.grn_id := 'GRN-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(nextval('public.grn_seq')::TEXT, 4, '0'); RETURN NEW; END; $$;

CREATE FUNCTION public.generate_invoice_id() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.invoice_id := 'INV-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(nextval('public.invoice_seq')::TEXT, 4, '0'); RETURN NEW; END; $$;

CREATE FUNCTION public.generate_po_id() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.po_id := 'PO-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(nextval('public.po_seq')::TEXT, 4, '0'); RETURN NEW; END; $$;

CREATE FUNCTION public.generate_pr_id() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.pr_id := 'PR-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(nextval('public.pr_seq')::TEXT, 4, '0'); RETURN NEW; END; $$;

CREATE FUNCTION public.generate_quotation_id() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.quotation_id := 'QT-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(nextval('public.quotation_seq')::TEXT, 4, '0'); RETURN NEW; END; $$;

CREATE FUNCTION public.generate_vendor_id() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.vendor_id := 'V-' || LPAD(nextval('public.vendor_seq')::TEXT, 8, '0'); RETURN NEW; END; $$;

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END; $$;

-- Down Migration
DROP FUNCTION IF EXISTS public.generate_csid();
DROP FUNCTION IF EXISTS public.generate_do_id();
DROP FUNCTION IF EXISTS public.generate_grn_id();
DROP FUNCTION IF EXISTS public.generate_invoice_id();
DROP FUNCTION IF EXISTS public.generate_po_id();
DROP FUNCTION IF EXISTS public.generate_pr_id();
DROP FUNCTION IF EXISTS public.generate_quotation_id();
DROP FUNCTION IF EXISTS public.generate_vendor_id();
DROP FUNCTION IF EXISTS public.update_updated_at_column();
