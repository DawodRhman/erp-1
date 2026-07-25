import React, { useState, useEffect, useMemo } from 'react';
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
  Trash2,
  Edit,
  Car,
  ShieldAlert,
  ArrowRightLeft,
} from 'lucide-react';
import {
  inventoryApi,
  InventorySummary,
  ItemCategory,
  Product,
  InventoryItem,
  Vendor,
  Customer,
  CustomerVehicle,
  PurchaseOrder,
  Invoice,
  TrackerInstallation,
  CustomerComplaint,
} from '../services/inventoryService';
import { toast } from 'sonner';

export default function Inventory() {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'products' | 'serials' | 'po' | 'invoices' | 'customers' | 'installations'
  >('overview');

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<CustomerVehicle[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [installations, setInstallations] = useState<TrackerInstallation[]>([]);
  const [complaints, setComplaints] = useState<CustomerComplaint[]>([]);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedProductType, setSelectedProductType] = useState('');
  const [selectedTrackingType, setSelectedTrackingType] = useState('');
  const [selectedStockStatus, setSelectedStockStatus] = useState('');
  const [selectedSerialStatus, setSelectedSerialStatus] = useState('');

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

  const loadData = async () => {
    setLoading(true);
    try {
      const [sumRes, catRes, prodRes, itemRes, venRes, custRes, poRes, invRes, instRes, compRes] =
        await Promise.all([
          inventoryApi.getSummary().catch(() => null),
          inventoryApi.getCategories().catch(() => []),
          inventoryApi.getProducts().catch(() => []),
          inventoryApi.getItems().catch(() => []),
          inventoryApi.getVendors().catch(() => []),
          inventoryApi.getCustomers().catch(() => []),
          inventoryApi.getPurchaseOrders().catch(() => []),
          inventoryApi.getInvoices().catch(() => []),
          inventoryApi.getInstallations().catch(() => []),
          inventoryApi.getComplaints().catch(() => []),
        ]);

      setSummary(sumRes);
      setCategories(catRes);
      setProducts(prodRes);
      setItems(itemRes);
      setVendors(venRes);
      setCustomers(custRes);
      setPurchaseOrders(poRes);
      setInvoices(invRes);
      setInstallations(instRes);
      setComplaints(compRes);
    } catch (err: any) {
      toast.error('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto min-h-screen text-slate-800 dark:text-slate-100">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl text-white shadow-xl border border-indigo-900/40">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600/30 border border-indigo-500/40 rounded-xl backdrop-blur-sm">
              <Package className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Inventory & Invoicing Management</h1>
              <p className="text-sm text-indigo-200/80">
                Real-time stock tracking, serial/IMEI management, procurement, sales, and tracker installations.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-sm font-medium transition backdrop-blur-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowAddCategoryModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded-xl text-sm font-medium shadow-md transition"
          >
            <Layers className="w-4 h-4" />
            + Category
          </button>
          <button
            onClick={() => setShowAddProductModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            + New Product
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Catalog Products</span>
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Box className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{summary?.total_products || 0}</span>
            <div className="text-xs text-slate-500 mt-1">Value: {formatCurrency(summary?.total_inventory_value)}</div>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Low Stock Warnings</span>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{summary?.low_stock_count || 0}</span>
            <div className="text-xs text-slate-500 mt-1">At or below reorder minimums</div>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Serials / IMEIs</span>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Barcode className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{summary?.total_serials || 0}</span>
            <div className="text-xs text-slate-500 mt-1">
              Available: <span className="font-semibold text-emerald-600">{summary?.available_serials || 0}</span> | Installed:{' '}
              <span className="font-semibold text-indigo-600">{summary?.installed_serials || 0}</span>
            </div>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Complaints / Inst.</span>
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-xl">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{summary?.active_complaints || 0}</span>
            <div className="text-xs text-slate-500 mt-1">
              Pending Installations: <span className="font-semibold text-indigo-600">{summary?.pending_installations || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1">
        {[
          { id: 'overview', label: 'Overview & Alerts', icon: TrendingUp },
          { id: 'products', label: `Products (${products.length})`, icon: Box },
          { id: 'serials', label: `Serial Tracking (${items.length})`, icon: Barcode },
          { id: 'po', label: `Purchase Orders (${purchaseOrders.length})`, icon: ShoppingCart },
          { id: 'invoices', label: `Sales Invoices (${invoices.length})`, icon: Receipt },
          { id: 'customers', label: `Customers (${customers.length})`, icon: Users },
          { id: 'installations', label: `Tracker Installations (${installations.length})`, icon: Wrench },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Low Stock Alert Panel */}
            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <h2 className="text-lg font-bold">Low Stock & Reorder Alerts</h2>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded-full">
                  Action Recommended
                </span>
              </div>

              {products.filter((p) => p.quantity <= p.min_stock_level).length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  All inventory stock levels are healthy!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase text-xs">
                      <tr>
                        <th className="px-4 py-3 rounded-l-lg">Product Name</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Current Stock</th>
                        <th className="px-4 py-3">Min Threshold</th>
                        <th className="px-4 py-3 rounded-r-lg">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {products
                        .filter((p) => p.quantity <= p.min_stock_level)
                        .map((prod) => (
                          <tr key={prod.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                            <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{prod.product_name}</td>
                            <td className="px-4 py-3 text-slate-500">{prod.category_name || 'Unassigned'}</td>
                            <td className="px-4 py-3 font-bold text-amber-600">{prod.quantity}</td>
                            <td className="px-4 py-3 text-slate-500">{prod.min_stock_level}</td>
                            <td className="px-4 py-3">
                              {prod.quantity === 0 ? (
                                <span className="px-2.5 py-1 text-xs font-semibold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 rounded-full">
                                  OUT OF STOCK
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 rounded-full">
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
          <div className="space-y-6">
            <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <h3 className="text-base font-bold mb-2">Quick Management Actions</h3>
              <button
                onClick={() => setShowAddProductModal(true)}
                className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 rounded-xl text-sm font-semibold transition"
              >
                <span className="flex items-center gap-2">
                  <Box className="w-4 h-4 text-indigo-500" /> Create Product
                </span>
                <Plus className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => setShowAddSerialModal(true)}
                className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 rounded-xl text-sm font-semibold transition"
              >
                <span className="flex items-center gap-2">
                  <Barcode className="w-4 h-4 text-emerald-500" /> Log Serial / IMEI Item
                </span>
                <Plus className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => setShowCustomerModal(true)}
                className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 rounded-xl text-sm font-semibold transition"
              >
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" /> Register Customer
                </span>
                <Plus className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => setShowInstallationModal(true)}
                className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 rounded-xl text-sm font-semibold transition"
              >
                <span className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-violet-500" /> Log Tracker Installation
                </span>
                <Plus className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => setShowComplaintModal(true)}
                className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 rounded-xl text-sm font-semibold transition"
              >
                <span className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-500" /> Log Customer Complaint Ticket
                </span>
                <Plus className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => setShowReplacementModal(true)}
                className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 rounded-xl text-sm font-semibold transition"
              >
                <span className="flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-amber-500" /> Record Device Swap / Replacement
                </span>
                <Plus className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCTS */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          {/* Enhanced Filter Bar */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.category_name}
                  </option>
                ))}
              </select>

              <select
                value={selectedProductType}
                onChange={(e) => setSelectedProductType(e.target.value)}
                className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none"
              >
                <option value="">All Product Types</option>
                <option value="ASSET">ASSET</option>
                <option value="CONSUMABLE">CONSUMABLE</option>
                <option value="SERVICE">SERVICE</option>
              </select>

              <select
                value={selectedTrackingType}
                onChange={(e) => setSelectedTrackingType(e.target.value)}
                className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none"
              >
                <option value="">All Tracking Types</option>
                <option value="SERIAL">SERIAL</option>
                <option value="IMEI">IMEI</option>
                <option value="NONE">NONE</option>
              </select>

              <select
                value={selectedStockStatus}
                onChange={(e) => setSelectedStockStatus(e.target.value)}
                className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none"
              >
                <option value="">All Stock Levels</option>
                <option value="in_stock">In Stock (&gt;0)</option>
                <option value="low_stock">Low Stock (At/Below Min)</option>
                <option value="out_of_stock">Out of Stock (=0)</option>
              </select>
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-xs border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4">Product Name</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Tracking</th>
                    <th className="px-6 py-4">In Stock</th>
                    <th className="px-6 py-4">Unit Price</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                        No products match your search/filters.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((prod) => (
                      <tr key={prod.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                          {prod.product_name}
                          {prod.description && <div className="text-xs font-normal text-slate-400">{prod.description}</div>}
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                          <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium">
                            {prod.category_name || 'General'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded text-xs font-semibold">
                            {prod.product_type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded text-xs font-semibold">
                            {prod.tracking_type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`font-bold ${
                              prod.quantity === 0
                                ? 'text-rose-600'
                                : prod.quantity <= prod.min_stock_level
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                            }`}
                          >
                            {prod.quantity}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium">{formatCurrency(prod.unit_price)}</td>
                        <td className="px-6 py-4">
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
                            className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
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
        <div className="space-y-4">
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search serial / IMEI / product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <select
                value={selectedSerialStatus}
                onChange={(e) => setSelectedSerialStatus(e.target.value)}
                className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none"
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
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold"
              >
                <Plus className="w-4 h-4" /> + Log Serial
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-xs border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">Serial No</th>
                  <th className="px-6 py-4">IMEI</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      No serial items found.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{item.product_name}</td>
                      <td className="px-6 py-4 font-mono text-xs">{item.serial_number || 'N/A'}</td>
                      <td className="px-6 py-4 font-mono text-xs">{item.imei || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                            item.current_status === 'AVAILABLE'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : item.current_status === 'INSTALLED'
                              ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                              : item.current_status === 'DAMAGED'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {item.current_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{item.location || 'Warehouse Main'}</td>
                      <td className="px-6 py-4">
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
                          className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs"
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

      {/* TAB 6: CUSTOMERS & SPECIAL INVOICE DRAFTS */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <h3 className="text-base font-bold">Customer Registry & Special Invoice Draft Templates</h3>
            <button onClick={() => setShowCustomerModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold">
              <Plus className="w-4 h-4" /> + Register Customer
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-xs border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Customer / Company</th>
                  <th className="px-6 py-4">Contact Person</th>
                  <th className="px-6 py-4">Phone / Email</th>
                  <th className="px-6 py-4">Vehicles</th>
                  <th className="px-6 py-4">Special Invoice Draft Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      No customers registered yet.
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{c.customer_name}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{c.contact_person || 'N/A'}</td>
                      <td className="px-6 py-4 text-xs font-mono">{c.phone || c.email || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-semibold text-xs">
                          {c.vehicle_count || 0} Vehicles
                        </span>
                      </td>
                      <td className="px-6 py-4 flex items-center gap-2">
                        <button
                          onClick={() => handleOpenCustomerDraftModal(c)}
                          className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 rounded-lg text-xs font-semibold transition"
                        >
                          Config Special Draft
                        </button>
                        <button
                          onClick={() => handleGenerateDraftInvoice(c)}
                          className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold shadow hover:bg-emerald-500 transition"
                        >
                          + Spawn Draft Invoice
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold">Create New Catalog Product</h3>
              <button onClick={() => setShowAddProductModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={newProduct.product_name}
                  onChange={(e) => setNewProduct({ ...newProduct, product_name: e.target.value })}
                  placeholder="e.g. GPS Tracker GT-900"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Category</label>
                  <select
                    value={newProduct.category_id}
                    onChange={(e) => setNewProduct({ ...newProduct, category_id: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.category_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium mb-1">Product Type</label>
                  <select
                    value={newProduct.product_type}
                    onChange={(e) => setNewProduct({ ...newProduct, product_type: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="ASSET">ASSET</option>
                    <option value="CONSUMABLE">CONSUMABLE</option>
                    <option value="SERVICE">SERVICE</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium mb-1">Tracking Type</label>
                  <select
                    value={newProduct.tracking_type}
                    onChange={(e) => setNewProduct({ ...newProduct, tracking_type: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  >
                    <option value="SERIAL">SERIAL</option>
                    <option value="IMEI">IMEI</option>
                    <option value="NONE">NONE</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium mb-1">Stock Qty</label>
                  <input
                    type="number"
                    min={0}
                    value={newProduct.quantity}
                    onChange={(e) => setNewProduct({ ...newProduct, quantity: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1">Min Reorder</label>
                  <input
                    type="number"
                    min={0}
                    value={newProduct.min_stock_level}
                    onChange={(e) => setNewProduct({ ...newProduct, min_stock_level: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Unit Selling Price (PKR)</label>
                  <input
                    type="number"
                    min={0}
                    value={newProduct.unit_price}
                    onChange={(e) => setNewProduct({ ...newProduct, unit_price: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1">Cost Price (PKR)</label>
                  <input
                    type="number"
                    min={0}
                    value={newProduct.cost_price}
                    onChange={(e) => setNewProduct({ ...newProduct, cost_price: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-xl">
                  Create Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD CATEGORY */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold">Add Item Category</h3>
            <form onSubmit={handleCreateCategory} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={newCategory.category_name}
                  onChange={(e) => setNewCategory({ ...newCategory, category_name: e.target.value })}
                  placeholder="e.g. Trackers, Accessories"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Description</label>
                <input
                  type="text"
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddCategoryModal(false)} className="px-4 py-2 bg-slate-100 rounded-xl">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-xl">
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD SERIAL */}
      {showAddSerialModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold">Log Inventory Serial / IMEI</h3>
            <form onSubmit={handleCreateSerial} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium mb-1">Select Product *</label>
                <select
                  required
                  value={newSerial.product_id}
                  onChange={(e) => setNewSerial({ ...newSerial, product_id: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                >
                  <option value="">Select Product</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.product_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Serial Number</label>
                <input
                  type="text"
                  value={newSerial.serial_number}
                  onChange={(e) => setNewSerial({ ...newSerial, serial_number: e.target.value })}
                  placeholder="SN-100203"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">IMEI Number</label>
                <input
                  type="text"
                  value={newSerial.imei}
                  onChange={(e) => setNewSerial({ ...newSerial, imei: e.target.value })}
                  placeholder="86920194819201"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Warehouse Location</label>
                <input
                  type="text"
                  value={newSerial.location}
                  onChange={(e) => setNewSerial({ ...newSerial, location: e.target.value })}
                  placeholder="Shelf A-3"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddSerialModal(false)} className="px-4 py-2 bg-slate-100 rounded-xl">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white font-semibold rounded-xl">
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD CUSTOMER */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold">Register Customer</h3>
            <form onSubmit={handleCreateCustomer} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium mb-1">Customer / Company Name *</label>
                <input
                  type="text"
                  required
                  value={newCustomer.customer_name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, customer_name: e.target.value })}
                  placeholder="e.g. Apex Logistics"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Contact Person</label>
                <input
                  type="text"
                  value={newCustomer.contact_person}
                  onChange={(e) => setNewCustomer({ ...newCustomer, contact_person: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Phone Number</label>
                <input
                  type="text"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCustomerModal(false)} className="px-4 py-2 bg-slate-100 rounded-xl">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-xl">
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TRACKER INSTALLATION */}
      {showInstallationModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold">Log Tracker Installation</h3>
            <form onSubmit={handleCreateInstallation} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium mb-1">Customer *</label>
                <select
                  required
                  value={newInstallation.customer_id}
                  onChange={(e) => setNewInstallation({ ...newInstallation, customer_id: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                >
                  <option value="">Select Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.customer_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Tracker Device Serial</label>
                <select
                  value={newInstallation.tracker_item_id}
                  onChange={(e) => setNewInstallation({ ...newInstallation, tracker_item_id: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                >
                  <option value="">Select Available Serial</option>
                  {items
                    .filter((i) => i.current_status === 'AVAILABLE')
                    .map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.product_name} - {i.serial_number || i.imei}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Technician Name</label>
                <input
                  type="text"
                  value={newInstallation.technician_name}
                  onChange={(e) => setNewInstallation({ ...newInstallation, technician_name: e.target.value })}
                  placeholder="e.g. Tariq Mehmood"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowInstallationModal(false)} className="px-4 py-2 bg-slate-100 rounded-xl">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-violet-600 text-white font-semibold rounded-xl">
                  Log Installation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: COMPLAINT */}
      {showComplaintModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold">Log Customer Complaint</h3>
            <form onSubmit={handleCreateComplaint} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium mb-1">Customer *</label>
                <select
                  required
                  value={newComplaint.customer_id}
                  onChange={(e) => setNewComplaint({ ...newComplaint, customer_id: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                >
                  <option value="">Select Customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.customer_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Complaint Type</label>
                <select
                  value={newComplaint.complaint_type}
                  onChange={(e) => setNewComplaint({ ...newComplaint, complaint_type: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                >
                  <option value="DEVICE_OFFLINE">DEVICE_OFFLINE</option>
                  <option value="LOCATION_INACCURATE">LOCATION_INACCURATE</option>
                  <option value="PHYSICAL_DAMAGE">PHYSICAL_DAMAGE</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Description</label>
                <textarea
                  value={newComplaint.description}
                  onChange={(e) => setNewComplaint({ ...newComplaint, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowComplaintModal(false)} className="px-4 py-2 bg-slate-100 rounded-xl">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-rose-600 text-white font-semibold rounded-xl">
                  Submit Complaint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DEVICE REPLACEMENT / SWAP */}
      {showReplacementModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold">Record Device Swap / Replacement</h3>
            <form onSubmit={handleCreateReplacement} className="space-y-4 text-sm">
              <div>
                <label className="block font-medium mb-1">Current/Faulty Device (Old Serial) *</label>
                <select
                  required
                  value={newReplacement.old_inventory_item_id}
                  onChange={(e) => setNewReplacement({ ...newReplacement, old_inventory_item_id: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
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
                <label className="block font-medium mb-1">Replacement Device (New Available Serial) *</label>
                <select
                  required
                  value={newReplacement.new_inventory_item_id}
                  onChange={(e) => setNewReplacement({ ...newReplacement, new_inventory_item_id: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
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
                <label className="block font-medium mb-1">Reason for Swap</label>
                <input
                  type="text"
                  value={newReplacement.reason}
                  onChange={(e) => setNewReplacement({ ...newReplacement, reason: e.target.value })}
                  placeholder="e.g. Defective GPS module, antenna issue"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowReplacementModal(false)} className="px-4 py-2 bg-slate-100 rounded-xl">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-amber-600 text-white font-semibold rounded-xl">
                  Complete Device Swap
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CUSTOMER INVOICE DRAFT TEMPLATE CONFIG */}
      {showCustomerDraftModal && selectedCustomerForDraft && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold">Special Invoice Draft Template</h3>
                <p className="text-xs text-slate-500">Configuring default invoice rules for {selectedCustomerForDraft.customer_name}</p>
              </div>
              <button onClick={() => setShowCustomerDraftModal(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomerDraft} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Payment Terms</label>
                  <select
                    value={customerDraftData.payment_terms}
                    onChange={(e) => setCustomerDraftData({ ...customerDraftData, payment_terms: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  >
                    <option value="NET15">NET 15 Days</option>
                    <option value="NET30">NET 30 Days</option>
                    <option value="DUE_ON_RECEIPT">Due On Receipt</option>
                    <option value="ADVANCE">Advance Payment</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium mb-1">Default Discount %</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={customerDraftData.default_discount_pct}
                    onChange={(e) => setCustomerDraftData({ ...customerDraftData, default_discount_pct: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1">Custom Notes / Bank Disclaimers</label>
                <textarea
                  value={customerDraftData.custom_notes}
                  onChange={(e) => setCustomerDraftData({ ...customerDraftData, custom_notes: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => setShowCustomerDraftModal(false)} className="px-4 py-2 bg-slate-100 rounded-xl">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-xl">
                  Save Special Draft Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

