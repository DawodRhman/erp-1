import { describe, expect, it } from 'vitest';
import { CrmQuotation, quotationDeliveryNotice } from './crmApi';

const quote = { id: 'q1', status: 'SENT', email_delivery_status: 'FAILED', email_error_code: 'SMTP_NOT_CONFIGURED' } as CrmQuotation;
describe('quotation send feedback', () => {
  it('confirms saving and manual sharing without claiming an email was sent', () => {
    const notice = quotationDeliveryNotice(quote);
    expect(notice.type).toBe('success');
    expect(notice.message).toContain('Quotation saved. Copy Client Link');
    expect(notice.message).not.toContain('email submitted');
  });
  it('keeps real send failures visible', () => {
    const notice = quotationDeliveryNotice({ ...quote, email_error_code: 'EMAIL_SEND_FAILED', email_error: 'Server rejected recipient.' });
    expect(notice.type).toBe('error');
    expect(notice.message).toContain('Server rejected recipient.');
  });
});
