import nodemailer from 'nodemailer';
import { z } from 'zod';
import pool from '../../config/db.js';
import { AppError } from '../../utils/errors.js';
import { recordActivityLog } from '../audit/audit.service.js';
import { getQuotationById } from './crm.service.js';

const mailbox = z.string().trim().email();
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

export function quotationMailConfig(env = process.env) {
  const host = String(env.SMTP_HOST || '').trim();
  const port = Number(env.SMTP_PORT || 587);
  const from = mailbox.safeParse(env.SMTP_FROM || env.SMTP_USER || '');
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !from.success) {
    throw new AppError(503, 'SMTP_NOT_CONFIGURED', 'Email is not configured. Set SMTP_HOST, SMTP_PORT and SMTP_FROM on the backend.');
  }
  const localTest = env.NODE_ENV !== 'production' && env.SMTP_ALLOW_LOCAL === 'true'
    && ['127.0.0.1', 'localhost', '::1'].includes(host);
  if (!localTest && (!env.SMTP_USER || !env.SMTP_PASS)) {
    throw new AppError(503, 'SMTP_NOT_CONFIGURED', 'SMTP username and app-password are mandatory on the backend.');
  }
  let base;
  try { base = new URL(env.PUBLIC_APP_URL); } catch {
    throw new AppError(503, 'PUBLIC_URL_NOT_CONFIGURED', 'Set PUBLIC_APP_URL to the frontend URL that clients can open.');
  }
  const localUrl = ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname);
  if (base.username || base.password || base.search || base.hash
    || !(base.protocol === 'https:' || (localTest && localUrl && base.protocol === 'http:'))
    || (localUrl && !localTest)) {
    throw new AppError(503, 'PUBLIC_URL_NOT_CONFIGURED', 'Client emails need a public HTTPS frontend URL, not localhost.');
  }
  const secure = env.SMTP_SECURE === 'true' || port === 465;
  return {
    from: { name: 'ESSPL', address: from.data },
    replyTo: env.SMTP_REPLY_TO ? mailbox.parse(env.SMTP_REPLY_TO) : undefined,
    baseUrl: base.toString().replace(/\/$/, ''),
    transport: {
      host, port, secure,
      requireTLS: !localTest && !secure,
      ...(localTest ? {} : { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } }),
      connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000,
      disableFileAccess: true, disableUrlAccess: true,
    },
  };
}

export function quotationEmailConfigured() {
  try { quotationMailConfig(); return true; } catch { return false; }
}

