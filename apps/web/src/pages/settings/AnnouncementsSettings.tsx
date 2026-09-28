import React, { useMemo, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import Modal from "../../components/common/Modal";
import { useToastContext } from "../../context/ToastContext";
import { Announcement, AnnouncementPayload, useAnnouncements } from "../../hooks/useAnnouncements";
import { useDepartments, useDesignations } from "../../hooks/useConfig";
import TargetAudienceChips from "./TargetAudienceChips";

const initialForm: AnnouncementPayload = {
  title: "",
  body: "",
  target_department_id: null,
  target_designation_id: null,
  target_department_ids: [],
  target_designation_ids: [],
  is_active: true,
  expiry_date: "",
};

export default function AnnouncementsSettings() {
  const { showToast } = useToastContext();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [form, setForm] = useState<AnnouncementPayload>(initialForm);
  const { announcements, create, update, isLoading } = useAnnouncements({ all: true });
  const { data: departments = [] } = useDepartments();
  const { data: designations = [] } = useDesignations();
  const selectedDepartmentIds = form.target_department_ids || [];
  const selectedDesignationIds = form.target_designation_ids || [];

  const departmentNames = useMemo(
    () => new Map(departments.map((department: any) => [String(department.id), department.department_name || department.name || department.title || department.label])),
    [departments],
  );
  const designationNames = useMemo(
    () => new Map(designations.map((designation: any) => [String(designation.id), designation.title || designation.designation_name || designation.name || designation.label])),
    [designations],
  );

  const openCreate = () => {
    setEditingAnnouncement(null);
    setForm(initialForm);
    setModalOpen(true);
  };

  const openEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setForm({
      title: announcement.title,
      body: announcement.body,
      target_department_id: announcement.target_department_id || null,
      target_designation_id: announcement.target_designation_id || null,
      target_department_ids: announcement.target_department_ids?.length
        ? announcement.target_department_ids
        : announcement.target_department_id
          ? [announcement.target_department_id]
          : [],
      target_designation_ids: announcement.target_designation_ids?.length
        ? announcement.target_designation_ids
        : announcement.target_designation_id
          ? [announcement.target_designation_id]
          : [],
      is_active: announcement.is_active,
      expiry_date: announcement.expiry_date ? announcement.expiry_date.slice(0, 10) : "",
    });
    setModalOpen(true);
  };

  const saveAnnouncement = async () => {
    const payload = {
      title: form.title.trim(),
      body: form.body.trim(),
      target_department_ids: selectedDepartmentIds,
      target_designation_ids: selectedDesignationIds,
      is_active: Boolean(form.is_active),
      expiry_date: form.expiry_date ? form.expiry_date : null,
    };
    if (!payload.title || !payload.body) {
      showToast("Please enter announcement title and message.", "error");
      return;
    }
    try {
      if (editingAnnouncement) {
        await update.mutateAsync({ id: editingAnnouncement.id, payload });
        showToast("Announcement updated.");
      } else {
        await create.mutateAsync(payload);
        showToast("Announcement published.");
      }
      setModalOpen(false);
      setEditingAnnouncement(null);
      setForm(initialForm);
    } catch {
      showToast("Could not save announcement.", "error");
    }
  };

  return (
    <div>
      <div className="pg-head">
        <div>
          <div className="pg-greet">Announcements Configuration</div>
          <div className="pg-sub">Publish announcements and target them by department or designation.</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={13} /> Add Announcement
        </button>
      </div>

      <div className="card">
        {isLoading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--t3)" }}>Loading announcements...</div>
        ) : announcements.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--t3)" }}>No announcements yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Department Target</th>
                <th>Designation Target</th>
                <th>Expires</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {announcements.map((announcement) => (
                <tr key={announcement.id}>
                  <td style={{ fontWeight: 700 }}>{announcement.title}</td>
                  <td>
                    {announcement.target_department_names?.length
                      ? announcement.target_department_names.join(", ")
                      : announcement.target_department_ids?.length
                        ? announcement.target_department_ids.map((id) => departmentNames.get(String(id)) || id).join(", ")
                        : announcement.target_department_name || announcement.target_department_id || "All departments"}
                  </td>
                  <td>
                    {announcement.target_designation_names?.length
                      ? announcement.target_designation_names.join(", ")
                      : announcement.target_designation_ids?.length
                        ? announcement.target_designation_ids.map((id) => designationNames.get(String(id)) || id).join(", ")
                        : announcement.target_designation_name || announcement.target_designation_id || "All designations"}
                  </td>
                  <td>
                    {announcement.expiry_date ? announcement.expiry_date.slice(0, 10) : "Never"}
                  </td>
                  <td><span className={`pill ${announcement.is_active ? "pill-green" : "pill-red"}`}>{announcement.is_active ? "Active" : "Inactive"}</span></td>
                  <td className="mono">{announcement.updated_at ? announcement.updated_at.slice(0, 10) : "Not provided"}</td>
                  <td>
                    <button className="ico-btn" aria-label={`Edit ${announcement.title}`} onClick={() => openEdit(announcement)}>
                      <Pencil size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingAnnouncement ? "Edit Announcement" : "Add Announcement"} wide>
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, alignItems: "start" }}>
            <label className="form-group" style={{ margin: 0 }}>
              <span className="form-label">Title</span>
              <input className="input" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} />
            </label>
            <label className="form-group" style={{ margin: 0 }}>
              <span className="form-label">Expiry Date</span>
              <input className="input" type="date" value={form.expiry_date || ""} onChange={(event) => setForm((prev) => ({ ...prev, expiry_date: event.target.value }))} />
            </label>
            {editingAnnouncement && (
              <label className="form-group" style={{ margin: 0 }}>
                <span className="form-label">Status</span>
                <select className="input select-input" value={String(form.is_active)} onChange={(event) => setForm((prev) => ({ ...prev, is_active: event.target.value === "true" }))}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </label>
            )}
          </div>
          <label className="form-group" style={{ margin: 0 }}>
            <span className="form-label">Message</span>
            <textarea className="input" rows={7} value={form.body} onChange={(event) => setForm((prev) => ({ ...prev, body: event.target.value }))} />
          </label>
          <div style={{ borderTop: "1px solid var(--br)", paddingTop: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: "var(--t1)", marginBottom: 10 }}>Select Visibility</div>
          <TargetAudienceChips
            departments={departments}
            designations={designations}
            selectedDepartmentIds={selectedDepartmentIds}
            selectedDesignationIds={selectedDesignationIds}
            onDepartmentsChange={(ids) => setForm((prev) => ({ ...prev, target_department_ids: ids }))}
            onDesignationsChange={(ids) => setForm((prev) => ({ ...prev, target_designation_ids: ids }))}
          />
          </div>
          <div style={{ fontSize: 12, color: "var(--t3)", lineHeight: 1.5 }}>
            Leave department and designation chips empty for a company-wide announcement. Select departments to limit visibility, then optionally choose designations inside those departments.
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
          <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={saveAnnouncement}>Save Announcement</button>
        </div>
      </Modal>
    </div>
  );
}
