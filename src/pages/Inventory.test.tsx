import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Inventory from './Inventory';
import { inventoryApi } from '../services/inventoryService';

vi.mock('../services/inventoryService', () => ({
  inventoryApi: {
    getSummary: vi.fn(),
    getCategories: vi.fn(),
    getProducts: vi.fn(),
    getItems: vi.fn(),
    getVendors: vi.fn(),
    getCustomers: vi.fn(),
    getPurchaseOrders: vi.fn(),
    getInvoices: vi.fn(),
    getInstallations: vi.fn(),
    getComplaints: vi.fn(),
    createProduct: vi.fn(),
    createCategory: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Inventory Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(inventoryApi.getSummary).mockResolvedValue({
      total_products: 15,
      low_stock_count: 3,
      total_inventory_value: 120000,
      total_serials: 45,
      available_serials: 30,
      allocated_serials: 5,
      installed_serials: 8,
      damaged_serials: 2,
      total_pos: 4,
      total_invoices: 10,
      pending_installations: 2,
      active_complaints: 1,
    });
    vi.mocked(inventoryApi.getCategories).mockResolvedValue([
      { id: 'cat-1', category_name: 'GPS Trackers', product_count: 5 },
    ]);
    vi.mocked(inventoryApi.getProducts).mockResolvedValue([
      {
        id: 'p-1',
        product_name: 'Tracker GT-500',
        category_id: 'cat-1',
        category_name: 'GPS Trackers',
        product_type: 'ASSET',
        tracking_type: 'SERIAL',
        quantity: 12,
        min_stock_level: 5,
        unit_price: 15000,
        cost_price: 12000,
      },
      {
        id: 'p-2',
        product_name: 'Relay 12V',
        category_name: 'Accessories',
        product_type: 'CONSUMABLE',
        tracking_type: 'NONE',
        quantity: 2,
        min_stock_level: 10,
        unit_price: 500,
        cost_price: 300,
      },
    ]);
    vi.mocked(inventoryApi.getItems).mockResolvedValue([]);
    vi.mocked(inventoryApi.getVendors).mockResolvedValue([]);
    vi.mocked(inventoryApi.getCustomers).mockResolvedValue([]);
    vi.mocked(inventoryApi.getPurchaseOrders).mockResolvedValue([]);
    vi.mocked(inventoryApi.getInvoices).mockResolvedValue([]);
    vi.mocked(inventoryApi.getInstallations).mockResolvedValue([]);
    vi.mocked(inventoryApi.getComplaints).mockResolvedValue([]);
  });

  it('renders header, KPI metrics, and low stock warnings', async () => {
    render(<Inventory />);

    expect(await screen.findByText('Inventory & Invoicing Management')).toBeTruthy();
    expect(await screen.findByText('15')).toBeTruthy(); // Total products count
    expect(await screen.findByText('Low Stock & Reorder Alerts')).toBeTruthy();
  });

  it('switches tabs and displays product catalog', async () => {
    render(<Inventory />);

    const productsTab = await screen.findByRole('button', { name: /Products \(2\)/i });
    fireEvent.click(productsTab);

    expect(await screen.findByText('Tracker GT-500')).toBeTruthy();
    expect(await screen.findByText('Relay 12V')).toBeTruthy();
  });

  it('filters products by search input', async () => {
    render(<Inventory />);

    const productsTab = await screen.findByRole('button', { name: /Products \(2\)/i });
    fireEvent.click(productsTab);

    const searchInput = screen.getByPlaceholderText('Search products...');
    fireEvent.change(searchInput, { target: { value: 'Relay' } });

    expect(screen.getByText('Relay 12V')).toBeTruthy();
    expect(screen.queryByText('Tracker GT-500')).toBeNull();
  });

  it('opens add product modal from button', async () => {
    render(<Inventory />);

    const createBtn = await screen.findByRole('button', { name: /\+ New Product/i });
    fireEvent.click(createBtn);

    expect(await screen.findByText('Create New Catalog Product')).toBeTruthy();
  });
});
