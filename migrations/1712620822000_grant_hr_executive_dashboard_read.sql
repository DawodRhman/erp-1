-- Up Migration
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.permission_key = 'dashboard:read'
WHERE r.role_name = 'hr_executive'
ON CONFLICT DO NOTHING;

-- Down Migration
DELETE FROM public.role_permissions rp
USING public.roles r, public.permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.role_name = 'hr_executive'
  AND p.permission_key = 'dashboard:read';
