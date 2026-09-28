import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, Save } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useToastContext } from "../../context/ToastContext";
import {
  CLIENT_CATEGORY_OPTIONS,
  ORGANIZATION_TYPE_OPTIONS,
  SERVICE_CATEGORY_OPTIONS,
  normalizeClientCategory,
  organizationTypeValue,
} from "../../utils/customerProfile";
import { CrmButton, ErrorState, LoadingState, PageHeader, card, crmPage, input, label } from "./CrmShared";
import { CrmCustomer, crmApi } from "./crmApi";
import "./clientProfile.css";

const blankCustomer: Partial<CrmCustomer> = {
  customer_name: "",
  company_name: "",
  customer_category: "ORGANIZATION",
  organization_type: "CORPORATE",
  customer_type: "CORPORATE",
  service_categories: [],
  service_description: "",
  contact_person: "",
  email: "",
  phone: "",
  address: "",
};

function normalizeForm(customer: CrmCustomer): Partial<CrmCustomer> {
  const category = normalizeClientCategory(customer);
  return {
    ...customer,
    customer_category: category,
    organization_type: organizationTypeValue(customer),
    service_categories: Array.isArray(customer.service_categories) ? customer.service_categories : [],
    company_name: category === "INDIVIDUAL" ? "" : customer.company_name || "",
  };
}

