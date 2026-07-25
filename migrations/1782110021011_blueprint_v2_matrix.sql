-- Migration: TRACK360 ERP Blueprint (V2.1) Matrix Structural Logic
-- Phase 1 Sales CRM, Phase 2 Operations PR, Phase 3 Procurement & Stock Out,
-- Phase 4 Field Service OTP Handshake, Phase 5 Virtual Debt, Commissions & Vehicle Lifecycle

-- 1. Sales CRM & Leads
CREATE TABLE IF NOT EXISTS public.sales_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_number VARCHAR(100) NOT NULL UNIQUE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    estimated_value NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'NEW', -- NEW, CONTACTED, QUALIFIED, PROPOSAL, WON, LOST
    assigned_sales_rep UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Sales Quotations
CREATE TABLE IF NOT EXISTS public.sales_quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_number VARCHAR(100) NOT NULL UNIQUE,
    lead_id UUID REFERENCES public.sales_leads(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    quotation_type VARCHAR(50) NOT NULL DEFAULT 'PRODUCT', -- PRODUCT, SERVICE_PROJECT
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- DRAFT, SENT, WON, LOST
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.quotation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL REFERENCES public.sales_quotations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    item_description TEXT,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00
);

-- 3. ERP Projects (Activated upon Quotation WON)
CREATE TABLE IF NOT EXISTS public.erp_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_number VARCHAR(100) NOT NULL UNIQUE,
    project_name VARCHAR(200) NOT NULL,
    quotation_id UUID REFERENCES public.sales_quotations(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, COMPLETED, ON_HOLD
    budget NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.project_resource_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.erp_projects(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role_in_project VARCHAR(100) DEFAULT 'Member',
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Purchase Requisitions (PR)
CREATE TABLE IF NOT EXISTS public.purchase_requisitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pr_number VARCHAR(100) NOT NULL UNIQUE,
    project_id UUID REFERENCES public.erp_projects(id) ON DELETE SET NULL,
    pr_type VARCHAR(50) NOT NULL DEFAULT 'CLIENT_INVENTORY', -- CLIENT_INVENTORY, INTERNAL_ASSET
    requested_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED', -- SUBMITTED, APPROVED, PO_CREATED, REJECTED
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.purchase_requisition_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pr_id UUID NOT NULL REFERENCES public.purchase_requisitions(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    quantity INT NOT NULL DEFAULT 1,
    estimated_cost NUMERIC(12, 2) DEFAULT 0.00,
    remarks TEXT
);

-- 5. Field Support & Service Tickets
CREATE TABLE IF NOT EXISTS public.service_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number VARCHAR(100) NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.erp_projects(id) ON DELETE SET NULL,
    assigned_technician_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    complaint_type VARCHAR(100) NOT NULL DEFAULT 'DEVICE_OFFLINE',
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN', -- OPEN, ASSIGNED, IN_PROGRESS, OTP_PENDING, CLOSED
    description TEXT,
    otp_code VARCHAR(10),
    otp_verified BOOLEAN NOT NULL DEFAULT FALSE,
    photo_proof_url TEXT,
    customer_signature TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

-- 6. Employee Assets (Internal Assets Allocated to Employee ID: Laptops, Vehicles, Tools)
CREATE TABLE IF NOT EXISTS public.employee_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_number VARCHAR(100) NOT NULL UNIQUE,
    employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
    asset_type VARCHAR(50) NOT NULL DEFAULT 'LAPTOP', -- LAPTOP, VEHICLE, TOOL, OTHER
    status VARCHAR(50) NOT NULL DEFAULT 'ASSIGNED', -- ASSIGNED, PENDING_RETURN, RETURNED
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    returned_date DATE
);

-- 7. Virtual Debt (Field Cash Collection)
CREATE TABLE IF NOT EXISTS public.technician_virtual_debts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    debt_number VARCHAR(100) NOT NULL UNIQUE,
    technician_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    ticket_id UUID REFERENCES public.service_tickets(id) ON DELETE SET NULL,
    amount_collected NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'UNRECONCILED', -- UNRECONCILED, RECONCILED
    collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reconciled_at TIMESTAMPTZ,
    reconciled_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- 8. Sales Commissions & Technician Visit Fees
CREATE TABLE IF NOT EXISTS public.sales_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.erp_projects(id) ON DELETE SET NULL,
    commission_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, PAID
    earned_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.technician_visit_fees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    technician_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    ticket_id UUID REFERENCES public.service_tickets(id) ON DELETE CASCADE,
    visit_fee_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, PAID
    earned_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Vehicle Maintenance & Fuel Logs
CREATE TABLE IF NOT EXISTS public.vehicle_fuel_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES public.employee_assets(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    fuel_liters NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    cost_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS public.vehicle_maintenance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES public.employee_assets(id) ON DELETE CASCADE,
    maintenance_type VARCHAR(100) NOT NULL DEFAULT 'REGULAR_SERVICE',
    cost_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    service_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT
);

-- 10. Permissions for Matrix Blueprint V2.1
INSERT INTO public.permissions (permission_key, permission_name, category, description)
VALUES
  ('matrix:sales', 'Sales & CRM', 'Matrix Blueprint', 'Can manage sales leads, quotations, and project activations'),
  ('matrix:operations', 'Operations & Requisitions', 'Matrix Blueprint', 'Can manage project resources and purchase requisitions'),
  ('matrix:field_service', 'Field Service & OTP Handshake', 'Matrix Blueprint', 'Can manage service tickets and OTP handshake verification'),
  ('matrix:finance', 'Finance & Virtual Debt', 'Matrix Blueprint', 'Can reconcile virtual debts and approve commission triggers')
ON CONFLICT (permission_key) DO NOTHING;

-- Grant permissions to super_admin, head_hr, hr_manager, and department_head
DO $$
DECLARE
    v_role_rec RECORD;
    v_perm_rec RECORD;
BEGIN
    FOR v_role_rec IN SELECT id FROM public.roles WHERE role_name IN ('super_admin', 'head_hr', 'hr_manager', 'department_head') LOOP
        FOR v_perm_rec IN SELECT id FROM public.permissions WHERE category = 'Matrix Blueprint' LOOP
            INSERT INTO public.role_permissions (role_id, permission_id) VALUES (v_role_rec.id, v_perm_rec.id) ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END $$;
