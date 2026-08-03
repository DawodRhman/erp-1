import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MatrixOperations from './MatrixOperations';
import { matrixApi } from '../services/matrixService';

vi.mock('../services/matrixService', () => ({
  matrixApi: {
    getLeads: vi.fn(),
    getQuotations: vi.fn(),
    getProjects: vi.fn(),
    getPurchaseRequisitions: vi.fn(),
    getServiceTickets: vi.fn(),
    getVirtualDebts: vi.fn(),
    activateProject: vi.fn(),
    verifyOTP: vi.fn(),
  },
}));

vi.mock('../services/inventoryService', () => ({
  inventoryApi: {
    getCustomers: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ activeRole: 'super_admin', user: { role: 'super_admin' } }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('MatrixOperations Page (Blueprint V2.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(matrixApi.getLeads).mockResolvedValue([
      { id: 'l-1', lead_number: 'LEAD-101', title: '50 GPS Trackers Fleet', estimated_value: 750000, status: 'NEW', created_at: '' },
    ]);
    vi.mocked(matrixApi.getQuotations).mockResolvedValue([
      { id: 'q-1', quotation_number: 'QT-101', quotation_type: 'PRODUCT', total_amount: 750000, status: 'DRAFT', created_at: '' },
    ]);
    vi.mocked(matrixApi.getProjects).mockResolvedValue([]);
    vi.mocked(matrixApi.getPurchaseRequisitions).mockResolvedValue([]);
    vi.mocked(matrixApi.getServiceTickets).mockResolvedValue([
      { id: 't-1', ticket_number: 'TCK-201', complaint_type: 'DEVICE_OFFLINE', status: 'OTP_PENDING', otp_verified: false, created_at: '' },
    ]);
    vi.mocked(matrixApi.getVirtualDebts).mockResolvedValue([]);
  });

  it('renders Matrix Control header and Phase 1 Leads', async () => {
    render(<MatrixOperations />);

    expect(await screen.findByText('TRACK360 ERP — Matrix Operational Control')).toBeTruthy();
    expect(await screen.findByText('50 GPS Trackers Fleet')).toBeTruthy();
  });

  it('switches to Digital OTP Handshake phase tab', async () => {
    render(<MatrixOperations />);

    const handshakeTab = await screen.findByRole('button', { name: /Phase 4: Digital OTP Handshake/i });
    fireEvent.click(handshakeTab);

    expect(await screen.findByText('TCK-201')).toBeTruthy();
    expect(await screen.findByRole('button', { name: /Enter Customer OTP Code/i })).toBeTruthy();
  });
});
