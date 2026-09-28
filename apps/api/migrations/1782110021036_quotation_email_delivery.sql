-- Up Migration
ALTER TABLE public.quotations
  ADD COLUMN email_delivery_status VARCHAR(20) NOT NULL DEFAULT 'NOT_SENT'
    CHECK (email_delivery_status IN ('NOT_SENT', 'SENDING', 'SENT', 'FAILED')),
  ADD COLUMN email_attempted_at TIMESTAMPTZ,
  ADD COLUMN email_sent_at TIMESTAMPTZ,
  ADD COLUMN email_recipient TEXT,
  ADD COLUMN email_message_id TEXT,
  ADD COLUMN email_error TEXT;

-- Down Migration
ALTER TABLE public.quotations
  DROP COLUMN email_error,
  DROP COLUMN email_message_id,
  DROP COLUMN email_recipient,
  DROP COLUMN email_sent_at,
  DROP COLUMN email_attempted_at,
  DROP COLUMN email_delivery_status;