export default function ClientForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToastContext();
  const nameRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<Partial<CrmCustomer>>(blankCustomer);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isEdit = Boolean(id);
  const category = normalizeClientCategory(form);
  const isIndividual = category === "INDIVIDUAL";
  const selectedServices = Array.isArray(form.service_categories) ? form.service_categories : [];

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const customers = await crmApi.listCustomers();
        const customer = customers.find((item) => item.id === id);
        if (!customer) throw new Error("Client not found");
        if (mounted) setForm(normalizeForm(customer));
      } catch {
        if (mounted) setError("Client detail could not be loaded.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [id]);

  const setField = <K extends keyof CrmCustomer>(key: K, value: CrmCustomer[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const changeCategory = (customer_category: string) => {
    setForm((prev) => ({
      ...prev,
      customer_category,
      company_name: customer_category === "INDIVIDUAL" ? "" : prev.company_name,
      organization_type: customer_category === "INDIVIDUAL" ? "" : prev.organization_type || "CORPORATE",
      customer_type: customer_category === "INDIVIDUAL" ? "Individual" : prev.organization_type || "CORPORATE",
    }));
  };

  const changeOrganizationType = (organization_type: string) => {
    setForm((prev) => ({ ...prev, organization_type, customer_type: organization_type }));
  };

  const toggleService = (service: string) => {
    setForm((prev) => {
      const current = Array.isArray(prev.service_categories) ? prev.service_categories : [];
      return {
        ...prev,
        service_categories: current.includes(service) ? current.filter((value) => value !== service) : [...current, service],
      };
    });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.customer_name?.trim()) {
      showToast(isIndividual ? "Full name is required." : "Client name is required.", "error");
      nameRef.current?.focus();
      return;
    }
    setSaving(true);
    try {
      const payload: Partial<CrmCustomer> = {
        ...form,
        customer_name: form.customer_name.trim(),
        customer_category: category,
        company_name: isIndividual ? "" : form.company_name?.trim(),
        organization_type: isIndividual ? "" : form.organization_type || "OTHER",
        customer_type: isIndividual ? "Individual" : form.organization_type || "OTHER",
        service_categories: selectedServices,
      };
      const saved = isEdit && id ? await crmApi.updateCustomer(id, payload) : await crmApi.createCustomer(payload);
      showToast(isEdit ? "Client profile updated." : "Client profile registered.", "success");
      navigate(`/crm/clients/${saved.id}`);
    } catch (err: any) {
      showToast(err?.response?.data?.error?.message || "Client could not be saved.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main style={crmPage}>
      <PageHeader
        eyebrow="CRM client profile"
        title={isEdit ? "Edit Client Profile" : "Register New Client"}
        text="Record the client category, contact details and the services they may require. Billable items are selected separately in the quotation."
        actions={<CrmButton to="/crm/clients" tone="light">Back to list</CrmButton>}
      />

      {loading ? <LoadingState labelText="Loading client..." /> : error ? <ErrorState message={error} /> : (
        <form onSubmit={submit} style={{ ...card, padding: 20, display: "grid", gap: 20 }}>
          <section className="crm-client-form-grid">
            <label style={label}>Client Category *
              <select style={input} value={category} onChange={(event) => changeCategory(event.target.value)}>
                {CLIENT_CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <span className="crm-field-help">Choose whether this record is a person, company, company group or institution.</span>
            </label>

            {!isIndividual ? (
              <label style={label}>Organization Type *
                <select style={input} value={form.organization_type || "OTHER"} onChange={(event) => changeOrganizationType(event.target.value)}>
                  {ORGANIZATION_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            ) : <div />}

            <label style={label}>{isIndividual ? "Full Name *" : category === "GROUP_OF_COMPANIES" ? "Group Display Name *" : "Client / Trading Name *"}
              <input
                ref={nameRef}
                style={input}
                value={form.customer_name || ""}
                onChange={(event) => setField("customer_name", event.target.value)}
                placeholder={isIndividual ? "e.g. Ali Khan" : category === "GROUP_OF_COMPANIES" ? "e.g. ABC Group" : "e.g. Habib Bank Limited"}
              />
              <span className="crm-field-help">This is the primary name shown in quotations, orders and invoices.</span>
            </label>

            {!isIndividual ? (
              <label style={label}>Legal Registered Name <span className="crm-field-help">(optional)</span>
                <input style={input} value={form.company_name || ""} onChange={(event) => setField("company_name", event.target.value)} placeholder="Only fill if different from the client name" />
              </label>
            ) : <div />}

            <label style={label}>{isIndividual ? "Alternate Contact" : "Primary Contact Person"}
              <input style={input} value={form.contact_person || ""} onChange={(event) => setField("contact_person", event.target.value)} placeholder={isIndividual ? "Optional alternate contact" : "Client focal person"} />
            </label>
            <label style={label}>Email
              <input style={input} type="email" value={form.email || ""} onChange={(event) => setField("email", event.target.value)} placeholder="client@example.com" />
            </label>
            <label style={label}>Phone
              <input style={input} value={form.phone || ""} onChange={(event) => setField("phone", event.target.value.replace(/[^\d+\-\s]/g, ""))} placeholder="0300-1112233" />
            </label>
            <label style={label}>{isIndividual ? "Service / Installation Address" : "Billing / Branch Address"}
              <textarea
                style={{ ...input, height: 92, paddingTop: 12, resize: "vertical" }}
                value={form.address || ""}
                onChange={(event) => setField("address", event.target.value)}
                placeholder={isIndividual ? "Home or installation location" : "Billing, office or branch address"}
              />
            </label>
          </section>

          <section className="crm-client-form-grid">
            <label style={label}>Services Required
              <details className="crm-service-picker">
                <summary>
                  <span>{selectedServices.length ? `${selectedServices.length} service${selectedServices.length === 1 ? "" : "s"} selected` : "Select one or more services"}</span>
                  <ChevronDown size={17} />
                </summary>
                <div className="crm-service-options">
                  {SERVICE_CATEGORY_OPTIONS.map((option) => (
                    <label key={option.value} className="crm-service-option">
                      <input type="checkbox" checked={selectedServices.includes(option.value)} onChange={() => toggleService(option.value)} />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </details>
              <span className="crm-field-help">These describe the client profile. The exact product, service, quantity and price are added in the quotation.</span>
            </label>
            <label style={label}>Service Requirement / Scope
              <textarea
                style={{ ...input, height: 116, paddingTop: 12, resize: "vertical" }}
                value={form.service_description || ""}
                onChange={(event) => setField("service_description", event.target.value)}
                placeholder="e.g. Provide HR staff for HBL branches, install CCTV at residence, or supply equipment only"
              />
            </label>
          </section>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
            <CrmButton to="/crm/clients" tone="light">Cancel</CrmButton>
            <button
              type="submit"
              disabled={saving}
              style={{ minHeight: 40, border: 0, borderRadius: 9, padding: "0 16px", background: "#10b981", color: "#fff", fontWeight: 950, display: "inline-flex", gap: 8, alignItems: "center" }}
            >
              <Save size={16} /> {saving ? "Saving..." : isEdit ? "Update Client" : "Save Client"}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
