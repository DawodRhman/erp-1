import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Boxes, CheckCircle2, ChevronLeft, ChevronRight, Edit3, History, ImagePlus, MapPin, PackagePlus, Plus, RefreshCw, Search, ScanBarcode, Tag, Upload, X } from 'lucide-react';
import { useToastContext } from '../../context/ToastContext';
import { useInventoryLiveEvents } from '../../hooks/useInventoryLiveEvents';
import { inventoryApi, InventoryLocation, InventoryMovement, ItemCategory, Product, ProductCustomFieldDefinition, ProductInput, Vendor } from '../../services/inventoryService';
import { resolveApiAssetUrl } from '../../utils/assetUrl';
import './inventory-products.css';

const money = (value: number | string | undefined) => `PKR ${Number(value || 0).toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
const dateTime = (value?: string) => value ? new Date(value).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' }) : '-';
const stockOf = (product: Product) => Number(product.available_count ?? product.quantity ?? 0);
const CATALOG_PAGE_SIZE = 20;

function skuPart(value: string | undefined, maxLength: number) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');
}

export function buildProductSkuPreview(brandMake?: string, modelNo?: string) {
  return [skuPart(brandMake, 14), skuPart(modelNo, 24)].filter(Boolean).join('-');
}

function ProductHeader({ title, description, actions }: { title: string; description: string; actions?: React.ReactNode }) {
  return <header className="inventory-product-hero"><div><span>Inventory Master</span><h1>{title}</h1><p>{description}</p></div>{actions && <div className="inventory-product-hero__actions">{actions}</div>}</header>;
}

function StockBadge({ product }: { product: Product }) {
  if (product.product_type === 'SERVICE') return <span className="stock-badge stock-badge--neutral">Service</span>;
  const quantity = stockOf(product);
  if (quantity === 0) return <span className="stock-badge stock-badge--danger">Out of stock</span>;
  if (quantity <= Number(product.min_stock_level || 0)) return <span className="stock-badge stock-badge--warning">Low stock</span>;
  return <span className="stock-badge stock-badge--success">In stock</span>;
}

export function InventoryProductCatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('ALL');
  const [type, setType] = useState('ALL');
  const [stock, setStock] = useState('ALL');
  const [page, setPage] = useState(1);
  const load = useCallback(async () => {
    try {
      const [productRows, categoryRows] = await Promise.all([inventoryApi.getProducts({ limit: 500 }), inventoryApi.getCategories()]);
      setProducts(productRows); setCategories(categoryRows);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useInventoryLiveEvents(load);

  const filtered = useMemo(() => products.filter((product) => {
    const haystack = [product.product_name, product.sku, product.model_no, product.category_name, product.brand_make].join(' ').toLowerCase();
    const quantity = stockOf(product); const minimum = Number(product.min_stock_level || 0);
    const stockMatch = stock === 'ALL' || (stock === 'AVAILABLE' && quantity > minimum) || (stock === 'LOW' && quantity > 0 && quantity <= minimum) || (stock === 'OUT' && quantity === 0);
    return haystack.includes(query.toLowerCase()) && (category === 'ALL' || product.category_id === category) && (type === 'ALL' || product.product_type === type) && stockMatch;
  }), [products, query, category, type, stock]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / CATALOG_PAGE_SIZE));
  const visibleProducts = filtered.slice((page - 1) * CATALOG_PAGE_SIZE, page * CATALOG_PAGE_SIZE);
  useEffect(() => { setPage(1); }, [query, category, type, stock]);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);

  const metrics = {
    total: products.length,
    units: products.filter((p) => p.product_type !== 'SERVICE').reduce((sum, p) => sum + stockOf(p), 0),
    low: products.filter((p) => p.product_type !== 'SERVICE' && stockOf(p) <= Number(p.min_stock_level || 0)).length,
    serialized: products.filter((p) => p.tracking_type !== 'NONE').length,
  };

  return <main className="inventory-products-page">
    <ProductHeader title="Product Catalog" description="One searchable source for products, services, stock thresholds, selling prices and traceability." actions={<Link className="inventory-action inventory-action--primary" to="/inventory/products/new"><Plus size={16} /> Add product</Link>} />
    <section className="catalog-metrics">
      <div><Tag size={18} /><span>Catalog records</span><strong>{metrics.total}</strong></div><div><Boxes size={18} /><span>Available units</span><strong>{metrics.units}</strong></div><div><AlertTriangle size={18} /><span>Low stock</span><strong>{metrics.low}</strong></div><div><ScanBarcode size={18} /><span>Serial tracked</span><strong>{metrics.serialized}</strong></div>
    </section>
    <section className="catalog-toolbar">
      <label className="catalog-search"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search product, SKU, model or brand" /></label>
      <select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)}><option value="ALL">All categories</option>{categories.map((row) => <option key={row.id} value={row.id}>{row.category_name}</option>)}</select>
      <select aria-label="Type" value={type} onChange={(e) => setType(e.target.value)}><option value="ALL">All types</option><option value="ASSET">Assets</option><option value="CONSUMABLE">Consumables</option><option value="SERVICE">Services</option><option value="RENTAL">Rentals</option><option value="LICENSE">Licenses</option></select>
      <select aria-label="Stock" value={stock} onChange={(e) => setStock(e.target.value)}><option value="ALL">All stock levels</option><option value="AVAILABLE">In stock</option><option value="LOW">Low stock</option><option value="OUT">Out of stock</option></select>
      <button className="inventory-action" onClick={load}><RefreshCw size={15} /> Refresh</button>
    </section>
    <section className="catalog-table-wrap"><table className="catalog-table"><thead><tr><th>Product</th><th>Category / Type</th><th>Location</th><th>Available</th><th>Selling price</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      {!loading && visibleProducts.map((product) => <tr key={product.id}>
        <td data-label="Product"><Link className="product-name-link" to={`/inventory/products/${product.id}`}>{product.product_name}</Link><small>{product.sku || 'No SKU'}{product.model_no ? ` | ${product.model_no}` : ''}</small></td>
        <td data-label="Category"><strong>{product.category_name || 'Uncategorized'}</strong><small>{product.product_type} | {product.tracking_type === 'NONE' ? 'Quantity tracked' : product.tracking_type}</small></td>
        <td data-label="Location"><strong>{product.product_type === 'SERVICE' ? 'Not applicable' : product.warehouse_location || 'Not assigned'}</strong><small>{[product.room_number, product.rack_number].filter(Boolean).join(' / ')}</small></td>
        <td data-label="Available"><strong className="catalog-quantity">{product.product_type === 'SERVICE' ? '-' : stockOf(product)}</strong><small>{product.product_type === 'SERVICE' ? '' : `Minimum ${Number(product.min_stock_level || 0)}`}</small></td>
        <td data-label="Selling price"><strong>{money(product.selling_price ?? product.unit_price)}</strong></td><td data-label="Status"><StockBadge product={product} /></td>
        <td data-label="Actions"><div className="catalog-row-actions"><Link to={`/inventory/products/${product.id}`}>View</Link><Link to={`/inventory/products/${product.id}/edit`}><Edit3 size={13} /> Edit</Link></div></td>
      </tr>)}
      {!loading && !filtered.length && <tr><td colSpan={7} className="catalog-empty">No products match the selected filters.</td></tr>}{loading && <tr><td colSpan={7} className="catalog-empty">Loading product catalog...</td></tr>}
    </tbody></table>
      {!loading && filtered.length > 0 && <nav className="catalog-pagination" aria-label="Product catalog pages">
        <span>Showing {(page - 1) * CATALOG_PAGE_SIZE + 1}-{Math.min(page * CATALOG_PAGE_SIZE, filtered.length)} of {filtered.length}</span>
        <div>
          <button type="button" className="inventory-action" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft size={15} /> Previous</button>
          <strong>Page {page} of {pageCount}</strong>
          <button type="button" className="inventory-action" disabled={page === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next <ChevronRight size={15} /></button>
        </div>
      </nav>}
    </section>
  </main>;
}

const initialDraft: ProductInput = { product_name: '', category_id: '', sub_category: '', brand_make: '', condition: 'NEW', sku: '', model_no: '', product_type: 'ASSET', tracking_type: 'NONE', min_stock_level: 5, reorder_quantity: 0, preferred_vendor_id: '', selling_price: 0, cost_price: 0, initial_quantity: 0, serial_numbers: [], country_of_origin: '', batch_lot_number: '', expiry_date: '', warranty_date: '', product_image_url: '', warehouse_location: 'Main Warehouse', room_number: '', rack_number: '', description: '', custom_attributes: {} };

export function InventoryProductFormPage() {
  const { id } = useParams(); const editing = Boolean(id); const navigate = useNavigate(); const { showToast } = useToastContext();
  const [draft, setDraft] = useState<ProductInput>(initialDraft); const [categories, setCategories] = useState<ItemCategory[]>([]); const [vendors, setVendors] = useState<Vendor[]>([]); const [locations, setLocations] = useState<InventoryLocation[]>([]); const [customFields, setCustomFields] = useState<ProductCustomFieldDefinition[]>([]); const [serialText, setSerialText] = useState(''); const [saving, setSaving] = useState(false); const [uploadingImage, setUploadingImage] = useState(false); const [imageFile, setImageFile] = useState<File | null>(null); const [imagePreview, setImagePreview] = useState('');
  useEffect(() => { Promise.all([inventoryApi.getCategories(), inventoryApi.getVendors(), inventoryApi.getLocations({ active_only: true }).catch(() => []), inventoryApi.getProductCustomFields(), editing ? inventoryApi.getProduct(id!) : Promise.resolve(null)]).then(([categoryRows, vendorRows, locationRows, fields, product]) => { setCategories(categoryRows); setVendors(vendorRows); setLocations(locationRows); setCustomFields(fields.filter((field) => String(field.applies_to).toUpperCase() === 'PRODUCT')); if (product) setDraft({ ...initialDraft, ...product, initial_quantity: 0, serial_numbers: [] }); }); }, [editing, id]);
  useEffect(() => () => { if (imagePreview) URL.revokeObjectURL(imagePreview); }, [imagePreview]);
  const set = (key: keyof ProductInput, value: any) => setDraft((current) => ({ ...current, [key]: value })); const serialTracking = draft.tracking_type === 'SERIAL' || draft.tracking_type === 'IMEI'; const service = draft.product_type === 'SERVICE';
  const setIdentity = (key: 'brand_make' | 'model_no', value: string) => setDraft((current) => {
    const next = { ...current, [key]: value };
    return { ...next, sku: buildProductSkuPreview(next.brand_make, next.model_no) };
  });
  const selectImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return showToast('Choose a JPG, PNG or WebP image.', 'error');
    if (file.size > 5 * 1024 * 1024) return showToast('Product image must be 5 MB or smaller.', 'error');
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };
  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    set('product_image_url', '');
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (!draft.product_name?.trim() || !draft.category_id) return showToast('Product name and category are required.', 'error');
    const serialNumbers = serialText.split(/\r?\n|,/).map((value) => value.trim()).filter(Boolean);
    if (!editing && serialTracking && Number(draft.initial_quantity || 0) !== serialNumbers.length) return showToast(`Enter exactly ${Number(draft.initial_quantity || 0)} unique serial/IMEI number(s).`, 'error');
    setSaving(true); try {
      let productImageUrl = draft.product_image_url || '';
      if (imageFile) {
        setUploadingImage(true);
        const image = await inventoryApi.uploadProductImage(imageFile);
        productImageUrl = image.url;
        setUploadingImage(false);
      }
      const payload: ProductInput = { ...draft, sku: buildProductSkuPreview(draft.brand_make, draft.model_no) || draft.sku, product_image_url: productImageUrl, unit_price: Number(draft.selling_price || 0), serial_numbers: serialNumbers };
      const saved = editing ? await inventoryApi.updateProduct(id!, payload) : await inventoryApi.createProduct(payload);
      showToast(editing ? 'Product details updated.' : 'Product and stock settings saved.', 'success');
      navigate(`/inventory/products/${saved.id}`);
    } catch (error: any) {
      showToast(error?.response?.data?.error?.message || 'Product could not be saved.', 'error');
    } finally { setSaving(false); setUploadingImage(false); }
  };
  const productImage = imagePreview || resolveApiAssetUrl(draft.product_image_url);
  return <main className="inventory-products-page"><ProductHeader title={editing ? 'Edit Product' : 'Add Product'} description={editing ? 'Update catalog, pricing, stock controls and storage details.' : 'Create a product record with clear stock controls and a catalog image.'} actions={<Link className="inventory-action inventory-action--light" to={editing ? `/inventory/products/${id}` : '/inventory/products'}><ArrowLeft size={15} /> Cancel</Link>} />
    <form className="product-form" onSubmit={submit}>
      <FormSection icon={<Tag size={18} />} title="Product identity" description="Commercial and classification details used throughout ERP."><div className="product-form-grid">
        <Field label="Product name" required><input value={draft.product_name || ''} onChange={(e) => set('product_name', e.target.value)} /></Field><Field label="Category" required><select value={draft.category_id || ''} onChange={(e) => set('category_id', e.target.value)}><option value="">Select category</option>{categories.map((row) => <option key={row.id} value={row.id}>{row.category_name}</option>)}</select></Field><Field label="Sub-category"><input value={draft.sub_category || ''} onChange={(e) => set('sub_category', e.target.value)} /></Field><Field label="Product type"><select value={draft.product_type} onChange={(e) => { const value = e.target.value as Product['product_type']; setDraft((current) => ({ ...current, product_type: value, tracking_type: value === 'SERVICE' ? 'NONE' : current.tracking_type, initial_quantity: value === 'SERVICE' ? 0 : current.initial_quantity })); }}><option value="ASSET">Asset</option><option value="CONSUMABLE">Consumable</option><option value="SERVICE">Service</option><option value="RENTAL">Rental asset</option><option value="LICENSE">License</option></select></Field>
        <Field label="Brand / Make"><input value={draft.brand_make || ''} onChange={(e) => setIdentity('brand_make', e.target.value)} placeholder="e.g. Hikvision" /></Field><Field label="Model number"><input value={draft.model_no || ''} onChange={(e) => setIdentity('model_no', e.target.value)} placeholder="e.g. DS-2CD2143G2" /></Field><Field label="SKU (automatic)"><div className="sku-preview"><input value={draft.sku || ''} readOnly placeholder="Generated from brand and model" /><small>One SKU identifies this catalog model. Every physical unit can still have its own serial or IMEI.</small></div></Field><Field label="Condition"><select value={draft.condition} onChange={(e) => set('condition', e.target.value)}><option value="NEW">New</option><option value="USED">Used</option><option value="REFURBISHED">Refurbished</option></select></Field><Field label="Description" wide><textarea value={draft.description || ''} onChange={(e) => set('description', e.target.value)} /></Field>
      </div></FormSection>
      <FormSection icon={<Boxes size={18} />} title="Inventory control and storage" description="Choose how units are counted, when a restock alert appears, and where the product is stored."><div className="inventory-control-help"><strong>Choose a tracking method</strong><span>Use Quantity only for items counted in bulk. Choose Serial number or IMEI when every physical unit needs its own identity and history.</span></div><div className="product-form-grid">
        {!service && <Field label="Stock tracking method"><select value={draft.tracking_type} onChange={(e) => set('tracking_type', e.target.value)}><option value="NONE">Quantity only</option><option value="SERIAL">Serial number per unit</option><option value="IMEI">IMEI per unit</option><option value="BATCH">Batch / lot</option></select></Field>}{!service && <Field label="Reorder alert level"><div className="field-with-help"><input type="number" min="0" value={draft.min_stock_level || 0} onChange={(e) => set('min_stock_level', Number(e.target.value))} /><small>Dashboard warns when available stock reaches this level.</small></div></Field>}{!service && <Field label="Suggested reorder quantity"><input type="number" min="0" value={draft.reorder_quantity || 0} onChange={(e) => set('reorder_quantity', Number(e.target.value))} /></Field>}{!service && <Field label="Preferred vendor"><select value={draft.preferred_vendor_id || ''} onChange={(e) => set('preferred_vendor_id', e.target.value)}><option value="">No preferred vendor</option>{vendors.filter((vendor) => vendor.status !== 'INACTIVE').map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select></Field>}{!service && !editing && <Field label="Quantity received now"><div className="field-with-help"><input type="number" min="0" step="1" value={draft.initial_quantity || 0} onChange={(e) => set('initial_quantity', Number(e.target.value))} /><small>Enter only stock physically available today; otherwise keep zero.</small></div></Field>}{!service && !editing && <Field label="Purchase price per unit"><div className="field-with-help"><input type="number" min="0" step="0.01" value={draft.cost_price || 0} onChange={(e) => set('cost_price', Number(e.target.value))} /><small>Internal cost for this first receipt; hidden from CRM and sales.</small></div></Field>}{!service && !editing && serialTracking && Number(draft.initial_quantity || 0) > 0 && <Field label={`${draft.tracking_type === 'IMEI' ? 'IMEI' : 'Serial'} numbers`} wide><textarea value={serialText} onChange={(e) => setSerialText(e.target.value)} placeholder="Enter one unique identifier per line" /></Field>}
        {!service && <Field label="Storage location"><select value={locations.find((location) => location.warehouse_name === draft.warehouse_location && (location.room_number || '') === (draft.room_number || '') && (location.rack_number || '') === (draft.rack_number || ''))?.id || ''} onChange={(e) => { const location = locations.find((row) => row.id === e.target.value); if (location) setDraft((current) => ({ ...current, warehouse_location: location.warehouse_name, room_number: location.room_number || '', rack_number: location.rack_number || '' })); }}><option value="">Select configured location</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.location_code} - {location.warehouse_name}{location.room_number ? ` / Room ${location.room_number}` : ''}{location.rack_number ? ` / Rack ${location.rack_number}` : ''}</option>)}</select></Field>}{!service && <Field label="Warehouse"><input value={draft.warehouse_location || ''} readOnly /></Field>}{!service && <Field label="Room number"><input value={draft.room_number || ''} readOnly /></Field>}{!service && <Field label="Rack number"><input value={draft.rack_number || ''} readOnly /></Field>}{!service && <Field label="Batch / Lot"><input value={draft.batch_lot_number || ''} onChange={(e) => set('batch_lot_number', e.target.value)} /></Field>}{!service && <Field label="Expiry date"><input type="date" value={(draft.expiry_date || '').slice(0, 10)} onChange={(e) => set('expiry_date', e.target.value)} /></Field>}{!service && <Field label="Warranty date"><input type="date" value={(draft.warranty_date || '').slice(0, 10)} onChange={(e) => set('warranty_date', e.target.value)} /></Field>}
      </div></FormSection>
      <FormSection icon={<PackagePlus size={18} />} title="Sales and presentation" description="Selling price and product image are available to quotations and invoices. Purchase cost stays internal."><div className="product-form-grid"><Field label="Selling price (PKR)" required><input type="number" min="0" step="0.01" value={draft.selling_price || 0} onChange={(e) => set('selling_price', Number(e.target.value))} /></Field><Field label="Country of origin"><input value={draft.country_of_origin || ''} onChange={(e) => set('country_of_origin', e.target.value)} /></Field><Field label="Product image" wide><div className="product-image-uploader"><div className={`product-image-preview${productImage ? ' product-image-preview--filled' : ''}`}>{productImage ? <img src={productImage} alt="Selected product" /> : <><ImagePlus size={28} /><span>No image selected</span></>}</div><div className="product-image-actions"><label className="inventory-action inventory-action--light"><Upload size={15} /> {productImage ? 'Replace image' : 'Choose image'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectImage} /></label>{productImage && <button type="button" className="inventory-action inventory-action--danger" onClick={removeImage}><X size={15} /> Remove</button>}<small>Select a JPG, PNG or WebP file up to 5 MB. The system stores it securely; no URL is required.</small></div></div></Field>{customFields.map((field) => <Field key={field.id} label={field.label} required={field.required}><input value={draft.custom_attributes?.[field.field_key] || ''} onChange={(e) => set('custom_attributes', { ...(draft.custom_attributes || {}), [field.field_key]: e.target.value })} /></Field>)}</div></FormSection>
      <div className="product-form-actions"><Link className="inventory-action inventory-action--light" to="/inventory/products">Cancel</Link><button className="inventory-action inventory-action--primary" disabled={saving}>{saving ? uploadingImage ? 'Uploading image...' : 'Saving...' : editing ? 'Save changes' : 'Create product'}</button></div>
    </form></main>;
}

function FormSection({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) { return <section className="product-form-section"><div className="form-section-title">{icon}<div><h2>{title}</h2><p>{description}</p></div></div>{children}</section>; }
function Field({ label, required, wide, children }: { label: string; required?: boolean; wide?: boolean; children: React.ReactNode }) { return <div className={`product-field${wide ? ' product-field--wide' : ''}`}><span>{label}{required ? ' *' : ''}</span>{children}</div>; }

export function InventoryProductDetailPage() {
  const { id } = useParams(); const [product, setProduct] = useState<Product | null>(null); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { if (!id) return; try { setProduct(await inventoryApi.getProduct(id)); } finally { setLoading(false); } }, [id]);
  useEffect(() => { load(); }, [load]); useInventoryLiveEvents(load);
  if (loading) return <main className="inventory-products-page"><div className="catalog-empty">Loading product details...</div></main>;
  if (!product) return <main className="inventory-products-page"><div className="catalog-empty">Product not found.</div></main>;
  const movements = product.movements || []; const serials = product.serials || [];
  return <main className="inventory-products-page"><ProductHeader title={product.product_name} description={`${product.sku || 'No SKU'} | ${product.category_name || 'Uncategorized'} | ${product.product_type}`} actions={<><Link className="inventory-action inventory-action--light" to="/inventory/products"><ArrowLeft size={15} /> Catalog</Link><Link className="inventory-action inventory-action--primary" to={`/inventory/products/${product.id}/edit`}><Edit3 size={15} /> Edit</Link></>} />
    <section className="product-detail-summary">{product.product_image_url && <img src={resolveApiAssetUrl(product.product_image_url)} alt={product.product_name} />}<div><span>Stock position</span><strong>{product.product_type === 'SERVICE' ? 'Service' : `${stockOf(product)} available`}</strong><small>{product.product_type === 'SERVICE' ? 'No physical stock' : `On hand ${product.on_hand_count ?? product.quantity ?? 0} | Reserved ${product.reserved_count ?? 0}`}</small><StockBadge product={product} /></div><div><span>Selling price</span><strong>{money(product.selling_price ?? product.unit_price)}</strong><small>{product.brand_make || 'Brand not set'}</small></div><div><span>Tracking</span><strong>{product.tracking_type === 'NONE' ? 'Quantity' : product.tracking_type}</strong><small>{serials.length} registered identifier(s)</small></div><div><span>Storage</span><strong>{product.warehouse_location || 'Not assigned'}</strong><small>{[product.room_number, product.rack_number].filter(Boolean).join(' / ') || 'Room and rack not set'}</small></div></section>
    <section className="product-detail-grid"><div className="product-detail-panel"><div className="panel-heading"><History size={18} /><div><h2>Stock history</h2><p>Audited receipts, issues and returns.</p></div></div><MovementTable rows={movements} /></div><div className="product-detail-panel"><div className="panel-heading"><ScanBarcode size={18} /><div><h2>Serial register</h2><p>Current status for individually tracked units.</p></div></div>{serials.length ? <div className="serial-list">{serials.map((item) => <div key={item.id}><strong>{item.serial_number || item.imei}</strong><span>{item.current_status}</span><small><MapPin size={12} /> {item.location || product.warehouse_location || 'Warehouse'}</small></div>)}</div> : <div className="catalog-empty">This product is quantity tracked; no serial register is required.</div>}</div></section>
  </main>;
}

function MovementTable({ rows }: { rows: InventoryMovement[] }) { return <div className="movement-list">{rows.length ? rows.map((movement) => <div key={movement.id}><span className={`movement-icon movement-icon--${movement.movement_type.toLowerCase()}`}>{movement.movement_type === 'STOCK_IN' || movement.movement_type === 'RETURN' ? <CheckCircle2 size={15} /> : <Boxes size={15} />}</span><span><strong>{movement.movement_type.replace('_', ' ')}</strong><small>{movement.notes || movement.reference_type || 'Inventory transaction'}</small></span><span><strong>{movement.quantity}</strong><small>{dateTime(movement.created_at)}</small></span></div>) : <div className="catalog-empty">No stock movements recorded yet.</div>}</div>; }
