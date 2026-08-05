import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  Calculator,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Layers,
  Mail,
  Package,
  Plus,
  Save,
  Search,
  Signature,
  Trash2,
} from "lucide-react";
import { useToastContext } from "../context/ToastContext";
import { apiClient } from "../services/apiClient";
import { inventoryApi, Customer, FieldDispatch, Product } from "../services/inventoryService";
import {
  ClientInvoice,
  ClientInvoiceSummary,
  ClientInvoiceTemplate,
  invoicingApi,
} from "../services/invoicingService";

type BuilderColumn = {
  key: string;
  label: string;
  formula?: string;
  align?: "left" | "right" | "center";
};

type BuilderRow = {
  id: string;
  product_id?: string;
  description: string;
  brand_model: string;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  [key: string]: string | number | undefined;
};

type SavedSummary = {
  id: string;
  customer_id?: string;
  customer_name: string;
  period: string;
  summary_type: string;
  summary_type_label: string;
  summary_limit: number;
  is_over_limit: boolean;
  invoice_numbers: string[];
  subtotal: number;
  tax: number;
  total: number;
};

type BillingQuotationItem = {
  id?: string;
  product_id?: string;
  product_name?: string;
  item_description?: string;
  description?: string;
  quantity?: number | string;
  unit_price?: number | string;
  total_price?: number | string;
};

type BillingQuotation = {
  id: string;
  quotation_number?: string;
  customer_id?: string;
  customer_name?: string;
  template_style?: string;
  price_tier?: string;
  total_amount?: number | string;
  items?: BillingQuotationItem[];
};

type SummaryType = {
  key: string;
  label: string;
  defaultLimit: number;
  description: string;
};

const summaryTypes: SummaryType[] = [
  {
    key: "operational_expenses",
    label: "Operational Expenses",
    defaultLimit: 2000000,
    description: "Monthly running/site operation billing.",
  },
  {
    key: "capital_expenses",
    label: "Capital Expenses",
    defaultLimit: 2000000,
    description: "Asset, equipment and project capital billing.",
  },
  {
    key: "footage_expenses",
    label: "Footage Expenses",
    defaultLimit: 2000000,
    description: "Footage retrieval, storage or evidence service billing.",
  },
  {
    key: "rental_expenses",
    label: "Rental Expenses",
    defaultLimit: 2000000,
    description: "Recurring rental and monthly service billing.",
  },
];

const getSummaryType = (key?: string) =>
  summaryTypes.find((type) => type.key === key) || summaryTypes[0];

const defaultColumns: BuilderColumn[] = [
  { key: "sr", label: "S No", align: "center" },
  { key: "brand_model", label: "Model Number / Brand Name" },
  { key: "description", label: "Description" },
  { key: "quantity", label: "Qty", align: "right" },
  { key: "unit_price", label: "Price", align: "right" },
  { key: "value_excl", label: "Value Excl.", formula: "quantity * unit_price", align: "right" },
  { key: "gst_amount", label: "GST Amount", formula: "value_excl * gst_rate / 100", align: "right" },
  { key: "value_incl", label: "Value Incl.", formula: "value_excl + gst_amount", align: "right" },
];

const createRow = (partial: Partial<BuilderRow> = {}): BuilderRow => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  description: "",
  brand_model: "",
  quantity: 1,
  unit_price: 0,
  gst_rate: 18,
  ...partial,
});

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  fontSize: 13,
};

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dbe4f0",
  borderRadius: 12,
  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
};

function money(value: number) {
  const amount = Number(value || 0);
  const formatted = amount.toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  });
  return `Rs ${formatted}`;
}

function normalizeInvoiceNumbers(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [value];
    } catch {
      return value ? [value] : [];
    }
  }
  return [];
}

function mapApiSummary(summary: ClientInvoiceSummary): SavedSummary {
  const type = getSummaryType(summary.summary_type);
  const limit = Number(summary.summary_limit || type.defaultLimit);
  const total = Number(summary.total_amount || 0);
  return {
    id: summary.id,
    customer_id: summary.customer_id,
    customer_name: summary.customer_name || "Client",
    period: summary.summary_period,
    summary_type: type.key,
    summary_type_label: type.label,
    summary_limit: limit,
    is_over_limit: Boolean(summary.is_over_limit ?? total > limit),
    invoice_numbers: normalizeInvoiceNumbers(summary.invoice_numbers),
    subtotal: Number(summary.subtotal || 0),
    tax: Number(summary.tax_amount || 0),
    total,
  };
}

function computeFormula(formula: string, values: Record<string, number>) {
  const clean = formula.trim();
  if (!clean) return 0;
  if (!/^[a-zA-Z0-9_+\-*/().\s]+$/.test(clean)) return 0;
  const names = Object.keys(values);
  const args = names.map((name) => Number(values[name] || 0));
  try {
    return Number(Function(...names, `"use strict"; return (${clean});`)(...args) || 0);
  } catch {
    return 0;
  }
}

function evaluateRow(row: BuilderRow, columns: BuilderColumn[], index: number) {
  const values: Record<string, number> = {
    sr: index + 1,
    quantity: Number(row.quantity || 0),
    unit_price: Number(row.unit_price || 0),
    gst_rate: Number(row.gst_rate || 0),
  };

  columns.forEach((column) => {
    if (column.formula) values[column.key] = computeFormula(column.formula, values);
    else if (typeof row[column.key] === "number") values[column.key] = Number(row[column.key] || 0);
  });

  return values;
}

