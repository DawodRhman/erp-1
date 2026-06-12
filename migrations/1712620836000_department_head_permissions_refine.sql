-- Up Migration
INSERT INTO public.permissions (permission_key, description) VALUES
  ('leave:department_approve', 'Approve or reject leave in assigned department scope'),
  ('announcements:department_write', 'Write announcements in assigned department scope'),
  ('calendar:department_write', 'Write calendar events in assigned department scope')
ON CONFLICT (permission_key) DO NOTHING;

DELETE FROM public.role_permissions rp
USING public.roles r, public.permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.role_name = 'department_head'
  AND p.permission_key = 'leave:write';

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.permission_key IN (
  'config:read',
  'leave:department_approve',
  'announcements:department_write',
  'calendar:department_write'
)
WHERE r.role_name = 'department_head'
ON CONFLICT DO NOTHING;

-- Down Migration
DELETE FROM public.role_permissions rp
USING public.roles r, public.permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.role_name = 'department_head'
  AND p.permission_key IN (
    'config:read',
    'leave:department_approve',
    'announcements:department_write',
    'calendar:department_write'
  );

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.permission_key = 'leave:write'
WHERE r.role_name = 'department_head'
ON CONFLICT DO NOTHING;

DELETE FROM public.permissions WHERE permission_key IN (
  'leave:department_approve',
  'announcements:department_write',
  'calendar:department_write'
);
