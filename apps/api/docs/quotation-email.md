# Quotation Email and Client Approval

Set these values in the backend `.env` (never commit passwords):

```dotenv
PUBLIC_APP_URL=https://your-public-frontend.example.com
SMTP_HOST=smtp.your-provider.example
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-sender-email
SMTP_PASS=your-provider-app-password
SMTP_FROM=your-sender-email
SMTP_REPLY_TO=your-contact-email
SMTP_ALLOW_LOCAL=false
```

Use port 465 with `SMTP_SECURE=true` when your provider requires implicit TLS.
Port 587 requires STARTTLS. Certificate validation stays enabled.
The public frontend must serve `/client/quotations/:token` and connect to this backend.
Do not use localhost in emails to external clients; localhost refers to their own device.

Generate & Send saves the quotation and sends its items, totals and no-login approval link through SMTP.
Drafts are not emailed. Failed sends stay saved with an error and can be retried from quotation detail.
Missing SMTP/public-URL setup is shown as a neutral manual-link handoff, not a red user error.
The email error code stays persisted for audit/troubleshooting; the UI does not claim an email was sent.
Retry/resend is hidden for setup-pending quotations and becomes available after configuration is completed.
Actual recipient/authentication/connection failures remain visible with a retry action.
Successful SMTP submission is not proof of inbox placement or reading; check the test recipient's inbox/spam.
Client approval/rejection is written to PostgreSQL and audited in the same transaction.
Repeated identical decisions are safe; conflicting decisions and draft/expired approvals are rejected.
CRM quotation list/detail check for updates every two seconds while visible and on tab focus.
Backend/network response time is additional; this is not a two-second inbox-delivery guarantee.

Summary of tests: service tests use an actual local SMTP connection with mocked database persistence.
A real-provider acceptance and client-inbox test requires configured SMTP and an authorized test address.

The frontend script `scripts/verify-quotation-email.mjs` additionally uses the configured PostgreSQL database,
an isolated backend and local SMTP server, and browser clicks. It verifies Generate & Send, client approval
on mobile, CRM auto-refresh, rejection, SMTP failure/retry and database/audit persistence.
It removes only its own QA clients/quotations afterward and retains immutable audit records.
Run it from the frontend with `node scripts/verify-quotation-email.mjs`.
This is a local email-capture test, not a real client-inbox delivery test.
