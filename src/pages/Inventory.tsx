import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Package,
  Layers,
  Barcode,
  ShoppingCart,
  Receipt,
  Users,
  Wrench,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  RefreshCw,
  TrendingUp,
  Box,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Trash2,
  Edit,
  Car,
  ShieldAlert,
  ArrowRightLeft,
} from 'lucide-react';
import {
  inventoryApi,
  InventorySummary,
  InventoryWorkQueueJob,
  ItemCategory,
  Product,
  InventoryItem,
  InventoryMovement,
  Vendor,
  Customer,
  CustomerVehicle,
  PurchaseOrder,
  Invoice,
  TrackerInstallation,
  CustomerComplaint,
} from '../services/inventoryService';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export default function Inventory() {
  const { activeRole } = useAuth();
  const mountedRef = useRef(true);
  const canOpenBilling =
    activeRole === 'super_admin' ||
    activeRole === 'finance_officer' ||
    activeRole === 'inv_fin_admin';

  const [activeTab, setActiveTab] = useState<
    'overview' | 'products' | 'serials' | 'ledger' | 'po' | 'invoices' | 'customers' | 'installations'
  >('overview');

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<CustomerVehicle[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [installations, setInstallations] = useState<TrackerInstallation[]>([]);
  const [complaints, setComplaints] = useState<CustomerComplaint[]>([]);
  const [workQueue, setWorkQueue] = useState<InventoryWorkQueueJob[]>([]);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedProductType, setSelectedProductType] = useState('');
  const [selectedTrackingType, setSelectedTrackingType] = useState('');
  const [selectedStockStatus, setSelectedStockStatus] = useState('');
  const [selectedSerialStatus, setSelectedSerialStatus] = useState('');
  const [selectedMovementType, setSelectedMovementType] = useState('');

  // Modals
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showAddSerialModal, setShowAddSerialModal] = useState(false);
  const [showPOModal, setShowPOModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showInstallationModal, setShowInstallationModal] = useState(false);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [showReplacementModal, setShowReplacementModal] = useState(false);
  const [showCustomerDraftModal, setShowCustomerDraftModal] = useState(false);
  const [selectedCustomerForDraft, setSelectedCustomerForDraft] = useState<Customer | null>(null);
  const [customerDraftData, setCustomerDraftData] = useState({
    payment_terms: 'NET30',
    default_discount_pct: 0,
    custom_notes: '',
    template_items: [] as Array<{ product_id?: string; item_description: string; quantity: number; unit_price: number }>,
  });

  // Form States
  const [newProduct, setNewProduct] = useState({
    product_name: '',
    category_id: '',
    product_type: 'ASSET' as const,
    tracking_type: 'SERIAL' as const,
    quantity: 0,
    min_stock_level: 5,
    unit_price: 0,
    cost_price: 0,
    description: '',
  });

  const [newCategory, setNewCategory] = useState({ category_name: '', description: '' });
  const [newSerial, setNewSerial] = useState({ product_id: '', serial_number: '', imei: '', location: '' });
  const [newCustomer, setNewCustomer] = useState({ customer_name: '', contact_person: '', email: '', phone: '', address: '' });
  const [newInstallation, setNewInstallation] = useState({ customer_id: '', vehicle_id: '', tracker_item_id: '', technician_name: '', notes: '' });
  const [newComplaint, setNewComplaint] = useState({ customer_id: '', tracker_item_id: '', complaint_type: 'DEVICE_OFFLINE', description: '' });
  const [newReplacement, setNewReplacement] = useState({ complaint_id: '', old_inventory_item_id: '', new_inventory_item_id: '', reason: '' });
  const [newPO, setNewPO] = useState({
    vendor_id: '',
    product_id: '',
    quantity: 1,
    unit_price: 0,
    order_date: new Date().toISOString().slice(0, 10),
    expected_delivery_date: '',
    notes: '',
  });

  const loadWithRetry = async <T,>(request: () => Promise<T>, fallback: T): Promise<T> => {
    try {
      return await request();
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 600));
      try {
        return await request();
      } catch {
        return fallback;
      }
    }
  };

  const loadData = async () => {
    if (!mountedRef.current) return;
    setLoading(true);
    try {
      const [sumRes, queueRes, catRes, prodRes, itemRes, movementRes, venRes, custRes, poRes, invRes, instRes, compRes] =
        await Promise.all([
          loadWithRetry(() => inventoryApi.getSummary(), summary),
          loadWithRetry(() => inventoryApi.getWorkQueue(), workQueue),
          loadWithRetry(() => inventoryApi.getCategories(), categories),
          loadWithRetry(() => inventoryApi.getProducts({ limit: 500 }), products),
          loadWithRetry(() => inventoryApi.getItems({ limit: 500 }), items),
          loadWithRetry(() => inventoryApi.getMovements({ limit: 300 }), movements),
          loadWithRetry(() => inventoryApi.getVendors(), vendors),
          loadWithRetry(() => inventoryApi.getCustomers(), customers),
          loadWithRetry(() => inventoryApi.getPurchaseOrders(), purchaseOrders),
          loadWithRetry(() => inventoryApi.getInvoices(), invoices),
          loadWithRetry(() => inventoryApi.getInstallations(), installations),
          loadWithRetry(() => inventoryApi.getComplaints(), complaints),
        ]);

      if (!mountedRef.current) return;
      setSummary(sumRes);
      setWorkQueue(queueRes);
      setCategories(catRes);
      setProducts(prodRes);
      setItems(itemRes);
      setMovements(movementRes);
      setVendors(venRes);
      setCustomers(custRes);
      setPurchaseOrders(poRes);
      setInvoices(invRes);
      setInstallations(instRes);
      setComplaints(compRes);
    } catch (err: any) {
      if (mountedRef.current) toast.error('Failed to load inventory data');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        !searchTerm ||
        p.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.category_name && p.category_name.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCat = !selectedCategory || p.category_id === selectedCategory;
      const matchesType = !selectedProductType || p.product_type === selectedProductType;
      const matchesTracking = !selectedTrackingType || p.tracking_type === selectedTrackingType;

      let matchesStock = true;
      if (selectedStockStatus === 'low_stock') matchesStock = p.quantity <= p.min_stock_level;
      else if (selectedStockStatus === 'out_of_stock') matchesStock = p.quantity === 0;
      else if (selectedStockStatus === 'in_stock') matchesStock = p.quantity > 0;

      return matchesSearch && matchesCat && matchesType && matchesTracking && matchesStock;
    });
  }, [products, searchTerm, selectedCategory, selectedProductType, selectedTrackingType, selectedStockStatus]);

  // Filtered Serials
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        (item.serial_number && item.serial_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.imei && item.imei.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.product_name && item.product_name.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = !selectedSerialStatus || item.current_status === selectedSerialStatus;
      return matchesSearch && matchesStatus;
    });
  }, [items, searchTerm, selectedSerialStatus]);

  const filteredMovements = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    return movements.filter((movement) => {
      const matchesSearch =
        !needle ||
        movement.product_name?.toLowerCase().includes(needle) ||
        movement.serial_number?.toLowerCase().includes(needle) ||
        movement.imei?.toLowerCase().includes(needle) ||
        movement.reference_type?.toLowerCase().includes(needle) ||
        movement.notes?.toLowerCase().includes(needle) ||
        movement.created_by_email?.toLowerCase().includes(needle);
      const matchesType = !selectedMovementType || movement.movement_type === selectedMovementType;
      return matchesSearch && matchesType;
    });
  }, [movements, searchTerm, selectedMovementType]);

  // Handlers
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.product_name.trim()) return toast.error('Product name is required');
    try {
      await inventoryApi.createProduct(newProduct);
      toast.success('Product created successfully!');
      setShowAddProductModal(false);
      setNewProduct({
        product_name: '',
        category_id: '',
        product_type: 'ASSET',
        tracking_type: 'SERIAL',
        quantity: 0,
        min_stock_level: 5,
        unit_price: 0,
        cost_price: 0,
        description: '',
      });
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error creating product');
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.category_name.trim()) return toast.error('Category name is required');
    try {
      await inventoryApi.createCategory(newCategory);
      toast.success('Category created successfully!');
      setShowAddCategoryModal(false);
      setNewCategory({ category_name: '', description: '' });
      loadData();
    } catch (err: any) {
      toast.error('Error creating category');
    }
  };

  const handleCreateSerial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSerial.product_id) return toast.error('Please select a product');
    try {
      await inventoryApi.createItem(newSerial);
      toast.success('Serial item logged!');
      setShowAddSerialModal(false);
      setNewSerial({ product_id: '', serial_number: '', imei: '', location: '' });
      loadData();
    } catch (err: any) {
      toast.error('Error creating serial item');
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.customer_name.trim()) return toast.error('Customer name is required');
    try {
      await inventoryApi.createCustomer(newCustomer);
      toast.success('Customer registered successfully!');
      setShowCustomerModal(false);
      setNewCustomer({ customer_name: '', contact_person: '', email: '', phone: '', address: '' });
      loadData();
    } catch (err: any) {
      toast.error('Error registering customer');
    }
  };

  const handleCreateInstallation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInstallation.customer_id) return toast.error('Please select a customer');
    try {
      await inventoryApi.createInstallation(newInstallation);
      toast.success('Tracker installation created!');
      setShowInstallationModal(false);
      setNewInstallation({ customer_id: '', vehicle_id: '', tracker_item_id: '', technician_name: '', notes: '' });
      loadData();
    } catch (err: any) {
      toast.error('Error creating installation');
    }
  };

  const handleCreateComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComplaint.customer_id) return toast.error('Customer is required');
    try {
      await inventoryApi.createComplaint(newComplaint);
      toast.success('Complaint ticket logged!');
      setShowComplaintModal(false);
      setNewComplaint({ customer_id: '', tracker_item_id: '', complaint_type: 'DEVICE_OFFLINE', description: '' });
      loadData();
    } catch (err: any) {
      toast.error('Error logging complaint');
    }
  };

  const handleCreateReplacement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReplacement.old_inventory_item_id || !newReplacement.new_inventory_item_id) {
      return toast.error('Select both current device and replacement device');
    }
    try {
      await inventoryApi.createReplacement(newReplacement);
      toast.success('Device replacement swap recorded!');
      setShowReplacementModal(false);
      setNewReplacement({ complaint_id: '', old_inventory_item_id: '', new_inventory_item_id: '', reason: '' });
      loadData();
    } catch (err: any) {
      toast.error('Error completing device swap');
    }
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPO.product_id) return toast.error('Please select a product for PO');
    try {
      await inventoryApi.createPurchaseOrder({
        vendor_id: newPO.vendor_id || null,
        order_date: newPO.order_date,
        expected_delivery_date: newPO.expected_delivery_date || null,
        notes: newPO.notes,
        items: [
          {
            product_id: newPO.product_id,
            quantity: newPO.quantity,
            unit_price: newPO.unit_price,
            remarks: newPO.expected_delivery_date ? `Expected delivery: ${newPO.expected_delivery_date}` : '',
          },
        ],
      });
      toast.success('Purchase order created successfully');
      setShowPOModal(false);
      setNewPO({
        vendor_id: '',
        product_id: '',
        quantity: 1,
        unit_price: 0,
        order_date: new Date().toISOString().slice(0, 10),
        expected_delivery_date: '',
        notes: '',
      });
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error creating purchase order');
    }
  };

  const handleOpenCustomerDraftModal = async (customer: Customer) => {
    setSelectedCustomerForDraft(customer);
    try {
      const draft = await inventoryApi.getCustomerInvoiceDraft(customer.id);
      setCustomerDraftData({
        payment_terms: draft.payment_terms || 'NET30',
        default_discount_pct: draft.default_discount_pct || 0,
        custom_notes: draft.custom_notes || '',
        template_items: Array.isArray(draft.template_items) ? draft.template_items : [],
      });
      setShowCustomerDraftModal(true);
    } catch (err) {
      toast.error('Failed to load customer draft template');
    }
  };

  const handleSaveCustomerDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerForDraft) return;
    try {
      await inventoryApi.updateCustomerInvoiceDraft(selectedCustomerForDraft.id, customerDraftData);
      toast.success(`Special Invoice Draft saved for ${selectedCustomerForDraft.customer_name}!`);
      setShowCustomerDraftModal(false);
    } catch (err) {
      toast.error('Failed to save customer draft template');
    }
  };

  const handleGenerateDraftInvoice = async (customer: Customer) => {
    try {
      const invoice = await inventoryApi.generateDraftInvoiceFromTemplate(customer.id);
      toast.success(`Official Draft Invoice ${invoice.invoice_number} spawned for ${customer.customer_name}!`);
      loadData();
      setActiveTab('invoices');
    } catch (err) {
      toast.error('Failed to generate draft invoice');
    }
  };

  const formatCurrency = (val?: number) => {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(val || 0);
  };

  const formatDate = (value?: string) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
  };

  const toolbarStyle: React.CSSProperties = {
    ...cardStyle,
    padding: '16px',
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  };

  const searchWrapStyle: React.CSSProperties = { position: 'relative', flex: '1 1 280px', minWidth: '240px' };
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#f8fafc',
    color: '#0f172a',
    fontSize: '13.5px',
    fontWeight: 600,
    outline: 'none',
    boxSizing: 'border-box',
  };
  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    width: 'auto',
    minWidth: '190px',
    cursor: 'pointer',
  };
  const tableWrapStyle: React.CSSProperties = { ...cardStyle, overflowX: 'auto', overflowY: 'hidden' };
  const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '920px' };
  const thStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '13px 14px',
    backgroundColor: '#f8fafc',
    color: '#64748b',
    textTransform: 'uppercase',
    fontSize: '11px',
    letterSpacing: '0.05em',
    borderBottom: '1px solid #e2e8f0',
  };
  const tdStyle: React.CSSProperties = { padding: '13px 14px', borderTop: '1px solid #f1f5f9', color: '#334155' };
  const primaryButtonStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px 14px',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#10b981',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 8px 18px rgba(16,185,129,0.18)',
    whiteSpace: 'nowrap',
  };
  const chipStyle = (tone: 'slate' | 'indigo' | 'emerald' | 'amber' | 'rose' = 'slate'): React.CSSProperties => {
    const colors = {
      slate: ['#f1f5f9', '#475569'],
      indigo: ['#eef2ff', '#4338ca'],
      emerald: ['#dcfce7', '#047857'],
      amber: ['#fef3c7', '#b45309'],
      rose: ['#ffe4e6', '#be123c'],
    } as const;
    return {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '5px 9px',
      borderRadius: '999px',
      backgroundColor: colors[tone][0],
      color: colors[tone][1],
      fontSize: '11px',
      fontWeight: 900,
      lineHeight: 1,
    };
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto', fontFamily: "'Outfit', sans-serif" }}>
      {/* Top Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          padding: '24px 32px',
          borderRadius: '16px',
          marginBottom: '24px',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          boxShadow: '0 8px 24px rgba(15,23,42,0.15)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ padding: '12px', backgroundColor: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(147, 197, 253, 0.3)', borderRadius: '12px' }}>
            <Package size={28} style={{ color: '#60a5fa' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0, letterSpacing: '-0.02em' }}>Inventory & Stock Logistics Management</h1>
            <p style={{ color: '#94a3b8', marginTop: '6px', fontSize: '14px' }}>
              Real-time warehouse catalog, serial/IMEI tracking, vendor stock-in, and installer field dispatch reconciliations.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={loadData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '10px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            onClick={() => setShowAddCategoryModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              backgroundColor: '#6366f1',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
            }}
          >
            <Layers size={16} /> + Category
          </button>
          <button
            onClick={() => setShowAddProductModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              backgroundColor: '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
            }}
          >
            <Plus size={16} /> + New Product
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Total Catalog Products</span>
            <div style={{ padding: '8px', backgroundColor: '#e0e7ff', color: '#4338ca', borderRadius: '10px' }}><Box size={20} /></div>
          </div>
          <div style={{ marginTop: '14px' }}>
            <span style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a' }}>{summary?.total_products || 0}</span>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Value: {formatCurrency(summary?.total_inventory_value)}</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Low Stock Warnings</span>
            <div style={{ padding: '8px', backgroundColor: '#fef3c7', color: '#b45309', borderRadius: '10px' }}><AlertTriangle size={20} /></div>
          </div>
          <div style={{ marginTop: '14px' }}>
            <span style={{ fontSize: '26px', fontWeight: '800', color: '#b45309' }}>{summary?.low_stock_count || 0}</span>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>At or below reorder minimums</div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Total Serials / IMEIs</span>
            <div style={{ padding: '8px', backgroundColor: '#dcfce7', color: '#15803d', borderRadius: '10px' }}><Barcode size={20} /></div>
          </div>
          <div style={{ marginTop: '14px' }}>
            <span style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a' }}>{summary?.total_serials || 0}</span>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              Available: <span style={{ fontWeight: '700', color: '#16a34a' }}>{summary?.available_serials || 0}</span> | Installed: <span style={{ fontWeight: '700', color: '#2563eb' }}>{summary?.installed_serials || 0}</span>
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Active Complaints / Inst.</span>
            <div style={{ padding: '8px', backgroundColor: '#ffe4e6', color: '#be123c', borderRadius: '10px' }}><Wrench size={20} /></div>
          </div>
          <div style={{ marginTop: '14px' }}>
            <span style={{ fontSize: '26px', fontWeight: '800', color: '#0f172a' }}>{summary?.active_complaints || 0}</span>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              Pending Installations: <span style={{ fontWeight: '700', color: '#2563eb' }}>{summary?.pending_installations || 0}</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('overview')}
          style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '20px', border: '1px solid #bfdbfe', boxShadow: '0 2px 8px rgba(37,99,235,0.08)', textAlign: 'left', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Orders Ready For Inventory</span>
            <div style={{ padding: '8px', backgroundColor: '#dbeafe', color: '#1d4ed8', borderRadius: '10px' }}><FileText size={20} /></div>
          </div>
          <div style={{ marginTop: '14px' }}>
            <span style={{ fontSize: '26px', fontWeight: '800', color: '#1d4ed8' }}>{summary?.approved_csr_jobs || workQueue.length || 0}</span>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              Converted by CRM and ready for stock, serials and installer handoff
            </div>
          </div>
        </button>
      </div>

      {/* Tabs Bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', backgroundColor: '#f1f5f9', padding: '6px', borderRadius: '12px', overflowX: 'auto' }}>
        {[
          { id: 'overview', label: 'Overview & Alerts', icon: TrendingUp },
          { id: 'products', label: `Products (${summary?.total_products || products.length})`, icon: Box },
          { id: 'serials', label: `Serial Tracking (${summary?.total_serials || items.length})`, icon: Barcode },
          { id: 'ledger', label: `Stock Ledger (${movements.length})`, icon: ArrowRightLeft },
          { id: 'po', label: `Purchase Orders (${purchaseOrders.length})`, icon: ShoppingCart },
          { id: 'invoices', label: `Vendor Stock Receipts (${invoices.length})`, icon: Receipt },
          { id: 'installations', label: `Field Dispatches (${installations.length})`, icon: Wrench },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isActive ? '#0f172a' : 'transparent',
                color: isActive ? '#ffffff' : '#64748b',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: isActive ? '0 4px 12px rgba(15,23,42,0.2)' : 'none',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(320px, 0.9fr)', gap: '24px', alignItems: 'start' }}>
          <div style={{ display: 'grid', gap: '24px' }}>
            {/* CSR Approved Inventory Work Queue */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #bfdbfe', padding: '20px', boxShadow: '0 8px 24px rgba(37,99,235,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#2563eb', marginBottom: '4px' }}>
                    CSR to Inventory Queue
                  </div>
                  <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: 0 }}>Converted Orders Waiting For Stock Action</h2>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 800, padding: '6px 10px', backgroundColor: '#dbeafe', color: '#1d4ed8', borderRadius: '999px' }}>
                  {workQueue.length} active jobs
                </span>
              </div>

              {workQueue.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '14px', border: '1px dashed #cbd5e1' }}>
                  <CheckCircle size={40} style={{ color: '#10b981', margin: '0 auto 8px' }} />
                  No converted orders are waiting right now. After CRM converts an approved quotation to an order, it will appear here.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '12px', maxHeight: '560px', overflowY: 'auto', paddingRight: '4px' }}>
                  {workQueue.map((job) => (
                    <div key={job.id} style={{ padding: '14px', borderRadius: '14px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '14px', alignItems: 'center' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                            <span style={{ fontWeight: 900, color: '#0f172a' }}>{job.order_number || job.quotation_number}</span>
                            <span style={{ padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 800, backgroundColor: '#d1fae5', color: '#047857' }}>{job.order_status || job.status}</span>
                            {job.token_number ? <span style={{ fontSize: '12px', color: '#2563eb', fontWeight: 900 }}>{job.token_number}</span> : null}
                            <span style={{ fontSize: '12px', color: '#64748b' }}>{job.template_style || 'HBL Sales Tax Invoice'}</span>
                          </div>
                          <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.45 }}>
                            {job.customer_name || 'Client'} - {job.item_count || 0} item lines, requested qty {job.total_requested_qty || 0}, value {formatCurrency(job.total_amount)}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => setActiveTab('serials')}
                            style={{ border: 'none', borderRadius: '9px', padding: '9px 11px', backgroundColor: '#2563eb', color: '#ffffff', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                          >
                            Assign Serial / Stock
                          </button>
                          <button
                            onClick={() => {
                              setNewInstallation((current) => ({ ...current, customer_id: job.customer_id || '' }));
                              setShowInstallationModal(true);
                            }}
                            style={{ border: 'none', borderRadius: '9px', padding: '9px 11px', backgroundColor: '#10b981', color: '#ffffff', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                          >
                            Create Installer Handoff
                          </button>
                          <button
                            onClick={() => {
                              if (canOpenBilling) {
                                window.location.href = `/invoice-builder?quotationId=${encodeURIComponent(job.id)}`;
                                return;
                              }
                              toast.success('Marked ready for finance billing queue');
                            }}
                            style={{ border: 'none', borderRadius: '9px', padding: '9px 11px', backgroundColor: '#0f172a', color: '#ffffff', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                          >
                            {canOpenBilling ? 'Open Billing' : 'Ready For Billing'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Low Stock Alert Panel */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={20} style={{ color: '#f59e0b' }} />
                  <h2 style={{ fontSize: '18px', fontWeight: 900, margin: 0, color: '#0f172a' }}>Low Stock & Reorder Alerts</h2>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 800, padding: '6px 10px', backgroundColor: '#fef3c7', color: '#b45309', borderRadius: '999px' }}>
                  Action Recommended
                </span>
              </div>

              {products.filter((p) => p.quantity <= p.min_stock_level).length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                  <CheckCircle size={40} style={{ color: '#10b981', margin: '0 auto 8px' }} />
                  All inventory stock levels are healthy!
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: '#f8fafc', color: '#64748b', textTransform: 'uppercase', fontSize: '11px' }}>
                      <tr>
                        <th style={{ padding: '12px' }}>Product Name</th>
                        <th style={{ padding: '12px' }}>Category</th>
                        <th style={{ padding: '12px' }}>Current Stock</th>
                        <th style={{ padding: '12px' }}>Min Threshold</th>
                        <th style={{ padding: '12px' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products
                        .filter((p) => p.quantity <= p.min_stock_level)
                        .map((prod) => (
                          <tr key={prod.id}>
                            <td style={{ padding: '12px', borderTop: '1px solid #f1f5f9', fontWeight: 800, color: '#0f172a' }}>{prod.product_name}</td>
                            <td style={{ padding: '12px', borderTop: '1px solid #f1f5f9', color: '#64748b' }}>{prod.category_name || 'Unassigned'}</td>
                            <td style={{ padding: '12px', borderTop: '1px solid #f1f5f9', fontWeight: 900, color: '#d97706' }}>{prod.quantity}</td>
                            <td style={{ padding: '12px', borderTop: '1px solid #f1f5f9', color: '#64748b' }}>{prod.min_stock_level}</td>
                            <td style={{ padding: '12px', borderTop: '1px solid #f1f5f9' }}>
                              {prod.quantity === 0 ? (
                                <span style={{ padding: '5px 9px', fontSize: '11px', fontWeight: 800, backgroundColor: '#ffe4e6', color: '#be123c', borderRadius: '999px' }}>
                                  OUT OF STOCK
                                </span>
                              ) : (
                                <span style={{ padding: '5px 9px', fontSize: '11px', fontWeight: 800, backgroundColor: '#fef3c7', color: '#b45309', borderRadius: '999px' }}>
                                  LOW STOCK
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions & Recent Workflow Summary */}
          <div>
            <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginBottom: '14px' }}>Quick Management Actions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={() => setShowAddProductModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between',
                    padding: '12px 16px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    fontSize: '13.5px',
                    fontWeight: '700',
                    color: '#0f172a',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Box size={18} style={{ color: '#6366f1' }} /> Create Product
                  </span>
                  <Plus size={16} style={{ color: '#94a3b8' }} />
                </button>

                <button
                  onClick={() => setShowAddSerialModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between',
                    padding: '12px 16px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    fontSize: '13.5px',
                    fontWeight: '700',
                    color: '#0f172a',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Barcode size={18} style={{ color: '#10b981' }} /> Log Serial / IMEI Item
                  </span>
                  <Plus size={16} style={{ color: '#94a3b8' }} />
                </button>

                <button
                  onClick={() => setShowInstallationModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between',
                    padding: '12px 16px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    fontSize: '13.5px',
                    fontWeight: '700',
                    color: '#0f172a',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Wrench size={18} style={{ color: '#8b5cf6' }} /> Log Tracker Installation
                  </span>
                  <Plus size={16} style={{ color: '#94a3b8' }} />
                </button>

                <button
                  onClick={() => setShowComplaintModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between',
                    padding: '12px 16px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    fontSize: '13.5px',
                    fontWeight: '700',
                    color: '#0f172a',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ShieldAlert size={18} style={{ color: '#f43f5e' }} /> Log Customer Complaint Ticket
                  </span>
                  <Plus size={16} style={{ color: '#94a3b8' }} />
                </button>

                <button
                  onClick={() => setShowReplacementModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justify: 'space-between',
                    padding: '12px 16px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    fontSize: '13.5px',
                    fontWeight: '700',
                    color: '#0f172a',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ArrowRightLeft size={18} style={{ color: '#f59e0b' }} /> Record Device Swap / Replacement
                  </span>
                  <Plus size={16} style={{ color: '#94a3b8' }} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCTS */}
      {activeTab === 'products' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Enhanced Filter Bar */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              padding: '16px',
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              flexWrap: 'wrap',
              boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
            }}
          >
            <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '10px 12px 10px 38px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '13.5px', fontWeight: '600' }}
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '13.5px', fontWeight: '600' }}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.category_name}</option>
              ))}
            </select>

            <select
              value={selectedProductType}
              onChange={(e) => setSelectedProductType(e.target.value)}
              style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '13.5px', fontWeight: '600' }}
            >
              <option value="">All Product Types</option>
              <option value="ASSET">ASSET</option>
              <option value="CONSUMABLE">CONSUMABLE</option>
              <option value="SERVICE">SERVICE</option>
            </select>

            <select
              value={selectedTrackingType}
              onChange={(e) => setSelectedTrackingType(e.target.value)}
              style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '13.5px', fontWeight: '600' }}
            >
              <option value="">All Tracking Types</option>
              <option value="SERIAL">SERIAL</option>
              <option value="IMEI">IMEI</option>
              <option value="NONE">NONE</option>
            </select>

            <select
              value={selectedStockStatus}
              onChange={(e) => setSelectedStockStatus(e.target.value)}
              style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '13.5px', fontWeight: '600' }}
            >
              <option value="">All Stock Levels</option>
              <option value="in_stock">In Stock (&gt;0)</option>
              <option value="low_stock">Low Stock (At/Below Min)</option>
              <option value="out_of_stock">Out of Stock (=0)</option>
            </select>
          </div>

          {/* Products Table */}
          <div style={tableWrapStyle}>
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Product Name</th>
                    <th style={thStyle}>Category</th>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Tracking</th>
                    <th style={thStyle}>In Stock</th>
                    <th style={thStyle}>Unit Price</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ ...tdStyle, padding: '44px 14px', textAlign: 'center', color: '#64748b' }}>
                        No products match your search/filters.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((prod) => (
                      <tr key={prod.id}>
                        <td style={{ ...tdStyle, fontWeight: 900, color: '#0f172a' }}>
                          <div>{prod.product_name}</div>
                          {prod.description && <div style={{ marginTop: '3px', color: '#94a3b8', fontSize: '12px', fontWeight: 500 }}>{prod.description}</div>}
                        </td>
                        <td style={tdStyle}>
                          <span style={chipStyle('slate')}>
                            {prod.category_name || 'General'}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <span style={chipStyle('indigo')}>
                            {prod.product_type}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <span style={chipStyle('emerald')}>
                            {prod.tracking_type}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <span
                            style={{
                              fontWeight: 900,
                              color: prod.quantity === 0 ? '#e11d48' : prod.quantity <= prod.min_stock_level ? '#d97706' : '#059669',
                            }}
                          >
                            {prod.quantity}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, fontWeight: 800 }}>
                          {Number(prod.unit_price || 0) > 0 ? (
                            formatCurrency(prod.unit_price)
                          ) : (
                            <span style={{ color: '#b45309' }}>Price not set</span>
                          )}
                        </td>
                        <td style={tdStyle}>
                          <button
                            onClick={async () => {
                              if (confirm(`Delete product ${prod.product_name}?`)) {
                                try {
                                  await inventoryApi.deleteProduct(prod.id);
                                  toast.success('Product deleted');
                                  loadData();
                                } catch (err) {
                                  toast.error('Failed to delete');
                                }
                              }
                            }}
                            style={{ border: '1px solid #fecdd3', backgroundColor: '#fff1f2', color: '#e11d48', borderRadius: '9px', padding: '8px', cursor: 'pointer' }}
                            aria-label={`Delete ${prod.product_name}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SERIALS */}
      {activeTab === 'serials' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={toolbarStyle}>
            <div style={searchWrapStyle}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search serial / IMEI / product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ ...inputStyle, paddingLeft: '38px' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <select
                value={selectedSerialStatus}
                onChange={(e) => setSelectedSerialStatus(e.target.value)}
                style={selectStyle}
              >
                <option value="">All Serial Statuses</option>
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="ALLOCATED">ALLOCATED</option>
                <option value="INSTALLED">INSTALLED</option>
                <option value="RETURNED">RETURNED</option>
                <option value="DAMAGED">DAMAGED</option>
              </select>

              <button
                onClick={() => setShowAddSerialModal(true)}
                style={primaryButtonStyle}
              >
                <Plus size={16} /> Log Serial / IMEI
              </button>
            </div>
          </div>

          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Product</th>
                  <th style={thStyle}>Serial No</th>
                  <th style={thStyle}>IMEI</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Location</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ ...tdStyle, padding: '44px 14px', textAlign: 'center', color: '#64748b' }}>
                      No serial items found.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id}>
                      <td style={{ ...tdStyle, fontWeight: 900, color: '#0f172a' }}>{item.product_name}</td>
                      <td style={{ ...tdStyle, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '12px' }}>{item.serial_number || 'N/A'}</td>
                      <td style={{ ...tdStyle, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '12px' }}>{item.imei || 'N/A'}</td>
                      <td style={tdStyle}>
                        <span
                          style={chipStyle(
                            item.current_status === 'AVAILABLE'
                              ? 'emerald'
                              : item.current_status === 'INSTALLED'
                              ? 'indigo'
                              : item.current_status === 'DAMAGED'
                              ? 'rose'
                              : 'amber',
                          )}
                        >
                          {item.current_status}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, color: '#64748b' }}>{item.location || 'Warehouse Main'}</td>
                      <td style={tdStyle}>
                        <select
                          value={item.current_status}
                          onChange={async (e) => {
                            try {
                              await inventoryApi.updateItem(item.id, { current_status: e.target.value as any });
                              toast.success('Status updated');
                              loadData();
                            } catch (err) {
                              toast.error('Failed to update status');
                            }
                          }}
                          style={{ ...selectStyle, minWidth: '140px', padding: '8px 10px', fontSize: '12px' }}
                        >
                          <option value="AVAILABLE">AVAILABLE</option>
                          <option value="ALLOCATED">ALLOCATED</option>
                          <option value="INSTALLED">INSTALLED</option>
                          <option value="RETURNED">RETURNED</option>
                          <option value="DAMAGED">DAMAGED</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: STOCK LEDGER */}
      {activeTab === 'ledger' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ ...toolbarStyle, alignItems: 'stretch' }}>
            <div style={{ flex: '1 1 420px' }}>
              <div style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.06em', color: '#2563eb', textTransform: 'uppercase', marginBottom: '6px' }}>
                Live Stock Movement Ledger
              </div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>
                Stock In, Stock Out, Returns & Serial Status History
              </h2>
              <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '13px' }}>
                Purchase orders, issued invoices, serial creation, installation and replacement actions appear here as audit-ready inventory history.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ ...searchWrapStyle, flex: '1 1 280px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search product, serial, reference, notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: '38px' }}
                />
              </div>
              <select value={selectedMovementType} onChange={(e) => setSelectedMovementType(e.target.value)} style={selectStyle}>
                <option value="">All movement types</option>
                <option value="STOCK_IN">Stock In</option>
                <option value="STOCK_OUT">Stock Out</option>
                <option value="TRANSFER">Transfer / Adjustment</option>
                <option value="RETURN">Return</option>
              </select>
              <button onClick={loadData} style={{ ...primaryButtonStyle, backgroundColor: '#2563eb' }}>
                <RefreshCw size={16} /> Refresh Ledger
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            {[
              ['Stock In', movements.filter((m) => m.movement_type === 'STOCK_IN').reduce((sum, m) => sum + Number(m.quantity || 0), 0), 'emerald'],
              ['Stock Out', movements.filter((m) => m.movement_type === 'STOCK_OUT').reduce((sum, m) => sum + Number(m.quantity || 0), 0), 'rose'],
              ['Returns', movements.filter((m) => m.movement_type === 'RETURN').reduce((sum, m) => sum + Number(m.quantity || 0), 0), 'amber'],
              ['Ledger Records', filteredMovements.length, 'indigo'],
            ].map(([label, value, tone]) => (
              <div key={label as string} style={{ ...cardStyle, padding: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>{label}</div>
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '26px', fontWeight: 900, color: '#0f172a' }}>{value}</span>
                  <span style={chipStyle(tone as any)}>Live</span>
                </div>
              </div>
            ))}
          </div>

          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Movement</th>
                  <th style={thStyle}>Product</th>
                  <th style={thStyle}>Serial / IMEI</th>
                  <th style={thStyle}>Qty</th>
                  <th style={thStyle}>Reference</th>
                  <th style={thStyle}>Notes</th>
                  <th style={thStyle}>By</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ ...tdStyle, padding: '44px 14px', textAlign: 'center', color: '#64748b' }}>
                      No stock ledger movements found yet. Create a PO, invoice, serial, installation or status update to start the trail.
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map((movement) => (
                    <tr key={movement.id}>
                      <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{formatDate(movement.created_at)}</td>
                      <td style={tdStyle}>
                        <span
                          style={chipStyle(
                            movement.movement_type === 'STOCK_IN'
                              ? 'emerald'
                              : movement.movement_type === 'STOCK_OUT'
                              ? 'rose'
                              : movement.movement_type === 'RETURN'
                              ? 'amber'
                              : 'indigo',
                          )}
                        >
                          {movement.movement_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 900, color: '#0f172a' }}>{movement.product_name || 'Product not linked'}</td>
                      <td style={{ ...tdStyle, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '12px' }}>
                        {movement.serial_number || movement.imei || '-'}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 900 }}>{movement.quantity || 1}</td>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 800, color: '#334155' }}>{movement.reference_type || 'Manual'}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{movement.reference_id || '-'}</div>
                      </td>
                      <td style={{ ...tdStyle, color: '#475569', maxWidth: 280 }}>{movement.notes || '-'}</td>
                      <td style={{ ...tdStyle, color: '#64748b' }}>{movement.created_by_email || 'System'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: PURCHASE ORDERS */}
      {activeTab === 'po' && (
        <div style={{ display: 'grid', gap: '18px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #dbeafe', padding: '20px', boxShadow: '0 6px 18px rgba(37,99,235,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.06em', color: '#2563eb', textTransform: 'uppercase' }}>Purchase Workflow Example</div>
                <h2 style={{ margin: '4px 0', fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>Stock-In starts here</h2>
                <p style={{ margin: 0, color: '#64748b', fontSize: '13px', lineHeight: 1.5 }}>
                  Example: ESSPL needs 200 cameras. Purchasing creates a PO for a vendor, then stock receipt records the delivered serials/items.
                </p>
              </div>
              <button
                onClick={() => setShowPOModal(true)}
                style={{ border: 'none', borderRadius: '10px', padding: '10px 14px', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: 800, cursor: 'pointer' }}
              >
                + Create Purchase Order
              </button>
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead style={{ backgroundColor: '#f8fafc', color: '#64748b', textTransform: 'uppercase', fontSize: '11px' }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px' }}>PO Number</th>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Vendor</th>
                  <th style={{ textAlign: 'left', padding: '12px' }}>PO Date</th>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Expected</th>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Items</th>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Status</th>
                  <th style={{ textAlign: 'right', padding: '12px' }}>Amount</th>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Next Step</th>
                </tr>
              </thead>
              <tbody>
                {(purchaseOrders.length ? purchaseOrders : [{
                  id: 'sample-po',
                  po_number: 'PO-SAMPLE-200-CAM',
                  vendor_name: 'Demo Vendor - CCTV Supplier',
                  item_count: 2,
                  status: 'DRAFT / Pending Approval',
                  total_amount: 1500000,
                  order_date: new Date().toISOString(),
                  expected_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                  notes: 'Sample only: approve PO, then create vendor stock receipt.',
                } as PurchaseOrder & { expected_delivery_date?: string }]).map((po) => (
                  <tr key={po.id}>
                    <td style={{ padding: '13px', borderTop: '1px solid #f1f5f9', fontWeight: 900, color: '#0f172a' }}>{po.po_number}</td>
                    <td style={{ padding: '13px', borderTop: '1px solid #f1f5f9', color: '#334155' }}>{po.vendor_name || 'Vendor not selected'}</td>
                    <td style={{ padding: '13px', borderTop: '1px solid #f1f5f9', color: '#334155' }}>{formatDate(po.order_date)}</td>
                    <td style={{ padding: '13px', borderTop: '1px solid #f1f5f9', color: '#64748b' }}>{formatDate((po as PurchaseOrder & { expected_delivery_date?: string }).expected_delivery_date)}</td>
                    <td style={{ padding: '13px', borderTop: '1px solid #f1f5f9', color: '#64748b' }}>{po.item_count || 0} item lines</td>
                    <td style={{ padding: '13px', borderTop: '1px solid #f1f5f9' }}>
                      <span style={{ padding: '5px 9px', borderRadius: 999, backgroundColor: '#fef3c7', color: '#b45309', fontSize: '11px', fontWeight: 900 }}>{po.status}</span>
                    </td>
                    <td style={{ padding: '13px', borderTop: '1px solid #f1f5f9', textAlign: 'right', fontWeight: 900 }}>{formatCurrency(po.total_amount)}</td>
                    <td style={{ padding: '13px', borderTop: '1px solid #f1f5f9', color: '#2563eb', fontWeight: 800 }}>Receive vendor stock</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: VENDOR STOCK RECEIPTS */}
      {activeTab === 'invoices' && (
        <div style={{ display: 'grid', gap: '18px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #bbf7d0', padding: '20px', boxShadow: '0 6px 18px rgba(16,185,129,0.06)' }}>
            <div style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.06em', color: '#059669', textTransform: 'uppercase' }}>Vendor Stock Receipt Example</div>
            <h2 style={{ margin: '4px 0', fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>GRN / Stock Receipt fills inventory</h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: '13px', lineHeight: 1.5 }}>
              After PO approval, vendor delivers stock. This tab tracks vendor invoice/receipt and confirms items are added to inventory serial/product stock.
            </p>
          </div>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead style={{ backgroundColor: '#f8fafc', color: '#64748b', textTransform: 'uppercase', fontSize: '11px' }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Receipt / Invoice</th>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Party</th>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Items</th>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Status</th>
                  <th style={{ textAlign: 'right', padding: '12px' }}>Amount</th>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Inventory Result</th>
                </tr>
              </thead>
              <tbody>
                {(invoices.length ? invoices : [{
                  id: 'sample-receipt',
                  invoice_number: 'GRN-SAMPLE-001',
                  customer_name: 'Demo Vendor - CCTV Supplier',
                  status: 'RECEIVED',
                  total_amount: 1500000,
                  item_count: 200,
                  notes: 'Sample: 200 cameras received and available for stock assignment.',
                } as Invoice]).map((invoice) => (
                  <tr key={invoice.id}>
                    <td style={{ padding: '13px', borderTop: '1px solid #f1f5f9', fontWeight: 900, color: '#0f172a' }}>{invoice.invoice_number}</td>
                    <td style={{ padding: '13px', borderTop: '1px solid #f1f5f9', color: '#334155' }}>{invoice.customer_name || 'Vendor / Supplier'}</td>
                    <td style={{ padding: '13px', borderTop: '1px solid #f1f5f9', color: '#64748b' }}>{invoice.item_count || 0} received</td>
                    <td style={{ padding: '13px', borderTop: '1px solid #f1f5f9' }}>
                      <span style={{ padding: '5px 9px', borderRadius: 999, backgroundColor: '#dcfce7', color: '#047857', fontSize: '11px', fontWeight: 900 }}>{invoice.status}</span>
                    </td>
                    <td style={{ padding: '13px', borderTop: '1px solid #f1f5f9', textAlign: 'right', fontWeight: 900 }}>{formatCurrency(invoice.total_amount)}</td>
                    <td style={{ padding: '13px', borderTop: '1px solid #f1f5f9', color: '#059669', fontWeight: 800 }}>Stock available for serial assignment</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: FIELD DISPATCHES */}
      {activeTab === 'installations' && (
        <div style={{ display: 'grid', gap: '18px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #ddd6fe', padding: '20px', boxShadow: '0 6px 18px rgba(139,92,246,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.06em', color: '#7c3aed', textTransform: 'uppercase' }}>Installer / Field Dispatch Example</div>
                <h2 style={{ margin: '4px 0', fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>Stock goes to installer, then billing opens</h2>
                <p style={{ margin: 0, color: '#64748b', fontSize: '13px', lineHeight: 1.5 }}>
                  Once serials/items are assigned, inventory creates installer handoff. Installer completes job, unused items return, and finance uses final usage summary for invoice.
                </p>
              </div>
              <button
                onClick={() => setShowInstallationModal(true)}
                style={{ border: 'none', borderRadius: '10px', padding: '10px 14px', backgroundColor: '#7c3aed', color: '#ffffff', fontWeight: 800, cursor: 'pointer' }}
              >
                + Create Field Dispatch
              </button>
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead style={{ backgroundColor: '#f8fafc', color: '#64748b', textTransform: 'uppercase', fontSize: '11px' }}>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Dispatch / Installation</th>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Client</th>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Serial / Vehicle</th>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Technician</th>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Status</th>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Next Step</th>
                </tr>
              </thead>
              <tbody>
                {(installations.length ? installations : [{
                  id: 'sample-dispatch',
                  installation_no: 'DISPATCH-SAMPLE-001',
                  customer_id: 'sample',
                  customer_name: 'Habib Bank Limited',
                  vehicle_number: 'Branch DHA / Ticket TKT-088',
                  tracker_serial: 'CAM-SERIAL-001',
                  technician_name: 'Demo Installer',
                  status: 'READY_FOR_INSTALLATION',
                  installation_date: new Date().toISOString(),
                  notes: 'Sample: installer receives stock and returns installed/unused item summary.',
                } as TrackerInstallation]).map((installation) => (
                  <tr key={installation.id}>
                    <td style={{ padding: '13px', borderTop: '1px solid #f1f5f9', fontWeight: 900, color: '#0f172a' }}>{installation.installation_no}</td>
                    <td style={{ padding: '13px', borderTop: '1px solid #f1f5f9', color: '#334155' }}>{installation.customer_name || 'Client'}</td>
                    <td style={{ padding: '13px', borderTop: '1px solid #f1f5f9', color: '#64748b' }}>{installation.tracker_serial || installation.vehicle_number || 'Serial pending'}</td>
                    <td style={{ padding: '13px', borderTop: '1px solid #f1f5f9', color: '#334155' }}>{installation.technician_name || 'Installer pending'}</td>
                    <td style={{ padding: '13px', borderTop: '1px solid #f1f5f9' }}>
                      <span style={{ padding: '5px 9px', borderRadius: 999, backgroundColor: '#ede9fe', color: '#6d28d9', fontSize: '11px', fontWeight: 900 }}>{installation.status}</span>
                    </td>
                    <td style={{ padding: '13px', borderTop: '1px solid #f1f5f9', color: '#7c3aed', fontWeight: 800 }}>Send final usage to finance billing</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: CUSTOMERS & SPECIAL INVOICE DRAFTS */}
      {activeTab === 'customers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={toolbarStyle}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 900, letterSpacing: '0.05em', color: '#2563eb', textTransform: 'uppercase' }}>
                Customer Master
              </div>
              <h3 style={{ margin: '4px 0 0', fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>
                Customer Registry & Special Invoice Draft Templates
              </h3>
            </div>
            <button
              onClick={() => setShowCustomerModal(true)}
              style={{ ...primaryButtonStyle, backgroundColor: '#2563eb', boxShadow: '0 8px 18px rgba(37,99,235,0.18)' }}
            >
              <Plus size={16} /> Register Customer
            </button>
          </div>

          <div style={tableWrapStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Customer / Company</th>
                  <th style={thStyle}>Contact Person</th>
                  <th style={thStyle}>Phone / Email</th>
                  <th style={thStyle}>Vehicles</th>
                  <th style={thStyle}>Special Invoice Draft Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ ...tdStyle, padding: '44px 14px', textAlign: 'center', color: '#64748b' }}>
                      No customers registered yet.
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.id}>
                      <td style={{ ...tdStyle, fontWeight: 900, color: '#0f172a' }}>{c.customer_name}</td>
                      <td style={tdStyle}>{c.contact_person || 'N/A'}</td>
                      <td style={{ ...tdStyle, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '12px' }}>{c.phone || c.email || 'N/A'}</td>
                      <td style={tdStyle}>
                        <span style={chipStyle('slate')}>
                          {c.vehicle_count || 0} Vehicles
                        </span>
                      </td>
                      <td style={{ ...tdStyle, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleOpenCustomerDraftModal(c)}
                          style={{ border: '1px solid #c7d2fe', backgroundColor: '#eef2ff', color: '#4338ca', borderRadius: '9px', padding: '8px 10px', fontSize: '12px', fontWeight: 900, cursor: 'pointer' }}
                        >
                          Config Special Draft
                        </button>
                        <button
                          onClick={() => handleGenerateDraftInvoice(c)}
                          style={{ border: 'none', backgroundColor: '#10b981', color: '#ffffff', borderRadius: '9px', padding: '8px 10px', fontSize: '12px', fontWeight: 900, cursor: 'pointer', boxShadow: '0 6px 14px rgba(16,185,129,0.16)' }}
                        >
                          Spawn Draft Invoice
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD PRODUCT */}
      {showAddProductModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', maxWidth: '520px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Create New Catalog Product</h3>
              <button onClick={() => setShowAddProductModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <XCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Product Name *</label>
                <input
                  type="text"
                  required
                  value={newProduct.product_name}
                  onChange={(e) => setNewProduct({ ...newProduct, product_name: e.target.value })}
                  placeholder="e.g. GPS Tracker GT-900"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Category</label>
                  <select
                    value={newProduct.category_id}
                    onChange={(e) => setNewProduct({ ...newProduct, category_id: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.category_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Product Type</label>
                  <select
                    value={newProduct.product_type}
                    onChange={(e) => setNewProduct({ ...newProduct, product_type: e.target.value as any })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                  >
                    <option value="ASSET">ASSET</option>
                    <option value="CONSUMABLE">CONSUMABLE</option>
                    <option value="SERVICE">SERVICE</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Tracking</label>
                  <select
                    value={newProduct.tracking_type}
                    onChange={(e) => setNewProduct({ ...newProduct, tracking_type: e.target.value as any })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                  >
                    <option value="SERIAL">SERIAL</option>
                    <option value="IMEI">IMEI</option>
                    <option value="NONE">NONE</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Stock Qty</label>
                  <input
                    type="number"
                    min={0}
                    value={newProduct.quantity}
                    onChange={(e) => setNewProduct({ ...newProduct, quantity: Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Min Reorder</label>
                  <input
                    type="number"
                    min={0}
                    value={newProduct.min_stock_level}
                    onChange={(e) => setNewProduct({ ...newProduct, min_stock_level: Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Selling Price (PKR)</label>
                  <input
                    type="number"
                    min={0}
                    value={newProduct.unit_price}
                    onChange={(e) => setNewProduct({ ...newProduct, unit_price: Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Cost Price (PKR)</label>
                  <input
                    type="number"
                    min={0}
                    value={newProduct.cost_price}
                    onChange={(e) => setNewProduct({ ...newProduct, cost_price: Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowAddProductModal(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#475569', fontWeight: '600', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#10b981', color: '#fff', fontWeight: '700', cursor: 'pointer' }}>
                  Create Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE PURCHASE ORDER */}
      {showPOModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', maxWidth: '620px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>Create Purchase Order</h3>
            <p style={{ margin: '0 0 18px', color: '#64748b', fontSize: '13px' }}>
              Stock-in starts from this PO. Set PO date, expected delivery, vendor and item.
            </p>
            <form onSubmit={handleCreatePO} style={{ display: 'grid', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>PO Date *</label>
                  <input
                    type="date"
                    required
                    value={newPO.order_date}
                    onChange={(e) => setNewPO({ ...newPO, order_date: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Expected Delivery</label>
                  <input
                    type="date"
                    value={newPO.expected_delivery_date}
                    onChange={(e) => setNewPO({ ...newPO, expected_delivery_date: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Vendor</label>
                <select
                  value={newPO.vendor_id}
                  onChange={(e) => setNewPO({ ...newPO, vendor_id: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                >
                  <option value="">Select vendor</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Product / Item *</label>
                <select
                  required
                  value={newPO.product_id}
                  onChange={(e) => {
                    const product = products.find((item) => item.id === e.target.value);
                    setNewPO({ ...newPO, product_id: e.target.value, unit_price: Number(product?.cost_price || product?.unit_price || 0) });
                  }}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                >
                  <option value="">Select product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>{product.product_name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Quantity *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newPO.quantity}
                    onChange={(e) => setNewPO({ ...newPO, quantity: Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Unit Price</label>
                  <input
                    type="number"
                    min={0}
                    value={newPO.unit_price}
                    onChange={(e) => setNewPO({ ...newPO, unit_price: Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Total</label>
                  <div style={{ padding: '11px 14px', borderRadius: '8px', border: '1px solid #dbeafe', backgroundColor: '#eff6ff', color: '#1d4ed8', fontSize: '14px', fontWeight: 900 }}>
                    {formatCurrency(newPO.quantity * newPO.unit_price)}
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Notes</label>
                <textarea
                  value={newPO.notes}
                  onChange={(e) => setNewPO({ ...newPO, notes: e.target.value })}
                  rows={3}
                  placeholder="Approval note, vendor terms, delivery instruction..."
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowPOModal(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#475569', fontWeight: '600', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontWeight: '800', cursor: 'pointer' }}>
                  Save Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD CATEGORY */}
      {showAddCategoryModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', maxWidth: '480px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '18px' }}>Add Item Category</h3>
            <form onSubmit={handleCreateCategory} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Category Name *</label>
                <input
                  type="text"
                  required
                  value={newCategory.category_name}
                  onChange={(e) => setNewCategory({ ...newCategory, category_name: e.target.value })}
                  placeholder="e.g. Trackers, Accessories"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Description</label>
                <input
                  type="text"
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowAddCategoryModal(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#475569', fontWeight: '600', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#6366f1', color: '#fff', fontWeight: '700', cursor: 'pointer' }}>
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD SERIAL */}
      {showAddSerialModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', maxWidth: '480px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '18px' }}>Log Inventory Serial / IMEI</h3>
            <form onSubmit={handleCreateSerial} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Select Product *</label>
                <select
                  required
                  value={newSerial.product_id}
                  onChange={(e) => setNewSerial({ ...newSerial, product_id: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                >
                  <option value="">Select Product</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.product_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Serial Number</label>
                <input
                  type="text"
                  value={newSerial.serial_number}
                  onChange={(e) => setNewSerial({ ...newSerial, serial_number: e.target.value })}
                  placeholder="SN-100203"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>IMEI Number</label>
                <input
                  type="text"
                  value={newSerial.imei}
                  onChange={(e) => setNewSerial({ ...newSerial, imei: e.target.value })}
                  placeholder="86920194819201"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Warehouse Location</label>
                <input
                  type="text"
                  value={newSerial.location}
                  onChange={(e) => setNewSerial({ ...newSerial, location: e.target.value })}
                  placeholder="Shelf A-3"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowAddSerialModal(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#475569', fontWeight: '600', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#10b981', color: '#fff', fontWeight: '700', cursor: 'pointer' }}>
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TRACKER INSTALLATION */}
      {showInstallationModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', maxWidth: '480px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '18px' }}>Log Tracker Installation</h3>
            <form onSubmit={handleCreateInstallation} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Customer *</label>
                <select
                  required
                  value={newInstallation.customer_id}
                  onChange={(e) => setNewInstallation({ ...newInstallation, customer_id: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                >
                  <option value="">Select Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.customer_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Tracker Device Serial</label>
                <select
                  value={newInstallation.tracker_item_id}
                  onChange={(e) => setNewInstallation({ ...newInstallation, tracker_item_id: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                >
                  <option value="">Select Available Serial</option>
                  {items
                    .filter((i) => i.current_status === 'AVAILABLE')
                    .map((i) => (
                      <option key={i.id} value={i.id}>{i.product_name} - {i.serial_number || i.imei}</option>
                    ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Technician Name</label>
                <input
                  type="text"
                  value={newInstallation.technician_name}
                  onChange={(e) => setNewInstallation({ ...newInstallation, technician_name: e.target.value })}
                  placeholder="e.g. Tariq Mehmood"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowInstallationModal(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#475569', fontWeight: '600', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#8b5cf6', color: '#fff', fontWeight: '700', cursor: 'pointer' }}>
                  Log Installation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: COMPLAINT */}
      {showComplaintModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', maxWidth: '480px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '18px' }}>Log Customer Complaint</h3>
            <form onSubmit={handleCreateComplaint} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Customer *</label>
                <select
                  required
                  value={newComplaint.customer_id}
                  onChange={(e) => setNewComplaint({ ...newComplaint, customer_id: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                >
                  <option value="">Select Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.customer_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Complaint Type</label>
                <select
                  value={newComplaint.complaint_type}
                  onChange={(e) => setNewComplaint({ ...newComplaint, complaint_type: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                >
                  <option value="DEVICE_OFFLINE">DEVICE_OFFLINE</option>
                  <option value="LOCATION_INACCURATE">LOCATION_INACCURATE</option>
                  <option value="PHYSICAL_DAMAGE">PHYSICAL_DAMAGE</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Description</label>
                <textarea
                  value={newComplaint.description}
                  onChange={(e) => setNewComplaint({ ...newComplaint, description: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                  rows={3}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowComplaintModal(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#475569', fontWeight: '600', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#f43f5e', color: '#fff', fontWeight: '700', cursor: 'pointer' }}>
                  Submit Complaint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DEVICE REPLACEMENT / SWAP */}
      {showReplacementModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '28px', maxWidth: '480px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '18px' }}>Record Device Swap / Replacement</h3>
            <form onSubmit={handleCreateReplacement} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Current/Faulty Device (Old Serial) *</label>
                <select
                  required
                  value={newReplacement.old_inventory_item_id}
                  onChange={(e) => setNewReplacement({ ...newReplacement, old_inventory_item_id: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                >
                  <option value="">Select Installed Device</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.product_name} ({i.serial_number || i.imei}) - [{i.current_status}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Replacement Device (New Available Serial) *</label>
                <select
                  required
                  value={newReplacement.new_inventory_item_id}
                  onChange={(e) => setNewReplacement({ ...newReplacement, new_inventory_item_id: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                >
                  <option value="">Select New Available Device</option>
                  {items
                    .filter((i) => i.current_status === 'AVAILABLE')
                    .map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.product_name} ({i.serial_number || i.imei})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Reason for Swap</label>
                <input
                  type="text"
                  value={newReplacement.reason}
                  onChange={(e) => setNewReplacement({ ...newReplacement, reason: e.target.value })}
                  placeholder="e.g. Defective GPS module"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowReplacementModal(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#475569', fontWeight: '600', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#f59e0b', color: '#fff', fontWeight: '700', cursor: 'pointer' }}>
                  Complete Device Swap
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
