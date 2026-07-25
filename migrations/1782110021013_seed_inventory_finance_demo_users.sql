-- Migration: Seed Dedicated Demo Users for Inventory, Finance, and Joint Access

INSERT INTO public.roles (role_name, description)
VALUES 
  ('inventory_officer', 'Inventory Officer — Catalog, Stock Tracking, PO, Invoices'),
  ('finance_officer', 'Finance Officer — Accounts, Billing, Reconciliation, Virtual Debt'),
  ('inv_fin_admin', 'Inventory & Finance Admin — Dual Access to Inventory and Finance')
ON CONFLICT (role_name) DO UPDATE SET description = EXCLUDED.description;

-- Insert / Upsert Users with Verified Bcrypt Hashed Passwords into 'password' and 'password_hash'
INSERT INTO public.users (employee_id, email, role_id, password, password_hash, username, is_active, must_change_password)
VALUES 
  (
    'EMP901',
    'inventory.officer@esspl.com.pk',
    (SELECT id FROM public.roles WHERE role_name = 'inventory_officer'),
    '$2b$12$ifKD23z.FfCP.SUGgFPoY.FaZZ.fpl/aUtl7Ts6SklAZwUgnXJ6R6',
    '$2b$12$ifKD23z.FfCP.SUGgFPoY.FaZZ.fpl/aUtl7Ts6SklAZwUgnXJ6R6',
    'Inventory Officer',
    TRUE,
    FALSE
  ),
  (
    'EMP902',
    'finance.officer@esspl.com.pk',
    (SELECT id FROM public.roles WHERE role_name = 'finance_officer'),
    '$2b$12$vn4JWiKmmE7fh4.iQoCO2eq80HAtkdaMeCi7oXlvK4nL0kTMN3mb6',
    '$2b$12$vn4JWiKmmE7fh4.iQoCO2eq80HAtkdaMeCi7oXlvK4nL0kTMN3mb6',
    'Finance Officer',
    TRUE,
    FALSE
  ),
  (
    'EMP903',
    'inv.fin.admin@esspl.com.pk',
    (SELECT id FROM public.roles WHERE role_name = 'inv_fin_admin'),
    '$2b$12$Pb0BUsF1BlruM1r.vFb9Mu7VHk9JvGPl1jWMoIQt3hvRrvWMoyzx6',
    '$2b$12$Pb0BUsF1BlruM1r.vFb9Mu7VHk9JvGPl1jWMoIQt3hvRrvWMoyzx6',
    'Inventory & Finance Admin',
    TRUE,
    FALSE
  )
ON CONFLICT (email) DO UPDATE 
SET role_id = EXCLUDED.role_id,
    password = EXCLUDED.password,
    password_hash = EXCLUDED.password_hash,
    is_active = TRUE,
    must_change_password = FALSE;

-- Grant Permissions
DO $$
DECLARE
    v_inv_role UUID;
    v_fin_role UUID;
    v_dual_role UUID;
    v_perm_rec RECORD;
BEGIN
    SELECT id INTO v_inv_role FROM public.roles WHERE role_name = 'inventory_officer';
    SELECT id INTO v_fin_role FROM public.roles WHERE role_name = 'finance_officer';
    SELECT id INTO v_dual_role FROM public.roles WHERE role_name = 'inv_fin_admin';

    -- Inventory Officer permissions
    FOR v_perm_rec IN SELECT id FROM public.permissions WHERE permission_key LIKE 'inventory:%' OR permission_key = 'matrix:operations' LOOP
        IF v_inv_role IS NOT NULL THEN
            INSERT INTO public.role_permissions (role_id, permission_id) VALUES (v_inv_role, v_perm_rec.id) ON CONFLICT DO NOTHING;
        END IF;
        IF v_dual_role IS NOT NULL THEN
            INSERT INTO public.role_permissions (role_id, permission_id) VALUES (v_dual_role, v_perm_rec.id) ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;

    -- Finance Officer permissions
    FOR v_perm_rec IN SELECT id FROM public.permissions WHERE permission_key LIKE 'accounts:%' OR permission_key = 'matrix:finance' LOOP
        IF v_fin_role IS NOT NULL THEN
            INSERT INTO public.role_permissions (role_id, permission_id) VALUES (v_fin_role, v_perm_rec.id) ON CONFLICT DO NOTHING;
        END IF;
        IF v_dual_role IS NOT NULL THEN
            INSERT INTO public.role_permissions (role_id, permission_id) VALUES (v_dual_role, v_perm_rec.id) ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;
END $$;
