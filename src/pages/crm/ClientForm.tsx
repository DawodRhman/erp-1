import React, { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useToastContext } from "../../context/ToastContext";
import { CrmButton, ErrorState, LoadingState, PageHeader, card, crmPage, input, label } from "./CrmShared";
import { CrmCustomer, crmApi } from "./crmApi";

const blankCustomer: Partial<CrmCustomer> = {
  customer_name: "",
  company_name: "",
  customer_type: "Corporate",
  contact_person: "",
  email: "",
  phone: "",
  address: "",
};

export default function ClientForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToastContext();
  const [form, setForm] = useState<Partial<CrmCustomer>>(blankCustomer);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isEdit = Boolean(id);

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
        if (mounted) setForm(customer);
      } catch {
        if (mounted) setError("Client detail could not be loaded.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const setField = (key: keyof CrmCustomer, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.customer_name?.trim()) {
      showToast("Client name is required.", "error");
      return;
    }
    setSaving(true);
    try {
      const saved = isEdit && id ? await crmApi.updateCustomer(id, form) : await crmApi.createCustomer(form);
      showToast(isEdit ? "Client updated." : "Client registered.", "success");
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
        eyebrow="CRM clients"
        title={isEdit ? "Edit Client" : "Add New Client"}
        text="Create or update a client."
        actions={<CrmButton to="/crm/clients" tone="light">Back to list</CrmButton>}
      />

      {loading ? <LoadingState labelText="Loading client..." /> : error ? <ErrorState message={error} /> : (
        <form onSubmit={submit} style={{ ...card, padding: 20, display: "grid", gap: 18 }}>
          <section style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(220px, 1fr))", gap: 14 }}>
            <label style={label}>Client / Company Name *
              <input style={input} value={form.customer_name || ""} onChange={(e) => setField("customer_name", e.target.value)} placeholder="Habib Bank Limited" />
            </label>
            <label style={label}>Legal / Company Name
              <input style={input} value={form.company_name || ""} onChange={(e) => setField("company_name", e.target.value)} placeholder="Company registered name" />
            </label>
            <label style={label}>Client Type
              <select style={input} value={form.customer_type || "Corporate"} onChange={(e) => setField("customer_type", e.target.value)}>
                <option>Corporate</option>
                <option>Bank</option>
                <option>Government</option>
                <option>Private</option>
                <option>Retail</option>
              </select>
            </label>
            <label style={label}>Contact Person
              <input style={input} value={form.contact_person || ""} onChange={(e) => setField("contact_person", e.target.value)} placeholder="Client focal person" />
            </label>
            <label style={label}>Email
              <input style={input} type="email" value={form.email || ""} onChange={(e) => setField("email", e.target.value)} placeholder="client@example.com" />
            </label>
            <label style={label}>Phone
              <input style={input} value={form.phone || ""} onChange={(e) => setField("phone", e.target.value.replace(/[^\d+\-\s]/g, ""))} placeholder="0300-1112233" />
            </label>
          </section>
          <label style={label}>Address
            <textarea
              style={{ ...input, height: 92, paddingTop: 12, resize: "vertical" }}
              value={form.address || ""}
              onChange={(e) => setField("address", e.target.value)}
              placeholder="Client billing / branch address"
            />
          </label>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <CrmButton to="/crm/clients" tone="light">Cancel</CrmButton>
            <button
              type="submit"
              disabled={saving}
              style={{
                minHeight: 40,
                border: 0,
                borderRadius: 9,
                padding: "0 16px",
                background: "#10b981",
                color: "#fff",
                fontWeight: 950,
                display: "inline-flex",
                gap: 8,
                alignItems: "center",
              }}
            >
              <Save size={16} /> {saving ? "Saving..." : isEdit ? "Update Client" : "Save Client"}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