function makeIdempotencyKey(prefix: string) {
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${randomPart}`;
}

function isBillableRow(row: BuilderRow) {
  return Boolean(row.product_id || row.brand_model.trim() || row.description.trim() || Number(row.quantity || 0) * Number(row.unit_price || 0) > 0);
}

export default function InvoiceBuilder() {
  const { showToast } = useToastContext();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [templates, setTemplates] = useState<ClientInvoiceTemplate[]>([]);
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState<"builder" | "preview" | "summaries">("builder");
  const routeParams = new URLSearchParams(window.location.search);
  const billingQuotationId = routeParams.get("quotationId") || "";
  const billingDispatchId = routeParams.get("dispatchId") || "";

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedProductToAddId, setSelectedProductToAddId] = useState("");
  const [loadedBillingQuotationId, setLoadedBillingQuotationId] = useState("");
  const [loadedBillingDispatchId, setLoadedBillingDispatchId] = useState("");
  const [billingQuotation, setBillingQuotation] = useState<BillingQuotation | null>(null);
  const [billingDispatch, setBillingDispatch] = useState<FieldDispatch | null>(null);
  const [invoiceName, setInvoiceName] = useState(`INV-DRAFT-${new Date().getFullYear()}`);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [purchaseOrderNo, setPurchaseOrderNo] = useState("");
  const [branchName, setBranchName] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [region, setRegion] = useState("Karachi");
  const [ntnNo, setNtnNo] = useState("");
  const [gstNo, setGstNo] = useState("");
  const [dcNo, setDcNo] = useState("");
  const [signatureName, setSignatureName] = useState("Accounts department");
  const [signatureImage, setSignatureImage] = useState("");
  const [headerTitle, setHeaderTitle] = useState("Sales Tax Invoice");
  const [footerNote, setFooterNote] = useState(
    "Please make the payment in favor of Electronic Safety & Security Private Limited",
  );
  const [bankLine, setBankLine] = useState("Account #: 24438000016603");
  const [columns, setColumns] = useState<BuilderColumn[]>(defaultColumns);
  const [rows, setRows] = useState<BuilderRow[]>([createRow()]);
  const [summaryPeriod, setSummaryPeriod] = useState("Monthly Client Summary");
  const [summaryScope, setSummaryScope] = useState<"selected" | "all">("selected");
  const [summaryType, setSummaryType] = useState(summaryTypes[0].key);
  const [summaryLimit, setSummaryLimit] = useState(String(summaryTypes[0].defaultLimit));
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [summaries, setSummaries] = useState<SavedSummary[]>([]);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const savingInvoiceRef = useRef(false);
  const invoiceIdempotencyKeyRef = useRef(makeIdempotencyKey("invoice"));

  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId);
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId);
  const clientInvoices = invoices.filter((invoice) => invoice.customer_id === selectedCustomerId);
  const selectedSummaryType = getSummaryType(summaryType);

  const evaluatedRows = useMemo(
    () => rows.map((row, index) => evaluateRow(row, columns, index)),
    [rows, columns],
  );

  const previewRows = useMemo(() => rows.filter(isBillableRow), [rows]);
  const previewEvaluatedRows = useMemo(
    () => previewRows.map((row, index) => evaluateRow(row, columns, index)),
    [previewRows, columns],
  );

  const totals = useMemo(() => {
    return previewEvaluatedRows.reduce(
      (acc, row) => ({
        subtotal: acc.subtotal + Number(row.value_excl || row.quantity * row.unit_price || 0),
        tax: acc.tax + Number(row.gst_amount || 0),
        total: acc.total + Number(row.value_incl || 0),
      }),
      { subtotal: 0, tax: 0, total: 0 },
    );
  }, [previewEvaluatedRows]);

  const selectedSummaryInvoices =
    selectedInvoiceIds.length > 0
      ? invoices.filter((invoice) => selectedInvoiceIds.includes(invoice.id))
      : clientInvoices;
  const selectedSummaryTotal = selectedSummaryInvoices.reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0);
  const summaryLimitAmount = Number(summaryLimit || 0);
  const selectedSummaryOverLimit = summaryLimitAmount > 0 && selectedSummaryTotal > summaryLimitAmount;
  const canGenerateSummary =
    summaryScope === "selected"
      ? selectedSummaryInvoices.length > 0 && !selectedSummaryOverLimit
      : invoices.length > 0;

  const stockImpactRows = useMemo(
    () =>
      previewRows.map((row) => {
        const product = products.find((item) => item.id === row.product_id);
        const availableBefore = Number(product?.available_count ?? product?.quantity ?? 0);
        const outgoingQty = Number(row.quantity || 0);
        return {
          key: row.id,
          productName: product?.product_name || row.brand_model || row.description || "Manual invoice item",
          availableBefore,
          outgoingQty,
          availableAfter: row.product_id ? Math.max(availableBefore - outgoingQty, 0) : null,
          isManual: !row.product_id,
        };
      }),
    [products, previewRows],
  );

  const handleSignatureUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Please upload a PNG or JPG signature image", "error");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setSignatureImage(String(reader.result || ""));
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const loadBillingQuotation = async (quotationId: string) => {
    try {
      const response = await apiClient.get(`/crm/quotations/${quotationId}`);
      const quote = response.data.data as BillingQuotation;
      const quoteItems = Array.isArray(quote.items) ? quote.items : [];

      setBillingQuotation(quote);
      setLoadedBillingQuotationId(quotationId);
      setSelectedTemplateId("");
      setSelectedCustomerId(quote.customer_id || "");
      setInvoiceName(`INV-DRAFT-${quote.quotation_number || new Date().getFullYear()}`);
      setPurchaseOrderNo(quote.quotation_number || "");
      setHeaderTitle(quote.template_style || "Sales Tax Invoice");
      setColumns(defaultColumns);
      setActiveStep("builder");

      if (quoteItems.length) {
        setRows(
          quoteItems.map((item) => {
            const product = products.find((productItem) => productItem.id === item.product_id);
            const label = item.product_name || product?.product_name || item.item_description || item.description || "Invoice item";
            const quantity = Number(item.quantity || 1);
            const unitPrice = Number(item.unit_price || 0) || (Number(item.total_price || 0) && quantity ? Number(item.total_price || 0) / quantity : 0);
            return createRow({
              product_id: item.product_id,
              brand_model: item.product_name || product?.product_name || label,
              description: item.item_description || item.description || product?.description || label,
              quantity,
              unit_price: unitPrice,
            });
          }),
        );
      } else {
        setRows([]);
        showToast("Selected quotation has no product lines. Add quotation items first, then open billing.", "error");
      }

      showToast(`${quote.customer_name || "Client"} billing invoice auto-filled from ${quote.quotation_number || "approved quotation"}`, "success");
    } catch {
      setBillingQuotation(null);
      setLoadedBillingQuotationId("");
      setRows([createRow()]);
      showToast("Unable to load selected quotation for billing", "error");
    }
  };

  const loadBillingDispatch = async (dispatchId: string) => {
    try {
      const dispatch = await inventoryApi.getDispatch(dispatchId);
      const dispatchItems = Array.isArray(dispatch.items) ? dispatch.items : [];
      const fieldPurchases = Array.isArray(dispatch.on_the_go_purchases) ? dispatch.on_the_go_purchases : [];
      let linkedQuote: BillingQuotation | null = null;
      let quotationRows: BuilderRow[] = [];

      setBillingDispatch(dispatch);
      setLoadedBillingDispatchId(dispatchId);
      setBillingQuotation(null);
      setLoadedBillingQuotationId("");
      setSelectedTemplateId("");
      setSelectedCustomerId(dispatch.customer_id || "");
      setInvoiceName(`INV-DRAFT-${dispatch.dispatch_number || new Date().getFullYear()}`);
      setPurchaseOrderNo(dispatch.quotation_number || dispatch.dispatch_number || "");
      setBranchName(dispatch.site_address || "");
      setHeaderTitle("Sales Tax Invoice");
      setColumns(defaultColumns);
      setActiveStep("builder");

      if (dispatch.quotation_id) {
        const response = await apiClient.get(`/crm/quotations/${dispatch.quotation_id}`);
        linkedQuote = response.data.data as BillingQuotation;
        const quoteItems = Array.isArray(linkedQuote.items) ? linkedQuote.items : [];
        setBillingQuotation(linkedQuote);
        setLoadedBillingQuotationId(dispatch.quotation_id);
        quotationRows = quoteItems.map((item) => {
          const product = products.find((productItem) => productItem.id === item.product_id);
          const label = item.product_name || product?.product_name || item.item_description || item.description || "Invoice item";
          const quantity = Number(item.quantity || 1);
          const unitPrice = Number(item.unit_price || 0) || (Number(item.total_price || 0) && quantity ? Number(item.total_price || 0) / quantity : 0);
          return createRow({
            product_id: item.product_id,
            brand_model: item.product_name || product?.product_name || label,
            description: item.item_description || item.description || product?.description || label,
            quantity,
            unit_price: unitPrice,
          });
        });
      }

      const quoteRowByProduct = new Map(quotationRows.filter((row) => row.product_id).map((row) => [row.product_id, row]));
      const quoteRowByName = new Map(
        quotationRows.map((row) => [String(row.brand_model || row.description).trim().toLowerCase(), row]),
      );

      const dispatchRows = dispatchItems
        .filter((item) => (
          Number(item.quantity_used || item.quantity_issued || 0) > 0
          && Boolean(item.product_id || item.product_name || item.serial_number || item.imei || Number(item.unit_price || 0) > 0)
        ))
        .map((item) => {
          const quantity = Number(item.quantity_used || item.quantity_issued || 1);
          const quoteRow =
            (item.product_id ? quoteRowByProduct.get(item.product_id) : undefined)
            || quoteRowByName.get(String(item.product_name || "").trim().toLowerCase());
          const unitPrice = Number(item.unit_price || 0) || Number(quoteRow?.unit_price || 0);
          return createRow({
            product_id: item.product_id,
            brand_model: item.product_name || quoteRow?.brand_model || item.serial_number || item.imei || "Installed item",
            description: item.serial_number || item.imei
              ? `${item.product_name || "Installed item"} - Serial ${item.serial_number || item.imei}`
              : quoteRow?.description || item.product_name || "Installed item",
            quantity,
            unit_price: unitPrice,
          });
        });

      const purchaseRows = fieldPurchases.map((purchase) =>
        createRow({
          brand_model: "Field purchase",
          description: `${purchase.item_description}${purchase.vendor_name ? ` - ${purchase.vendor_name}` : ""}`,
          quantity: 1,
          unit_price: Number(purchase.amount || 0),
        }),
      );

      const nextRows = [
        ...(dispatchRows.length ? dispatchRows : quotationRows),
        ...purchaseRows,
      ];
      if (!nextRows.length && dispatch.quotation_id) {
        await loadBillingQuotation(dispatch.quotation_id);
        setBillingDispatch(dispatch);
        setLoadedBillingDispatchId(dispatchId);
        showToast("Dispatch had no billable item rows, so billing was loaded from the linked quotation.", "success");
        return;
      }

      setRows(nextRows.length ? nextRows : [createRow()]);
      showToast(`${dispatch.customer_name || "Client"} invoice auto-filled from installer dispatch ${dispatch.dispatch_number}`, "success");
    } catch {
      try {
        const dispatches = await inventoryApi.getDispatches();
        const fallbackDispatch = dispatches.find((item) => item.id === dispatchId);
        if (fallbackDispatch) {
          setBillingDispatch(fallbackDispatch);
          setLoadedBillingDispatchId(dispatchId);
          setSelectedCustomerId(fallbackDispatch.customer_id || "");
          setInvoiceName(`INV-DRAFT-${fallbackDispatch.dispatch_number || new Date().getFullYear()}`);
          setPurchaseOrderNo(fallbackDispatch.quotation_number || fallbackDispatch.dispatch_number || "");
          setBranchName(fallbackDispatch.site_address || "");
          setHeaderTitle("Sales Tax Invoice");
          setActiveStep("builder");

          if (fallbackDispatch.quotation_id) {
            await loadBillingQuotation(fallbackDispatch.quotation_id);
            setBillingDispatch(fallbackDispatch);
            setLoadedBillingDispatchId(dispatchId);
            showToast("Dispatch detail was incomplete, so billing was loaded from the linked quotation.", "success");
            return;
          }
        }
      } catch {
        // Keep the final error below focused for the user.
      }

      setBillingDispatch(null);
      setLoadedBillingDispatchId("");
      setRows([createRow()]);
      showToast("Unable to load installer dispatch for billing. Refresh data or open billing from an approved quotation.", "error");
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [customerData, productData, templateData, invoiceData, summaryData] = await Promise.all([
        inventoryApi.getCustomers().catch(() => []),
        inventoryApi.getProducts().catch(() => []),
        invoicingApi.getTemplates().catch(() => []),
        invoicingApi.getInvoices().catch(() => []),
        invoicingApi.getSummaries().catch(() => []),
      ]);
      setCustomers(customerData);
      setProducts(productData);
      setTemplates(templateData);
      setInvoices(invoiceData);
      setSummaries(summaryData.map(mapApiSummary));
      if (!billingQuotationId && !billingDispatchId && !selectedCustomerId && customerData[0]) setSelectedCustomerId(customerData[0].id);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (loading || !billingQuotationId || loadedBillingQuotationId === billingQuotationId) return;
    loadBillingQuotation(billingQuotationId);
  }, [billingQuotationId, loadedBillingQuotationId, loading, products]);

  useEffect(() => {
    if (loading || !billingDispatchId || loadedBillingDispatchId === billingDispatchId) return;
    loadBillingDispatch(billingDispatchId);
  }, [billingDispatchId, loadedBillingDispatchId, loading]);

  useEffect(() => {
    if (!selectedTemplate) return;
    const config = selectedTemplate.template_config || {};
    setHeaderTitle(selectedTemplate.custom_header || config.header_title || "Sales Tax Invoice");
    setFooterNote(config.footer_note || config.footer_disclaimer || footerNote);
    setBankLine(selectedTemplate.custom_footer || config.bank_line || bankLine);
    setSignatureName(config.signature_name || "Accounts department");
    setSignatureImage(config.signature_image || "");
    setRegion(config.region || "Karachi");
    setNtnNo(config.ntn_no || "");
    setGstNo(config.gst_no || "");
    setDcNo(config.dc_no || "");
    setPurchaseOrderNo(config.purchase_order_no || "");
    setBranchName(config.branch_name || "");
    setBranchCode(config.branch_code || "");
    if (Array.isArray(config.columns) && config.columns.length) setColumns(config.columns);
  }, [selectedTemplateId]);

  const updateRow = (index: number, field: keyof BuilderRow, value: string | number) => {
    setRows((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)),
    );
  };

  const updateColumn = (index: number, patch: Partial<BuilderColumn>) => {
    setColumns((current) =>
      current.map((column, columnIndex) => (columnIndex === index ? { ...column, ...patch } : column)),
    );
  };

  const removeRow = (index: number) => {
    if (rows.length <= 1) {
      setRows([createRow()]);
      return;
    }
    setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
  };

  const addProductToInvoice = (productId: string) => {
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    const nextRow = createRow({
        product_id: product.id,
        brand_model: product.product_name,
        description: product.description || product.product_name,
        quantity: 1,
        unit_price: Number(product.unit_price || product.cost_price || 0),
      });
    setRows((current) => {
      if (current.length === 1 && !isBillableRow(current[0])) return [nextRow];
      return [...current, nextRow];
    });
    setSelectedProductToAddId("");
    setActiveStep("builder");
    showToast(`${product.product_name} added to invoice rows`, "success");
  };

  const saveTemplate = async () => {
    if (!selectedCustomerId) {
      showToast("Select a client before saving template", "error");
      return;
    }

    const template = await invoicingApi.saveTemplate({
      customer_id: selectedCustomerId,
      template_name: `${selectedCustomer?.customer_name || "Client"} - Custom Billing Template`,
      tax_type: "GST",
      default_tax_rate: 18,
      number_of_copies: 1,
      custom_header: headerTitle,
      custom_footer: bankLine,
      template_config: {
        columns,
        footer_note: footerNote,
        branch_name: branchName,
        branch_code: branchCode,
        region,
        ntn_no: ntnNo,
        gst_no: gstNo,
        dc_no: dcNo,
        purchase_order_no: purchaseOrderNo,
        signature_name: signatureName,
        signature_image: signatureImage,
      },
    });
    setTemplates((current) => [template, ...current]);
    setSelectedTemplateId(template.id);
    showToast("Client invoice template saved", "success");
  };

  const saveInvoice = async () => {
    if (savingInvoiceRef.current) return;
    if (!selectedCustomerId) {
      showToast("Select a client before saving invoice", "error");
      return;
    }
    const billableRows = rows.filter(isBillableRow);
    if (!billableRows.length) {
      showToast("Invoice cannot be saved without quotation/product rows", "error");
      return;
    }

    savingInvoiceRef.current = true;
    setSavingInvoice(true);
    try {
      const invoice = await invoicingApi.createInvoice({
        idempotency_key: invoiceIdempotencyKeyRef.current,
        customer_id: selectedCustomerId,
        dispatch_id: billingDispatch?.id || null,
        quotation_id: billingQuotation?.id || null,
        template_name: selectedTemplate?.template_name || billingQuotation?.template_style || (billingDispatch ? "Installer Dispatch Billing" : "Custom Invoice Builder"),
        tax_type: "GST",
        tax_rate: 18,
        number_of_copies: 1,
        status: "DRAFT",
        notes: JSON.stringify({
          invoice_name: invoiceName,
          invoice_date: invoiceDate,
          quotation_id: billingQuotation?.id || null,
          quotation_number: billingQuotation?.quotation_number || "",
          dispatch_id: billingDispatch?.id || null,
          dispatch_number: billingDispatch?.dispatch_number || "",
          purchase_order_no: purchaseOrderNo,
          branch_name: branchName,
          branch_code: branchCode,
          region,
          ntn_no: ntnNo,
          gst_no: gstNo,
          dc_no: dcNo,
          columns,
          footer_note: footerNote,
          bank_line: bankLine,
          signature_name: signatureName,
          signature_image: signatureImage,
        }),
        items: billableRows.map((row) => {
          const sourceIndex = rows.findIndex((candidate) => candidate.id === row.id);
          const values = evaluatedRows[sourceIndex] || evaluateRow(row, columns, sourceIndex);
          return {
            product_id: row.product_id || null,
            description: row.description || row.brand_model || "Invoice item",
            quantity: Number(row.quantity || 1),
            unit_price: Number(row.unit_price || 0),
            total_without_tax: Number(values.value_excl || 0),
            tax_amount: Number(values.gst_amount || 0),
            total_with_tax: Number(values.value_incl || 0),
          };
        }),
      });

      setInvoices((current) => current.some((item) => item.id === invoice.id) ? current : [invoice, ...current]);
      setSelectedInvoiceIds([invoice.id]);
      invoiceIdempotencyKeyRef.current = makeIdempotencyKey("invoice");
      showToast(`Invoice saved once as ${invoice.invoice_number}. It is not emailed yet.`, "success");
    } finally {
      savingInvoiceRef.current = false;
      setSavingInvoice(false);
    }
  };

  const createSummary = async () => {
    const selected =
      selectedInvoiceIds.length > 0
        ? invoices.filter((invoice) => selectedInvoiceIds.includes(invoice.id))
        : clientInvoices;
    if (!selected.length) {
      showToast("Select at least one saved invoice or create invoices for this client", "error");
      return;
    }
    const selectedTotal = selected.reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0);
    if (summaryLimitAmount > 0 && selectedTotal > summaryLimitAmount) {
      showToast(`${selectedSummaryType.label} summary is over the limit. Increase the editable limit or reduce selected invoices.`, "error");
      return;
    }
    const summary = await invoicingApi.createSummary({
      customer_id: selectedCustomerId,
      summary_period: summaryPeriod,
      summary_type: summaryType,
      summary_limit: summaryLimitAmount,
      invoice_ids: selected.map((invoice) => invoice.id),
      notes: JSON.stringify({
        summary_type_label: selectedSummaryType.label,
        limit_rule: summaryLimitAmount > 0 ? `Limit ${money(summaryLimitAmount)}` : "No limit",
      }),
    });
    setSummaries((current) => [mapApiSummary(summary), ...current]);
    showToast(`${selectedSummaryType.label} summary generated and saved`, "success");
  };

  const createAllClientSummaries = async () => {
    const grouped = invoices.reduce<Record<string, ClientInvoice[]>>((acc, invoice) => {
      const key = invoice.customer_id || invoice.customer_name || "unknown-client";
      acc[key] = [...(acc[key] || []), invoice];
      return acc;
    }, {});

    const entries = Object.entries(grouped).filter(([customerId, group]) => customerId !== "unknown-client" && group.length > 0);
    if (!entries.length) {
      showToast("No saved invoices available for client summaries", "error");
      return;
    }

    const overLimit = entries
      .map(([customerId, group]) => {
        const total = group.reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0);
        return { customerId, group, total };
      })
      .filter((entry) => summaryLimitAmount > 0 && entry.total > summaryLimitAmount);

    if (overLimit.length) {
      showToast(`${overLimit.length} client summaries are over the editable ${money(summaryLimitAmount)} limit. Adjust limit or invoice selection first.`, "error");
      return;
    }

    const generated = await Promise.all(
      entries.map(([customerId, group]) =>
        invoicingApi.createSummary({
          customer_id: customerId,
          summary_period: summaryPeriod,
          summary_type: summaryType,
          summary_limit: summaryLimitAmount,
          invoice_ids: group.map((invoice) => invoice.id),
          notes: JSON.stringify({
            summary_type_label: selectedSummaryType.label,
            limit_rule: summaryLimitAmount > 0 ? `Limit ${money(summaryLimitAmount)}` : "No limit",
          }),
        }),
      ),
    );

    setSummaries((current) => [...generated.map(mapApiSummary), ...current]);
    showToast(`Generated ${generated.length} separate ${selectedSummaryType.label} summaries`, "success");
  };

  const renderCell = (row: BuilderRow, values: Record<string, number>, column: BuilderColumn, index: number) => {
    if (column.key === "sr") return index + 1;
    if (column.key === "brand_model") return row.brand_model;
    if (column.key === "description") return row.description;
    if (column.key === "quantity") return row.quantity;
    if (column.key === "unit_price") return money(Number(row.unit_price || 0));
    if (typeof values[column.key] === "number") return money(Number(values[column.key] || 0));
    return row[column.key] || "";
  };

  return (
    <div style={{ padding: 24, maxWidth: 1600, margin: "0 auto", fontFamily: "'Outfit', sans-serif" }}>
      <div
        style={{
          ...cardStyle,
          padding: 26,
          marginBottom: 18,
          background:
            "linear-gradient(135deg, rgba(15,23,42,1) 0%, rgba(30,64,175,0.95) 52%, rgba(14,116,144,0.92) 100%)",
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 20, alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#bfdbfe", fontWeight: 800, fontSize: 12, letterSpacing: 0.6 }}>
              <Calculator size={16} /> FINANCE WORKSPACE
            </div>
            <h1 style={{ margin: "8px 0 8px", fontSize: 28, fontWeight: 900 }}>Client Invoice Builder</h1>
            <p style={{ color: "#dbeafe", maxWidth: 820, margin: 0, lineHeight: 1.5 }}>
              Select client, load saved template, auto-add inventory items, edit columns and formulas, preview the invoice, save draft, then generate monthly summaries.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button className="btn btn-primary" onClick={saveTemplate}>
              <Save size={16} /> Save Template
            </button>
            <button className="btn" onClick={() => setActiveStep("preview")}>
              <Eye size={16} /> Preview
            </button>
            <button className="btn btn-primary" onClick={saveInvoice} disabled={savingInvoice}>
              <CheckCircle2 size={16} /> {savingInvoice ? "Saving..." : "Save Draft Invoice"}
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {[
          ["builder", "Invoice Builder", FileText],
          ["preview", "Preview & Print", Eye],
          ["summaries", "Monthly Summaries", Layers],
        ].map(([key, label, Icon]) => (
          <button
            key={String(key)}
            onClick={() => setActiveStep(key as typeof activeStep)}
            style={{
              border: "1px solid #cbd5e1",
              background: activeStep === key ? "#2563eb" : "#ffffff",
              color: activeStep === key ? "#ffffff" : "#334155",
              borderRadius: 10,
              padding: "10px 14px",
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Icon size={16} /> {label as string}
          </button>
        ))}
      </div>

      {billingQuotation && (
        <div style={{ ...cardStyle, padding: 16, marginBottom: 18, borderColor: "#bfdbfe", background: "linear-gradient(135deg,#eff6ff,#f8fafc)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 0.6, color: "#2563eb", textTransform: "uppercase" }}>
                Auto Generated From Inventory Billing Queue
              </div>
              <h3 style={{ margin: "5px 0", fontSize: 18, fontWeight: 900, color: "#0f172a" }}>
                {billingQuotation.customer_name || selectedCustomer?.customer_name || "Selected Client"} - {billingQuotation.quotation_number || "Approved Quotation"}
              </h3>
              <p style={{ margin: 0, color: "#475569", fontSize: 13 }}>
                Quotation items are loaded into editable invoice rows. Add manual rows for extra work/materials, then preview and save draft.
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={{ padding: "7px 10px", borderRadius: 999, background: "#dbeafe", color: "#1d4ed8", fontSize: 12, fontWeight: 900 }}>
                {previewRows.length} invoice lines
              </span>
              <span style={{ padding: "7px 10px", borderRadius: 999, background: "#dcfce7", color: "#047857", fontSize: 12, fontWeight: 900 }}>
                Total {money(totals.total)}
              </span>
            </div>
          </div>

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
            {stockImpactRows.slice(0, 6).map((item) => (
              <div key={item.key} style={{ border: "1px solid #dbe4f0", background: "#ffffff", borderRadius: 10, padding: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {item.productName}
                </div>
                <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12, color: "#475569" }}>
                  <span>Out: <strong>{item.outgoingQty}</strong></span>
                  {item.isManual ? (
                    <span style={{ color: "#b45309", fontWeight: 800 }}>Manual line</span>
                  ) : (
                    <span>Left: <strong>{item.availableAfter}</strong></span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeStep === "builder" && (
        <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 18 }}>
          <div style={{ ...cardStyle, padding: 18 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 900, display: "flex", alignItems: "center", gap: 8 }}>
              <Building2 size={18} /> Client & Template
            </h3>

            <div style={{ display: "grid", gap: 12 }}>
              <label>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Client</span>
                <select value={selectedCustomerId} onChange={(event) => setSelectedCustomerId(event.target.value)} style={inputStyle}>
                  <option value="">Select client</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.customer_name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Saved Template</span>
                <select value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)} style={inputStyle}>
                  <option value="">Use new custom template</option>
                  {templates
                    .filter((template) => !selectedCustomerId || template.customer_id === selectedCustomerId)
                    .map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.template_name}
                      </option>
                    ))}
                </select>
              </label>

              <label>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Invoice Name</span>
                <input value={invoiceName} onChange={(event) => setInvoiceName(event.target.value)} style={inputStyle} />
              </label>

              <label>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Invoice Date</span>
                <input type="date" value={invoiceDate} onChange={(event) => setInvoiceDate(event.target.value)} style={inputStyle} />
              </label>

              <label>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>PO # / Ticket Number</span>
                <input
                  value={purchaseOrderNo}
                  onChange={(event) => setPurchaseOrderNo(event.target.value)}
                  style={inputStyle}
                  placeholder="PO-123 / TKT-2026-HBL-088"
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <label>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Branch Name</span>
                  <input value={branchName} onChange={(event) => setBranchName(event.target.value)} style={inputStyle} placeholder="DHA Branch" />
                </label>
                <label>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Branch Code</span>
                  <input value={branchCode} onChange={(event) => setBranchCode(event.target.value)} style={inputStyle} placeholder="0042" />
                </label>
              </div>

              <label>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Region</span>
                <input value={region} onChange={(event) => setRegion(event.target.value)} style={inputStyle} placeholder="Karachi" />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <label>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>NTN No.</span>
                  <input value={ntnNo} onChange={(event) => setNtnNo(event.target.value)} style={inputStyle} placeholder="3628486-6" />
                </label>
                <label>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>GST No.</span>
                  <input value={gstNo} onChange={(event) => setGstNo(event.target.value)} style={inputStyle} placeholder="1.70036E+12" />
                </label>
                <label>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>D/C No.</span>
                  <input value={dcNo} onChange={(event) => setDcNo(event.target.value)} style={inputStyle} placeholder="DC-11539-2024" />
                </label>
              </div>
            </div>

            <div style={{ height: 1, background: "#e2e8f0", margin: "18px 0" }} />

            <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 900, display: "flex", alignItems: "center", gap: 8 }}>
              <Package size={18} /> Add Inventory Item
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
              <select
                value={selectedProductToAddId}
                onChange={(event) => setSelectedProductToAddId(event.target.value)}
                style={inputStyle}
              >
                <option value="">Search/select product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.product_name} - {money(Number(product.unit_price || product.cost_price || 0))}
                  </option>
                ))}
              </select>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => addProductToInvoice(selectedProductToAddId)}
                disabled={!selectedProductToAddId}
                style={{ whiteSpace: "nowrap" }}
              >
                <Plus size={14} /> Add Item
              </button>
            </div>

            <div style={{ height: 1, background: "#e2e8f0", margin: "18px 0" }} />

            <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 900, display: "flex", alignItems: "center", gap: 8 }}>
              <Signature size={18} /> Footer & Signature
            </h3>
            <div style={{ display: "grid", gap: 12 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Invoice Title</span>
                <input value={headerTitle} onChange={(event) => setHeaderTitle(event.target.value)} style={inputStyle} placeholder="Sales Tax Invoice" />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Payment Footer Note</span>
                <textarea
                  value={footerNote}
                  onChange={(event) => setFooterNote(event.target.value)}
                  style={{ ...inputStyle, minHeight: 72, resize: "vertical", lineHeight: 1.5 }}
                  placeholder="Please make the payment in favor of..."
                />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Bank / Account Line</span>
                <input value={bankLine} onChange={(event) => setBankLine(event.target.value)} style={inputStyle} placeholder="Account #: 24438000016603" />
              </label>

              <div style={{ border: "1px solid #dbe4f0", borderRadius: 12, padding: 12, background: "#f8fafc" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 900, color: "#0f172a" }}>Prepared By / Signature</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>Upload signature image or paste a hosted image URL.</div>
                  </div>
                  {signatureImage && (
                    <button className="btn" type="button" onClick={() => setSignatureImage("")}>
                      Clear
                    </button>
                  )}
                </div>

                <label style={{ display: "grid", gap: 6, marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Signature Name / Department</span>
                  <input value={signatureName} onChange={(event) => setSignatureName(event.target.value)} style={inputStyle} placeholder="Accounts department" />
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" }}>
                  <input
                    value={signatureImage}
                    onChange={(event) => setSignatureImage(event.target.value)}
                    style={inputStyle}
                    placeholder="Paste signature image URL, or upload file"
                  />
                  <label className="btn btn-primary" style={{ margin: 0, cursor: "pointer", whiteSpace: "nowrap" }}>
                    Upload
                    <input type="file" accept="image/*" onChange={handleSignatureUpload} style={{ display: "none" }} />
                  </label>
                </div>

                <div
                  style={{
                    marginTop: 12,
                    minHeight: 96,
                    border: "1px dashed #94a3b8",
                    borderRadius: 10,
                    background: "#ffffff",
                    padding: 12,
                    display: "grid",
                    alignContent: "center",
                    justifyItems: "center",
                    textAlign: "center",
                  }}
                >
                  {signatureImage ? (
                    <>
                      <img src={signatureImage} alt="Signature preview" style={{ maxHeight: 54, maxWidth: "100%", objectFit: "contain" }} />
                      <div style={{ width: 180, borderTop: "1px solid #0f172a", marginTop: 10 }} />
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>{signatureName || "Authorized Signatory"}</div>
                    </>
                  ) : (
                    <>
                      <div style={{ width: 180, borderTop: "1px solid #94a3b8", marginBottom: 8 }} />
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>{signatureName || "Authorized Signatory"}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>Signature preview will appear here</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 18 }}>
            <div style={{ ...cardStyle, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, display: "flex", alignItems: "center", gap: 8 }}>
                  <Search size={18} /> Editable Columns & Formulas
                </h3>
                <button
                  className="btn"
                  onClick={() => setColumns([...columns, { key: `custom_${columns.length + 1}`, label: "Custom Column" }])}
                >
                  <Plus size={14} /> Add Column
                </button>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      <th style={{ padding: 8, textAlign: "left" }}>Column Label</th>
                      <th style={{ padding: 8, textAlign: "left" }}>Key</th>
                      <th style={{ padding: 8, textAlign: "left" }}>Formula</th>
                      <th style={{ padding: 8 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {columns.map((column, index) => (
                      <tr key={`${column.key}-${index}`} style={{ borderTop: "1px solid #e2e8f0" }}>
                        <td style={{ padding: 8 }}>
                          <input value={column.label} onChange={(event) => updateColumn(index, { label: event.target.value })} style={inputStyle} />
                        </td>
                        <td style={{ padding: 8 }}>
                          <input value={column.key} onChange={(event) => updateColumn(index, { key: event.target.value })} style={inputStyle} />
                        </td>
                        <td style={{ padding: 8 }}>
                          <input
                            value={column.formula || ""}
                            onChange={(event) => updateColumn(index, { formula: event.target.value })}
                            style={inputStyle}
                            placeholder="quantity * unit_price"
                          />
                        </td>
                        <td style={{ padding: 8, textAlign: "center" }}>
                          <button
                            className="btn"
                            onClick={() => setColumns(columns.filter((_, columnIndex) => columnIndex !== index))}
                            disabled={columns.length <= 3}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ ...cardStyle, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>Invoice Rows</h3>
                  <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 12 }}>
                    Add, edit or remove rows here. Totals calculate instantly from quantity, price and GST.
                  </p>
                </div>
                <button className="btn btn-primary" onClick={() => setRows([...rows, createRow()])}>
                  <Plus size={14} /> Add Manual Row
                </button>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      <th style={{ padding: 10, textAlign: "left" }}>Model / Brand</th>
                      <th style={{ padding: 10, textAlign: "left" }}>Description</th>
                      <th style={{ padding: 10 }}>Qty</th>
                      <th style={{ padding: 10 }}>Price</th>
                      <th style={{ padding: 10 }}>GST %</th>
                      <th style={{ padding: 10 }}>Value Excl.</th>
                      <th style={{ padding: 10 }}>GST Amount</th>
                      <th style={{ padding: 10 }}>Value Incl.</th>
                      <th style={{ padding: 10 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ padding: 18, textAlign: "center", color: "#64748b", borderTop: "1px solid #e2e8f0" }}>
                          No invoice rows loaded. Open billing from an approved quotation with items, or add a manual row.
                        </td>
                      </tr>
                    ) : (
                      rows.map((row, index) => (
                        <tr key={row.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                          <td style={{ padding: 8 }}>
                            <input value={row.brand_model} onChange={(event) => updateRow(index, "brand_model", event.target.value)} style={inputStyle} />
                          </td>
                          <td style={{ padding: 8 }}>
                            <input value={row.description} onChange={(event) => updateRow(index, "description", event.target.value)} style={inputStyle} />
                          </td>
                          <td style={{ padding: 8 }}>
                            <input type="number" value={row.quantity} onChange={(event) => updateRow(index, "quantity", Number(event.target.value))} style={inputStyle} />
                          </td>
                          <td style={{ padding: 8 }}>
                            <input type="number" value={row.unit_price} onChange={(event) => updateRow(index, "unit_price", Number(event.target.value))} style={inputStyle} />
                          </td>
                          <td style={{ padding: 8 }}>
                            <input type="number" value={row.gst_rate} onChange={(event) => updateRow(index, "gst_rate", Number(event.target.value))} style={inputStyle} />
                          </td>
                          <td style={{ padding: 8, fontWeight: 800, textAlign: "right", color: "#334155" }}>{money(evaluatedRows[index]?.value_excl || 0)}</td>
                          <td style={{ padding: 8, fontWeight: 800, textAlign: "right", color: "#0369a1" }}>{money(evaluatedRows[index]?.gst_amount || 0)}</td>
                          <td style={{ padding: 8, fontWeight: 900, textAlign: "right" }}>{money(evaluatedRows[index]?.value_incl || 0)}</td>
                          <td style={{ padding: 8 }}>
                            <button className="btn" onClick={() => removeRow(index)} title="Remove this invoice row">
                              <Trash2 size={14} /> Remove
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
        </div>
      )}

      {activeStep === "preview" && (
        <div style={{ ...cardStyle, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>Invoice Preview</h2>
              <p style={{ margin: "4px 0 0", color: "#64748b" }}>Review first, then save draft. Email sending will be connected later.</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" onClick={() => window.print()}>
                <Download size={15} /> Print / Save PDF
              </button>
              <button className="btn btn-primary" onClick={saveInvoice} disabled={savingInvoice}>
                <Save size={15} /> {savingInvoice ? "Saving..." : "Save Draft"}
              </button>
              <button className="btn" onClick={() => showToast("Email will be connected in the email phase. Draft remains saved.", "success")}>
                <Mail size={15} /> Email Later
              </button>
            </div>
          </div>

          <div style={{ border: "2px solid #111827", color: "#111827", background: "#ffffff" }}>
            <div style={{ textAlign: "center", borderBottom: "2px solid #111827", padding: 8, fontSize: 20, fontWeight: 900 }}>
              {headerTitle}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", borderBottom: "1px solid #111827" }}>
              <div style={{ padding: 10, borderRight: "1px solid #111827" }}>
                <strong>{selectedCustomer?.customer_name || "Client"}:</strong>
                <div>Branch / Reference: {branchName || "-"} {branchCode ? `(${branchCode})` : ""}</div>
                <div>PO # / Ticket Number: {purchaseOrderNo || "-"}</div>
                <div>Region: {region || "-"}</div>
              </div>
              <div style={{ padding: 10 }}>
                <div><strong>Invoice no.</strong> {invoiceName}</div>
                <div><strong>Date</strong> {invoiceDate}</div>
                <div><strong>NTN no.</strong> {ntnNo || "-"}</div>
                <div><strong>GST No.</strong> {gstNo || "-"}</div>
                <div><strong>D/C No.</strong> {dcNo || "-"}</div>
              </div>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column.key} style={{ border: "1px solid #111827", padding: 8, textAlign: column.align || "left" }}>
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} style={{ border: "1px solid #111827", padding: 12, textAlign: "center", color: "#64748b" }}>
                      No billable invoice rows yet. Add an inventory item or manual row first.
                    </td>
                  </tr>
                ) : previewRows.map((row, index) => (
                  <tr key={row.id}>
                    {columns.map((column) => (
                      <td key={column.key} style={{ border: "1px solid #111827", padding: 8, textAlign: column.align || "left" }}>
                        {renderCell(row, previewEvaluatedRows[index], column, index)}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td colSpan={Math.max(columns.length - 1, 1)} style={{ border: "1px solid #111827", padding: 8, textAlign: "right", fontWeight: 900 }}>
                    Total
                  </td>
                  <td style={{ border: "1px solid #111827", padding: 8, textAlign: "right", fontWeight: 900 }}>{money(totals.total)}</td>
                </tr>
              </tbody>
            </table>

            <div style={{ padding: 12, lineHeight: 1.8 }}>
              <div><strong>Amount in words:</strong> {money(totals.total)} only.</div>
              <div>{footerNote}</div>
              <div><strong>{bankLine}</strong></div>
              <div style={{ marginTop: 28, width: 230 }}>
                <strong>Prepared By</strong>
                <div style={{ minHeight: 58, display: "flex", alignItems: "flex-end" }}>
                  {signatureImage && <img src={signatureImage} alt="Signature" style={{ maxHeight: 52, maxWidth: 210, objectFit: "contain" }} />}
                </div>
                <div style={{ borderTop: "1px solid #111827", paddingTop: 4, fontWeight: 800 }}>{signatureName || "Authorized Signatory"}</div>
                <div style={{ fontSize: 11, color: "#475569" }}>Authorized Signatory</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeStep === "summaries" && (
        <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 18 }}>
          <div style={{ ...cardStyle, padding: 18 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 900 }}>Generate Monthly Client Summary</h3>
            <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.5 }}>
              Select one client to create its own summary, or generate separate summaries for every client with saved invoices.
            </p>
            <label>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Summary Scope</span>
              <select value={summaryScope} onChange={(event) => setSummaryScope(event.target.value as "selected" | "all")} style={inputStyle}>
                <option value="selected">Selected client only</option>
                <option value="all">All clients separately</option>
              </select>
            </label>
            <label>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Summary Type</span>
              <select
                value={summaryType}
                onChange={(event) => {
                  const nextType = getSummaryType(event.target.value);
                  setSummaryType(nextType.key);
                  setSummaryLimit(String(nextType.defaultLimit));
                }}
                style={inputStyle}
              >
                {summaryTypes.map((type) => (
                  <option key={type.key} value={type.key}>
                    {type.label}
                  </option>
                ))}
              </select>
              <span style={{ display: "block", color: "#64748b", fontSize: 12, marginTop: 4 }}>
                {selectedSummaryType.description}
              </span>
            </label>
            <label>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Editable Limit</span>
              <input
                type="text"
                inputMode="decimal"
                value={summaryLimit}
                onChange={(event) => {
                  const nextValue = event.target.value.replace(/[^\d.]/g, "");
                  if ((nextValue.match(/\./g) || []).length <= 1) setSummaryLimit(nextValue);
                }}
                style={inputStyle}
                placeholder="Enter any limit amount"
              />
              <span style={{ display: "block", color: "#64748b", fontSize: 12, marginTop: 4 }}>
                Default is {money(selectedSummaryType.defaultLimit)}. You can clear this field or type any custom amount.
              </span>
            </label>
            <label>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#475569" }}>Summary Title / Month</span>
              <input value={summaryPeriod} onChange={(event) => setSummaryPeriod(event.target.value)} style={inputStyle} />
            </label>
            {summaryScope === "selected" && (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 10,
                  border: `1px solid ${selectedSummaryOverLimit ? "#fecaca" : "#bfdbfe"}`,
                  background: selectedSummaryOverLimit ? "#fff1f2" : "#eff6ff",
                  color: selectedSummaryOverLimit ? "#991b1b" : "#1e3a8a",
                  fontSize: 13,
                  fontWeight: 800,
                }}
              >
                Selected total: {money(selectedSummaryTotal)} / Limit: {summaryLimitAmount > 0 ? money(summaryLimitAmount) : "No limit set"}
                {selectedSummaryOverLimit && <span style={{ display: "block", marginTop: 4 }}>This summary is over limit, so it will not save until adjusted.</span>}
              </div>
            )}
            {summaryScope === "selected" && (
            <div style={{ marginTop: 14, maxHeight: 340, overflowY: "auto", display: "grid", gap: 8 }}>
              {clientInvoices.map((invoice) => (
                <label key={invoice.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: 10, border: "1px solid #e2e8f0", borderRadius: 8 }}>
                  <input
                    type="checkbox"
                    checked={selectedInvoiceIds.includes(invoice.id)}
                    onChange={(event) =>
                      setSelectedInvoiceIds((current) =>
                        event.target.checked ? [...current, invoice.id] : current.filter((id) => id !== invoice.id),
                      )
                    }
                  />
                  <span style={{ flex: 1 }}>
                    <strong>{invoice.invoice_number}</strong>
                    <span style={{ display: "block", color: "#64748b", fontSize: 12 }}>{invoice.status} - {money(invoice.total_amount)}</span>
                  </span>
                </label>
              ))}
              {!clientInvoices.length && (
                <div style={{ color: "#64748b", fontSize: 13, background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: 10, padding: 12 }}>
                  No saved invoices yet for this client. Go to Invoice Builder, add rows, then click Save Draft Invoice before generating a summary.
                </div>
              )}
            </div>
            )}
            <button
              className="btn btn-primary"
              onClick={summaryScope === "selected" ? createSummary : createAllClientSummaries}
              disabled={!canGenerateSummary}
              style={{
                width: "100%",
                marginTop: 14,
                justifyContent: "center",
                opacity: canGenerateSummary ? 1 : 0.55,
                cursor: canGenerateSummary ? "pointer" : "not-allowed",
              }}
            >
              <Layers size={16} /> {summaryScope === "selected" ? "Generate Selected Client Summary" : "Generate All Client Summaries"}
            </button>
          </div>

          <div style={{ ...cardStyle, padding: 18 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 18, fontWeight: 900 }}>Saved Summaries</h3>
            <div style={{ display: "grid", gap: 12 }}>
              {summaries.map((summary) => (
                <div key={summary.id} style={{ border: "1px solid #dbe4f0", borderRadius: 10, padding: 14, background: "#f8fafc" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <strong style={{ fontSize: 16 }}>{summary.customer_name}</strong>
                      <div style={{ color: "#64748b", fontSize: 13 }}>{summary.period}</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                        <span style={{ background: "#dbeafe", color: "#1d4ed8", borderRadius: 999, padding: "4px 8px", fontSize: 11, fontWeight: 900 }}>
                          {summary.summary_type_label}
                        </span>
                        <span
                          style={{
                            background: summary.is_over_limit ? "#fee2e2" : "#dcfce7",
                            color: summary.is_over_limit ? "#b91c1c" : "#047857",
                            borderRadius: 999,
                            padding: "4px 8px",
                            fontSize: 11,
                            fontWeight: 900,
                          }}
                        >
                          {summary.is_over_limit ? "Over Limit" : "Within Limit"}: {money(summary.summary_limit)}
                        </span>
                      </div>
                      <div style={{ color: "#334155", fontSize: 13, marginTop: 6 }}>
                        Invoices: {summary.invoice_numbers.join(", ")}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 12, color: "#64748b" }}>Grand Total</div>
                      <strong style={{ fontSize: 18 }}>{money(summary.total)}</strong>
                    </div>
                  </div>
                </div>
              ))}
              {!summaries.length && <div style={{ color: "#64748b" }}>No summary generated in this session yet.</div>}
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div style={{ position: "fixed", bottom: 20, right: 20, background: "#0f172a", color: "#ffffff", padding: "10px 14px", borderRadius: 10 }}>
          Loading finance data...
        </div>
      )}
    </div>
  );
}
