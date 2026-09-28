import React, { useMemo, useState } from "react";
import { Building, Edit, Mail, MapPin, MessageCircle, Phone, Plus, Trash2, User } from "lucide-react";
import Modal from "../components/common/Modal";
import { useToastContext } from "../context/ToastContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../services/apiClient";
import { useAuthStore } from "../store/useAuthStore";

interface DirectoryEntry {
  id: string;
  employee_id?: string;
  name: string;
  type?: "branch" | "department" | "person" | "external" | "employee";
  email?: string | null;
  phone_internal?: string | null;
  phone_mobile?: string | null;
  phone_mobile_public?: boolean;
  role_title?: string | null;
  department_id?: string | null;
  department_name?: string | null;
  branch_id?: string | null;
  branch_name?: string | null;
  availability?: string | null;
  is_active?: boolean;
}

type DirectoryProps = {
  management?: boolean;
};

const emptyForm: Partial<DirectoryEntry> = {
  name: "",
  email: "",
  phone_internal: "",
  phone_mobile: "",
  phone_mobile_public: true,
  role_title: "",
  availability: "available",
};

function normalizeDirectory(payload: any): DirectoryEntry[] {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.rows)) return data.rows;
  return [];
}

function getEntryType(entry: DirectoryEntry) {
  return entry.type || (entry.employee_id ? "employee" : "external");
}

function getContact(entry: DirectoryEntry) {
  return entry.phone_mobile || entry.phone_internal || "";
}

function normalizePhoneForWhatsapp(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return `92${digits.slice(1)}`;
  return digits;
}

