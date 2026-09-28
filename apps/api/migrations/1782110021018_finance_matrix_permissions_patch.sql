-- Patch: ensure finance and matrix permissions exist for dedicated ERP roles.

INSERT INTO public.permissions (permission_key, description)
VALUES
  ('accounts:read', 'Can read invoice templates, invoices, billing, and finance ledgers'),
  ('accounts:write', 'Can create invoice templates, invoices, billing updates, and finance approvals'),
  ('matrix:sales', 'Can access CRM and sales matrix operations'),
  ('matrix:operations', 'Can access inventory operations and stock-out matrix operations'),
  ('matrix:field_service', 'Can access installer and field-service matrix operations'),
  ('matrix:finance', 'Can access finance reconciliation and billing matrix operations')
ON CONFLICT (permission_key) DO NOTHING;

DO $$
DECLARE
  v_fin_role UUID;
  v_dual_role UUID;
  v_perm UUID;
BEGIN
  SELECT id INTO v_fin_role FROM public.roles WHERE role_name = 'finance_officer';
  SELECT id INTO v_dual_role FROM public.roles WHERE role_name = 'inv_fin_admin';

  IF v_fin_role IS NOT NULL THEN
    FOR v_perm IN
      SELECT id
      FROM public.permissions
      WHERE permission_key IN ('accounts:read', 'accounts:write', 'matrix:finance', 'inventory:read')
    LOOP
      INSERT INTO public.role_permissions (role_id, permission_id)
      VALUES (v_fin_role, v_perm)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  IF v_dual_role IS NOT NULL THEN
    FOR v_perm IN
      SELECT id
      FROM public.permissions
      WHERE permission_key IN (
        'inventory:read',
        'inventory:write',
        'inventory:admin',
        'accounts:read',
        'accounts:write',
        'matrix:operations',
        'matrix:finance'
      )
    LOOP
      INSERT INTO public.role_permissions (role_id, permission_id)
      VALUES (v_dual_role, v_perm)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;
