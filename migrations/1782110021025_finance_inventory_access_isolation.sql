-- Keep finance-only users inside the finance workspace.
-- They can read/create invoices through accounts permissions, but cannot browse raw inventory queues.

DELETE FROM public.role_permissions rp
USING public.roles r, public.permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.role_name = 'finance_officer'
  AND p.permission_key IN ('inventory:read', 'inventory:write', 'inventory:admin');
