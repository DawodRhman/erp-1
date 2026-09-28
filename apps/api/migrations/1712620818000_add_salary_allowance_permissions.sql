-- Up Migration
INSERT INTO public.permissions (permission_key, description) VALUES
('salary:read', 'Read employee salary information'),
('salary:write', 'Create and manage employee salary revisions'),
('allowances:read', 'Read employee allowances'),
('allowances:write', 'Create and manage employee allowances')
ON CONFLICT (permission_key) DO NOTHING;

-- Down Migration
DELETE FROM public.permissions
WHERE permission_key IN ('salary:read', 'salary:write', 'allowances:read', 'allowances:write');