export default function Directory({ management = false }: DirectoryProps) {
  const { showToast } = useToastContext();
  const canWriteDirectory = useAuthStore((state) => state.hasPermission("directory:write"));
  const queryClient = useQueryClient();
  const canManage = management && canWriteDirectory;
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DirectoryEntry | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState<Partial<DirectoryEntry>>(emptyForm);

  const { data: directoryData = [], isLoading } = useQuery({
    queryKey: ["directory"],
    queryFn: async () => {
      const res = await apiClient.get("/directory");
      return normalizeDirectory(res.data);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newEntry: Partial<DirectoryEntry>) => {
      await apiClient.post("/directory", newEntry);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["directory"] });
      showToast("Directory entry created successfully");
    },
    onError: () => showToast("Failed to create entry", "error"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<DirectoryEntry> }) => {
      await apiClient.patch(`/directory/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["directory"] });
      showToast("Directory entry updated successfully");
    },
    onError: () => showToast("Failed to update entry", "error"),
  });

  const filteredData = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return directoryData.filter((entry: DirectoryEntry) => {
      const entryType = getEntryType(entry);
      const contact = getContact(entry);
      const matchesType = filterType === "all" || entryType === filterType;
      const matchesSearch =
        !query ||
        entry.name?.toLowerCase().includes(query) ||
        contact.includes(query) ||
        entry.email?.toLowerCase().includes(query) ||
        entry.department_name?.toLowerCase().includes(query) ||
        entry.role_title?.toLowerCase().includes(query) ||
        entry.employee_id?.toLowerCase().includes(query);
      return matchesType && matchesSearch && entry.is_active !== false;
    });
  }, [directoryData, filterType, searchTerm]);

  const handleSave = () => {
    if (!formData.name?.trim()) {
      showToast("Please enter a name.", "error");
      return;
    }

    const payload = {
      employee_id: formData.employee_id || null,
      name: formData.name.trim(),
      email: formData.email || null,
      phone_internal: formData.phone_internal || null,
      phone_mobile: formData.phone_mobile || null,
      phone_mobile_public: Boolean(formData.phone_mobile_public),
      role_title: formData.role_title || null,
      department_id: formData.department_id || null,
      branch_id: formData.branch_id || null,
      availability: formData.availability || "available",
    };

    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, updates: payload });
    } else {
      createMutation.mutate(payload);
    }

    setModalOpen(false);
    setEditingEntry(null);
    setFormData(emptyForm);
  };

  const handleDelete = (id: string) => {
    if (confirm("Deactivate this directory entry?")) {
      updateMutation.mutate({ id, updates: { is_active: false } as any });
    }
  };

  const openEditModal = (entry: DirectoryEntry) => {
    setEditingEntry(entry);
    setFormData({
      employee_id: entry.employee_id,
      name: entry.name,
      email: entry.email || "",
      phone_internal: entry.phone_internal || "",
      phone_mobile: entry.phone_mobile || "",
      phone_mobile_public: entry.phone_mobile_public ?? true,
      role_title: entry.role_title || "",
      department_id: entry.department_id || "",
      branch_id: entry.branch_id || "",
      availability: entry.availability || "available",
    });
    setModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingEntry(null);
    setFormData(emptyForm);
    setModalOpen(true);
  };

  const getTypeIcon = (type: string) => {
    if (type === "branch") return <Building size={16} />;
    if (type === "department") return <Building size={16} />;
    if (type === "employee" || type === "person") return <User size={16} />;
    if (type === "external") return <Phone size={16} />;
    return <MapPin size={16} />;
  };

  const getTypeColor = (type: string) => {
    if (type === "branch") return "pill-blue";
    if (type === "department") return "pill-green";
    if (type === "employee" || type === "person") return "pill-purple";
    if (type === "external") return "pill-orange";
    return "pill-steel";
  };

  return (
    <div>
      <div className="pg-head">
        <div>
          <div className="pg-greet">{management ? "Directory Management" : "Company Directory"}</div>
          <div className="pg-sub">
            {management
              ? "Maintain searchable employee and office contact entries."
              : "Search people, departments, contacts, and locations."}
          </div>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={13} /> Add Entry
          </button>
        )}
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <input
            className="input"
            placeholder="Search by name, employee ID, contact, email..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            style={{ width: 300 }}
          />
          <select
            className="input select-input"
            value={filterType}
            onChange={(event) => setFilterType(event.target.value)}
            style={{ width: 160 }}
          >
            <option value="all">All Types</option>
            <option value="employee">People</option>
            <option value="branch">Branches</option>
            <option value="department">Departments</option>
            <option value="external">External</option>
          </select>
          <div style={{ fontSize: 12, color: "var(--t3)" }}>
            {filteredData.length} entries found
          </div>
        </div>
      </div>

      <div className="card">
        {isLoading ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--t3)" }}>
            Loading directory...
          </div>
        ) : filteredData.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--t3)" }}>
            <Building size={32} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
            <div style={{ fontSize: 13 }}>No directory entries found</div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Name</th>
                <th>Contact</th>
                <th>Email</th>
                <th>Manager/Department</th>
                <th>Location</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((entry: DirectoryEntry) => {
                const entryType = getEntryType(entry);
                const contact = getContact(entry);
                const whatsappNumber = normalizePhoneForWhatsapp(contact);
                return (
                  <tr key={entry.id}>
                    <td>
                      <span className={`pill ${getTypeColor(entryType)}`}>
                        {getTypeIcon(entryType)}
                        <span style={{ marginLeft: 4 }}>{entryType}</span>
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {entry.name}
                      {entry.employee_id && (
                        <div className="mono" style={{ fontSize: 10, color: "var(--t3)", marginTop: 2 }}>
                          {entry.employee_id}
                        </div>
                      )}
                    </td>
                    <td className="mono">
                      {contact || "Not provided"}
                      {entry.phone_internal && entry.phone_mobile && (
                        <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 2 }}>
                          Ext: {entry.phone_internal}
                        </div>
                      )}
                    </td>
                    <td className="mono" style={{ fontSize: 11 }}>
                      {entry.email || "Not provided"}
                    </td>
                    <td>
                      {entry.department_name || "Not provided"}
                      {entry.role_title && (
                        <div style={{ fontSize: 10, color: "var(--t3)" }}>
                          {entry.role_title}
                        </div>
                      )}
                    </td>
                    <td>{entry.branch_name || "Not provided"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
                        {whatsappNumber && (
                          <a
                            className="ico-btn"
                            href={`https://wa.me/${whatsappNumber}`}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Message ${entry.name} on WhatsApp`}
                            title="WhatsApp"
                          >
                            <MessageCircle size={13} />
                          </a>
                        )}
                        {entry.email && (
                          <a
                            className="ico-btn"
                            href={`mailto:${entry.email}`}
                            aria-label={`Email ${entry.name}`}
                            title="Email"
                          >
                            <Mail size={13} />
                          </a>
                        )}
                        {canManage && (
                          <>
                            <button className="ico-btn" title="Edit" onClick={() => openEditModal(entry)}>
                              <Edit size={13} />
                            </button>
                            <button
                              className="ico-btn"
                              title="Delete"
                              onClick={() => handleDelete(entry.id)}
                              style={{ color: "var(--red)" }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingEntry(null);
          setFormData(emptyForm);
        }}
        title={editingEntry ? "Edit Directory Entry" : "Add Directory Entry"}
      >
        <div style={{ display: "grid", gap: 14 }}>
          <label className="form-group">
            <span className="form-label">Name *</span>
            <input
              className="input"
              value={formData.name || ""}
              onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Entry name"
            />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label className="form-group">
              <span className="form-label">Email</span>
              <input
                className="input"
                type="email"
                value={formData.email || ""}
                onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="email@company.com"
              />
            </label>
            <label className="form-group">
              <span className="form-label">Mobile</span>
              <input
                className="input"
                value={formData.phone_mobile || ""}
                onChange={(event) => setFormData((prev) => ({ ...prev, phone_mobile: event.target.value }))}
                placeholder="+92..."
              />
            </label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label className="form-group">
              <span className="form-label">Internal Extension</span>
              <input
                className="input"
                value={formData.phone_internal || ""}
                onChange={(event) => setFormData((prev) => ({ ...prev, phone_internal: event.target.value }))}
              />
            </label>
            <label className="form-group">
              <span className="form-label">Role / Title</span>
              <input
                className="input"
                value={formData.role_title || ""}
                onChange={(event) => setFormData((prev) => ({ ...prev, role_title: event.target.value }))}
              />
            </label>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--t2)" }}>
            <input
              type="checkbox"
              checked={Boolean(formData.phone_mobile_public)}
              onChange={(event) => setFormData((prev) => ({ ...prev, phone_mobile_public: event.target.checked }))}
            />
            Show mobile number in employee directory
          </label>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
          <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            {editingEntry ? "Update" : "Create"} Entry
          </button>
        </div>
      </Modal>
    </div>
  );
}
