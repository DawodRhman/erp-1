import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ get: vi.fn(), approval: vi.fn(), approve: vi.fn(), list: vi.fn(), toast: vi.fn() }));
vi.mock('../../context/ToastContext', () => ({ useToastContext: () => ({ showToast: mocks.toast }) }));
vi.mock('../../services/financeService', () => ({ financeService: { getInvoice: mocks.get, getBillingApproval: mocks.approval, approveBillingApproval: mocks.approve, getInvoices: mocks.list } }));
import { BillingApprovalDetail, FinanceInvoiceDetail, FinanceInvoices } from './FinancePages';
const invoice = { id: 'invoice-1', invoice_number: 'INV-TEST', customer_name: 'Test Client', status: 'ISSUED', approval_status: 'APPROVED', invoice_date: '2026-09-18', subtotal: 100, tax_amount: 18, total_amount: 118,
  notes_json: { invoice_format: 'hbl_single', prepared_by: '88e40e32-f59a-468b-a49c-43c07cf75557' },
  items: [{ description: 'Camera', quantity: 1, unit_price: 100, total_without_tax: 100, tax_amount: 18, total_with_tax: 118 }] };
function open(path: string) {
  return render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path='/finance/billing-approvals/:id' element={<BillingApprovalDetail />} />
    <Route path='/finance/invoices/view/:id' element={<FinanceInvoiceDetail />} />
    <Route path='/finance/invoices' element={<FinanceInvoices />} />
  </Routes></MemoryRouter>);
}
beforeEach(() => { vi.clearAllMocks(); mocks.get.mockResolvedValue(invoice); mocks.approval.mockResolvedValue(invoice); mocks.approve.mockResolvedValue(invoice); mocks.list.mockResolvedValue([invoice]); });
afterEach(cleanup);
describe('finance dedicated invoice workflow', () => {
  it('keeps an approved bill review separate and opens its exact invoice', async () => {
    open('/finance/billing-approvals/invoice-1');
    await screen.findByText('Inventory Bill Detail');
    expect(screen.queryByText('Sale Tax Invoice')).toBeNull();
    expect(screen.queryByText('Approve & Generate Invoice')).toBeNull();
    expect(screen.queryByPlaceholderText('Rejection note for Inventory / CRM')).toBeNull();
    fireEvent.click(screen.getByText('View Invoice'));
    await screen.findByText('Sale Tax Invoice');
    expect(mocks.get).toHaveBeenCalledWith('invoice-1');
    expect(screen.getByText('Accounts department')).toBeTruthy();
    expect(screen.queryByText(invoice.notes_json.prepared_by)).toBeNull();
    expect(document.querySelectorAll('.hbl-sale-table tbody tr').length).toBe(2);
    expect(screen.getByText('Monthly Summary').getAttribute('href')).toContain('month=2026-09');
  });
  it('opens the full invoice page immediately after approval', async () => {
    mocks.approval.mockResolvedValue({ ...invoice, status: 'DRAFT', approval_status: 'PENDING' });
    open('/finance/billing-approvals/invoice-1');
    fireEvent.click(await screen.findByText('Approve & Generate Invoice'));
    await screen.findByText('Sale Tax Invoice');
    expect(mocks.approve).toHaveBeenCalledWith('invoice-1', { expense_type: 'operational_expenses', invoice_format: 'hbl_single' });
  });
  it('shows only the invoice ledger until View is clicked', async () => {
    open('/finance/invoices');
    await screen.findByText('INV-TEST');
    expect(screen.queryByText('Sale Tax Invoice')).toBeNull();
    fireEvent.click(screen.getByText('View'));
    await screen.findByText('Sale Tax Invoice');
  });
  it('uses the actual buyer in a summary-format invoice without HBL contact details or UUIDs', async () => {
    mocks.get.mockResolvedValue({ ...invoice, notes_json: { ...invoice.notes_json, invoice_format: 'hbl_summary' } });
    open('/finance/invoices/view/invoice-1');
    await screen.findByText('GENERAL SALE TAX INVOICE (GST)');
    expect(document.querySelector('.finance-invoice-header')?.textContent).toContain("Buyer's Name: Test Client");
    expect(screen.queryByText('Habib Bank Limited')).toBeNull();
    expect(screen.queryByText(invoice.notes_json.prepared_by)).toBeNull();
    expect(screen.getAllByText('Accounts department').length).toBe(1);
  });
});
