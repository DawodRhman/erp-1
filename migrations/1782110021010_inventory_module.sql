-- Migration: Inventory & Invoicing Module
-- Creates categories, products, inventory serial items, vendors, customers, vehicles,
-- purchase orders, invoices, stock movements, tracker installations, complaints, and replacements.

-- 1. Item Categories
CREATE TABLE IF NOT EXISTS public.item_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name VARCHAR(120) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Products
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_name VARCHAR(200) NOT NULL,
    category_id UUID REFERENCES public.item_categories(id) ON DELETE SET NULL,
    product_type VARCHAR(50) NOT NULL DEFAULT 'ASSET', -- ASSET, CONSUMABLE, SERVICE
    tracking_type VARCHAR(50) NOT NULL DEFAULT 'NONE', -- SERIAL, IMEI, NONE
    quantity INT NOT NULL DEFAULT 0,
    min_stock_level INT NOT NULL DEFAULT 5,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Inventory Serials / Serial Tracking
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    serial_number VARCHAR(120) UNIQUE,
    imei VARCHAR(120) UNIQUE,
    current_status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE', -- AVAILABLE, ALLOCATED, INSTALLED, RETURNED, DAMAGED
    location VARCHAR(200),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Vendors / Suppliers
CREATE TABLE IF NOT EXISTS public.vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(120),
    email VARCHAR(160),
    phone VARCHAR(50),
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Customers
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(120),
    email VARCHAR(160),
    phone VARCHAR(50),
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Customer Vehicles
CREATE TABLE IF NOT EXISTS public.customer_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    vehicle_number VARCHAR(80) NOT NULL,
    make VARCHAR(80),
    model VARCHAR(80),
    vin VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Purchase Orders (PO / GRN)
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number VARCHAR(100) NOT NULL UNIQUE,
    vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- DRAFT, ORDERED, RECEIVED, CANCELLED
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    order_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    remarks TEXT
);

-- 8. Sales Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(100) NOT NULL UNIQUE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- DRAFT, ISSUED, PAID, CANCELLED
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    due_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    remarks TEXT
);

-- 9. Inventory Movements (Audit Log of Stock In/Out)
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
    movement_type VARCHAR(50) NOT NULL, -- STOCK_IN, STOCK_OUT, ADJUSTMENT, RETURN, DAMAGE
    quantity INT NOT NULL DEFAULT 1,
    reference_type VARCHAR(80), -- PO, INVOICE, MANUAL, INSTALLATION, REPLACEMENT
    reference_id UUID,
    notes TEXT,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Tracker Installations
CREATE TABLE IF NOT EXISTS public.tracker_installations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    installation_no VARCHAR(100) NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES public.customer_vehicles(id) ON DELETE SET NULL,
    tracker_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
    technician_name VARCHAR(120),
    status VARCHAR(50) NOT NULL DEFAULT 'REQUESTED', -- REQUESTED, ASSIGNED, INSTALLED, COMPLETED, CANCELLED
    installation_date TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Customer Complaints
CREATE TABLE IF NOT EXISTS public.customer_complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_no VARCHAR(100) NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    tracker_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
    complaint_type VARCHAR(100) NOT NULL DEFAULT 'DEVICE_OFFLINE',
    status VARCHAR(50) NOT NULL DEFAULT 'TAKEN', -- TAKEN, PENDING, RESOLVED, REJECTED
    description TEXT,
    reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- 12. Item Replacements (Device Swap)
CREATE TABLE IF NOT EXISTS public.item_replacements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    replacement_no VARCHAR(100) NOT NULL UNIQUE,
    complaint_id UUID REFERENCES public.customer_complaints(id) ON DELETE SET NULL,
    old_inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
    new_inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
    reason TEXT,
    replacement_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Permissions Insertion
INSERT INTO public.permissions (permission_key, permission_name, category, description)
VALUES 
  ('inventory:read', 'View Inventory', 'Inventory', 'Can view inventory catalog, stock levels, POs, and invoices'),
  ('inventory:write', 'Manage Inventory', 'Inventory', 'Can add products, serials, POs, invoices, and tracker installations'),
  ('inventory:admin', 'Inventory Admin', 'Inventory', 'Can perform full administrative inventory control, category edits, and deletions')
ON CONFLICT (permission_key) DO NOTHING;

-- Grant to super_admin, head_hr, and hr_manager roles if roles exist
DO $$
DECLARE
    v_perm_read_id UUID;
    v_perm_write_id UUID;
    v_perm_admin_id UUID;
    v_role_record RECORD;
BEGIN
    SELECT id INTO v_perm_read_id FROM public.permissions WHERE permission_key = 'inventory:read';
    SELECT id INTO v_perm_write_id FROM public.permissions WHERE permission_key = 'inventory:write';
    SELECT id INTO v_perm_admin_id FROM public.permissions WHERE permission_key = 'inventory:admin';

    FOR v_role_record IN SELECT id, role_name FROM public.roles WHERE role_name IN ('super_admin', 'head_hr', 'hr_manager', 'hr_executive') LOOP
        IF v_perm_read_id IS NOT NULL THEN
            INSERT INTO public.role_permissions (role_id, permission_id) VALUES (v_role_record.id, v_perm_read_id) ON CONFLICT DO NOTHING;
        END IF;
        IF v_perm_write_id IS NOT NULL THEN
            INSERT INTO public.role_permissions (role_id, permission_id) VALUES (v_role_record.id, v_perm_write_id) ON CONFLICT DO NOTHING;
        END IF;
        IF v_role_record.role_name IN ('super_admin', 'head_hr', 'hr_manager') AND v_perm_admin_id IS NOT NULL THEN
            INSERT INTO public.role_permissions (role_id, permission_id) VALUES (v_role_record.id, v_perm_admin_id) ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;
END $$;
