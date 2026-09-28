import React from 'react';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ get: vi.fn(), approve: vi.fn(), reject: vi.fn() }));
vi.mock('./crmApi', () => ({ crmApi: { getPublicQuotation: mocks.get, approvePublicQuotation: mocks.approve, rejectPublicQuotation: mocks.reject } }));
import ClientQuotationApproval from './ClientQuotationApproval';
const quote = { id: 'quote-1', status: 'SENT', quotation_number: 'QT-TEST', customer_name: 'Test Client', total_amount: 118,
  items: [{ description: 'Camera', quantity: 1, unit_price: 100 }] };
function open() {
  render(<MemoryRouter initialEntries={['/client/quotations/token']}><Routes>
    <Route path='/client/quotations/:token' element={<ClientQuotationApproval />} />
  </Routes></MemoryRouter>);
}
beforeEach(() => { vi.clearAllMocks(); mocks.get.mockResolvedValue(quote); });
afterEach(cleanup);
describe('client approval page', () => {
  it('submits approval to the backend and shows a closed decision', async () => {
    mocks.approve.mockResolvedValue({ id: quote.id, status: 'APPROVED' });
    open(); fireEvent.click(await screen.findByText('I Accept This Offer'));
    await screen.findByText('This quotation is already approved.');
    expect(mocks.approve).toHaveBeenCalledWith('token', { client_name: 'Test Client' });
    expect(screen.queryByText('I Accept This Offer')).toBeNull();
  });
  it('shows a backend error without falsely marking approval successful', async () => {
    mocks.approve.mockRejectedValue({ response: { data: { error: { message: 'Decision already closed.' } } } });
    open(); fireEvent.click(await screen.findByText('I Accept This Offer'));
    expect((await screen.findByRole('alert')).textContent).toBe('Decision already closed.');
    expect(screen.queryByText('This quotation is already approved.')).toBeNull();
    await waitFor(() => expect((screen.getByText('I Accept This Offer') as HTMLButtonElement).disabled).toBe(false));
  });
  it('sends a rejection reason and closes the form', async () => {
    mocks.reject.mockResolvedValue({ id: quote.id, status: 'REJECTED' });
    open(); await screen.findByText('I Accept This Offer');
    fireEvent.change(screen.getByPlaceholderText('Only required if rejecting'), { target: { value: 'Revise the quantity' } });
    fireEvent.click(screen.getByText('Request Revision'));
    await screen.findByText('This quotation is already rejected.');
    expect(mocks.reject).toHaveBeenCalledWith('token', { rejection_reason: 'Revise the quantity' });
  });
});
