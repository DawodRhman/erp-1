-- Up Migration
ALTER TABLE public.quotations ADD COLUMN email_error_code VARCHAR(80);

UPDATE public.quotations SET email_error_code = 'SMTP_NOT_CONFIGURED'
WHERE email_delivery_status = 'FAILED' AND email_error IN (
  'Email is not configured. Set SMTP_HOST, SMTP_PORT and SMTP_FROM on the backend.',
  'SMTP username and app-password are mandatory on the backend.'
);
UPDATE public.quotations SET email_error_code = 'PUBLIC_URL_NOT_CONFIGURED'
WHERE email_delivery_status = 'FAILED' AND email_error IN (
  'Set PUBLIC_APP_URL to the frontend URL that clients can open.',
  'Client emails need a public HTTPS frontend URL, not localhost.'
);

-- Down Migration
ALTER TABLE public.quotations DROP COLUMN email_error_code;