export function quotationEmailMessage(quote, config) {
  const recipient = mailbox.safeParse(quote.customer_email || '');
  if (!recipient.success) throw new AppError(422, 'CLIENT_EMAIL_MISSING', 'Save a valid client email before sending this quotation.');
  if (!quote.client_approval_token) throw new AppError(409, 'APPROVAL_LINK_MISSING', 'Client approval link is unavailable.');
  const link = `${config.baseUrl}/client/quotations/${encodeURIComponent(quote.client_approval_token)}`;
  const money = (value) => `PKR ${Number(value || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
  const number = String(quote.quotation_number || 'Quotation').replace(/[\r\n]/g, '');
  const lines = (quote.items || []).map((item) => `${item.description || item.product_name}: ${item.quantity} x ${money(item.unit_price)}`);
  return {
    from: config.from, to: recipient.data, replyTo: config.replyTo,
    subject: `ESSPL | ${number} - Review and approval`,
    text: [`Dear ${quote.customer_name || 'Client'},`, '', `Please review quotation ${number}.`, ...lines,
      `Subtotal: ${money(quote.subtotal)}`, `GST: ${money(quote.tax_amount)}`, `Total: ${money(quote.total_amount)}`,
      '', `Review, approve or reject: ${link}`, '', quote.terms || '', '', 'Electronic Safety & Security (Pvt.) Ltd.'].join('\n'),
    html: `<div style="font-family:Arial,sans-serif;max-width:640px;color:#172033"><h2>ESSPL Quotation</h2>
      <p>Dear ${escapeHtml(quote.customer_name || 'Client')},</p><p>Please review <strong>${escapeHtml(number)}</strong>.</p>
      <ul>${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>
      <p>Subtotal: ${escapeHtml(money(quote.subtotal))}<br>GST: ${escapeHtml(money(quote.tax_amount))}<br>
      <strong>Total: ${escapeHtml(money(quote.total_amount))}</strong></p>
      <p><a href="${escapeHtml(link)}" style="display:inline-block;padding:14px 20px;background:#2563eb;color:white;text-decoration:none;border-radius:6px">Review Quotation</a></p>
      <p>${escapeHtml(quote.terms || '')}</p><p>Electronic Safety &amp; Security (Pvt.) Ltd.</p></div>`,
  };
}

function safeEmailError(error) {
  if (error instanceof AppError) return error.message;
  if (error.code === 'EAUTH') return 'SMTP authentication failed. Check the sender account and app-password.';
  if (error.code === 'EENVELOPE') return 'The mail server rejected the sender or client email address.';
  if (error.code === 'ETLS' || error.code === 'ESOCKET') return 'SMTP connection or TLS failed. Check the server settings.';
  return 'Email could not be sent. Check SMTP connectivity and retry from the quotation.';
}

async function saveDelivery(id, status, recipient, messageId, error, actorId, errorCode = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`UPDATE public.quotations SET email_delivery_status = $2::varchar, email_recipient = $3,
      email_message_id = $4, email_error = $5, email_error_code = $6,
      email_sent_at = CASE WHEN $2::varchar = 'SENT' THEN NOW() ELSE email_sent_at END,
      updated_at = NOW() WHERE id = $1`, [id, status, recipient, messageId, error, errorCode]);
    await recordActivityLog({ userId: actorId, action: `QUOTATION_EMAIL_${status}`, entityType: 'quotations',
      entityId: id, meta: { recipient, delivery_status: status, error_code: errorCode }, db: client });
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
}

export async function sendQuotationEmail(id, { resend = false, actorId = null } = {}) {
  const quote = await getQuotationById(id);
  if (quote.status !== 'SENT') throw new AppError(409, 'QUOTATION_NOT_SENDABLE', 'Only a sent quotation awaiting client approval can be emailed.');
  if (!resend && quote.email_delivery_status === 'SENT') return quote;
  const claimed = await pool.query(`UPDATE public.quotations SET email_delivery_status = 'SENDING',
    email_attempted_at = NOW(), email_error = NULL, email_error_code = NULL
    WHERE id = $1 AND status = 'SENT'
      AND (email_delivery_status <> 'SENDING' OR email_attempted_at < NOW() - INTERVAL '2 minutes')
      AND ($2::boolean OR email_delivery_status <> 'SENT') RETURNING id`, [id, resend]);
  if (!claimed.rows.length) {
    const current = await getQuotationById(id);
    if (!resend && current.email_delivery_status === 'SENT') return current;
    throw new AppError(409, 'EMAIL_IN_PROGRESS', 'Email sending is already in progress. Please wait before retrying.');
  }
  let info;
  let message;
  try {
    const config = quotationMailConfig();
    message = quotationEmailMessage(quote, config);
    const transport = nodemailer.createTransport(config.transport);
    try { info = await transport.sendMail(message); } finally { transport.close(); }
    if (!info.accepted?.some((address) => String(address).toLowerCase() === message.to.toLowerCase())) {
      throw new AppError(502, 'RECIPIENT_REJECTED', 'The mail server did not accept the client email address.');
    }
  } catch (err) {
    const error = safeEmailError(err);
    const errorCode = err instanceof AppError ? err.code : 'EMAIL_SEND_FAILED';
    await saveDelivery(id, 'FAILED', message?.to || null, null, error, actorId, errorCode);
    return { ...await getQuotationById(id), email_delivery: { status: 'FAILED', message: error, code: errorCode } };
  }
  // SMTP acceptance and inbox delivery are different; do not claim that the client has read it.
  await saveDelivery(id, 'SENT', message.to, info.messageId, null, actorId);
  return { ...await getQuotationById(id), email_delivery: { status: 'SENT', recipient: message.to } };
}
