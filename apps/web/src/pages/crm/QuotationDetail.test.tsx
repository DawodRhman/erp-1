import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ get: vi.fn(), send: vi.fn(), toast: vi.fn() }));
vi.mock('../../context/ToastContext', () => ({ useToastContext: () => ({ showToast: mocks.toast }) }));
vi.mock('./crmApi', async (original) => ({ ...await original<typeof import('./crmApi')>(),
  crmApi: { getQuotation: mocks.get, sendQuotationEmail: mocks.send } }));
import QuotationDetail from './QuotationDetail';
const quote = { id: 'quote-1', status: 'SENT', quotation_number: 'QT-TEST', customer_name: 'Test Client',
  customer_email: 'client@example.test', email_delivery_status: 'FAILED', email_error_code: 'EMAIL_SEND_FAILED', email_error: 'SMTP authentication failed.',
  client_approval_token: 'token', items: [{ id: 'item-1', description: 'Camera', quantity: 1, unit_price: 100 }] };
function open() {
  render(<MemoryRouter initialEntries={['/crm/quotations/quote-1']}><Routes>
    <Route path='/crm/quotations/:id' element={<QuotationDetail />} />
  </Routes></MemoryRouter>);
}
beforeEach(() => { vi.clearAllMocks(); mocks.get.mockResolvedValue(quote); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
describe('quotation email and refresh UI', () => {
  it('shows a persistent email failure and retries through the backend', async () => {
    mocks.send.mockResolvedValue({ ...quote, email_delivery_status: 'SENT', email_recipient: quote.customer_email, email_error: null });
    open(); await screen.findByText('Email not sent: SMTP authentication failed.');
    fireEvent.click(screen.getByText('Retry Email'));
    await screen.findByText(/Email submitted to client@example.test/);
    expect(mocks.send).toHaveBeenCalledWith('quote-1');
    expect(mocks.toast).toHaveBeenCalledWith(expect.stringContaining('client@example.test'), 'success');
  });
  it('offers manual sharing without a red error or retry button when email setup is pending', async () => {
    mocks.get.mockResolvedValue({ ...quote, email_error_code: 'SMTP_NOT_CONFIGURED' });
    open();
    const notice = await screen.findByText('Share the client approval link manually. Automatic email setup is pending.');
    expect(notice.style.color).toBe('rgb(71, 85, 105)');
    expect(screen.queryByText('Retry Email')).toBeNull();
    expect(screen.queryByText('Resend')).toBeNull();
    expect(screen.getByText('Copy Client Link')).toBeTruthy();
  });
  it('restores retry after the server email configuration is completed', async () => {
    mocks.get.mockResolvedValue({ ...quote, email_error_code: 'SMTP_NOT_CONFIGURED', email_configured: true });
    open();
    await screen.findByText('Retry Email');
    expect(screen.queryByText('Share the client approval link manually. Automatic email setup is pending.')).toBeNull();
  });
  it('refreshes the persisted approval every two seconds without a page reload', async () => {
    vi.useFakeTimers();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    await act(async () => { open(); });
    expect(screen.getByText('Retry Email')).toBeTruthy();
    mocks.get.mockResolvedValue({ ...quote, status: 'APPROVED', client_approved_at: '2026-09-18' });
    await act(async () => { await vi.advanceTimersByTimeAsync(1999); });
    expect(mocks.get).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(mocks.get).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Convert to Order')).toBeTruthy();
    expect(screen.queryByText('Retry Email')).toBeNull();
    vi.restoreAllMocks();
  });
});
