-- Up Migration
ALTER TABLE public.activity_logs 
ADD COLUMN private_ip_address inet,
ADD COLUMN hostname varchar(255);

CREATE INDEX idx_activity_logs_private_ip ON public.activity_logs(private_ip_address);
CREATE INDEX idx_activity_logs_hostname ON public.activity_logs(hostname);

-- Down Migration
DROP INDEX IF EXISTS idx_activity_logs_hostname;
DROP INDEX IF EXISTS idx_activity_logs_private_ip;
ALTER TABLE public.activity_logs DROP COLUMN IF EXISTS hostname;
ALTER TABLE public.activity_logs DROP COLUMN IF EXISTS private_ip_address;