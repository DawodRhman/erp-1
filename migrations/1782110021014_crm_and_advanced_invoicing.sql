-- Migration: CRM, Inventory Field Logistics, and Dynamic Client Invoicing
-- Provisions tables for CRM leads, quotations, price tiers, installer field dispatches, returns accounting, on-the-go purchases, dynamic client invoice templates, and invoices.

-- 1. Product Price Tiers (Tier A, Tier B, Tier C, Tier D)
CREATE TABLE IF NOT EXISTS public.product_price_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    tier_name VARCHAR(50) NOT NULL, -- TIER_A, TIER_B, TIER_C, TIER_D
    price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT idx_product_tier_unique UNIQUE (product_id, tier_name)
);

-- 2. CRM Leads & Inquiries
CREATE TABLE IF NOT EXISTS public.crm_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    contact_name VARCHAR(150),
    contact_email VARCHAR(160),
    contact_phone VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'NEW', -- NEW, CONTACTED, QUOTED, IN_PROGRESS, WON, LOST
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. CRM Quotations
CREATE TABLE IF NOT EXISTS public.quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_number VARCHAR(100) NOT NULL UNIQUE,
    lead_id UUID REFERENCES public.crm_leads(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    price_tier VARCHAR(50) NOT NULL DEFAULT 'TIER_A',
    currency VARCHAR(10) NOT NULL DEFAULT 'PKR',
    exchange_rate NUMERIC(12, 4) NOT NULL DEFAULT 1.0000,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    template_style VARCHAR(80) DEFAULT 'Standard',
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- DRAFT, SENT, REVISION_REQUESTED, APPROVED, REJECTED
    terms TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.quotation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00
);

-- 4. Installer Field Dispatches & Inventory Logistics
CREATE TABLE IF NOT EXISTS public.installer_field_dispatches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispatch_number VARCHAR(100) NOT NULL UNIQUE,
    quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    installer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'DISPATCHED', -- DISPATCHED, IN_PROGRESS, RECONCILED, COMPLETED
    site_address TEXT,
    notes TEXT,
    dispatched_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.installer_dispatch_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispatch_id UUID NOT NULL REFERENCES public.installer_field_dispatches(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
    quantity_issued NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    quantity_used NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    quantity_returned NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    unit_of_measure VARCHAR(30) DEFAULT 'UNITS', -- UNITS, FT, M, ROLLS
    unit_price NUMERIC(12, 2) DEFAULT 0.00,
    total_used_price NUMERIC(12, 2) DEFAULT 0.00,
    notes TEXT
);

-- 5. Installer On-The-Go Field Purchases
CREATE TABLE IF NOT EXISTS public.installer_on_the_go_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispatch_id UUID NOT NULL REFERENCES public.installer_field_dispatches(id) ON DELETE CASCADE,
    item_description TEXT NOT NULL,
    vendor_name VARCHAR(150),
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    receipt_url TEXT,
    notes TEXT,
    purchased_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Dynamic Client Invoice Templates & Settings
CREATE TABLE IF NOT EXISTS public.client_invoice_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    template_name VARCHAR(120) NOT NULL, -- 'Bank AL Habib', 'Sindh Bank', 'Jamat Khana', 'DC Office', 'Private', 'Privat quotation on GST'
    tax_type VARCHAR(50) DEFAULT 'GST', -- GST, SST, SRB_EXEMPT, NONE
    default_tax_rate NUMERIC(5, 2) DEFAULT 18.00,
    number_of_copies INT DEFAULT 1,
    custom_header TEXT,
    custom_footer TEXT,
    template_config JSONB DEFAULT '{}'::jsonb,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Automated Customer Invoices & Summaries
CREATE TABLE IF NOT EXISTS public.customer_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(100) NOT NULL UNIQUE,
    dispatch_id UUID REFERENCES public.installer_field_dispatches(id) ON DELETE SET NULL,
    quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    invoice_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    currency VARCHAR(10) NOT NULL DEFAULT 'PKR',
    exchange_rate NUMERIC(12, 4) NOT NULL DEFAULT 1.0000,
    template_name VARCHAR(120) DEFAULT 'Standard',
    tax_type VARCHAR(50) DEFAULT 'GST',
    tax_rate NUMERIC(5, 2) DEFAULT 18.00,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    amount_in_words TEXT,
    number_of_copies INT DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- DRAFT, ISSUED, PAID, CANCELLED
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customer_invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.customer_invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    quantity NUMERIC(12, 2) NOT NULL DEFAULT 1.00,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_without_tax NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_with_tax NUMERIC(12, 2) NOT NULL DEFAULT 0.00
);
