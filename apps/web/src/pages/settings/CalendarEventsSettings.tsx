import React, { useMemo, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import Modal from "../../components/common/Modal";
import { useToastContext } from "../../context/ToastContext";
import { CalendarEvent, CalendarEventPayload, useCalendarEvents, useCreateCalendarEvent, useUpdateCalendarEvent } from "../../hooks/useCalendarEvents";
import { useDepartments, useDesignations } from "../../hooks/useConfig";
import TargetAudienceChips from "./TargetAudienceChips";

const initialForm: CalendarEventPayload = {
  title: "",
  start_date: new Date().toISOString().slice(0, 10),
  end_date: new Date().toISOString().slice(0, 10),
  type: "holiday",
  target_department_ids: [],
  target_designation_ids: [],
};

function toInputDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function CalendarEventsSettings() {
  const { data: events = [], isLoading } = useCalendarEvents({ all: true, sort: "date", order: "desc" });
  const { data: departments = [] } = useDepartments();
  const { data: designations = [] } = useDesignations();
  const createEvent = useCreateCalendarEvent();
  const updateEvent = useUpdateCalendarEvent();
  const { showToast } = useToastContext();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState<CalendarEventPayload>(initialForm);
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
    setEditingEvent(null);
    setForm(initialForm);
    setModalOpen(true);
  };

  const openEdit = (event: CalendarEvent) => {
    const startDate = toInputDate(event.start_date || event.date);
    const endDate = toInputDate(event.end_date || event.start_date || event.date);
    setEditingEvent(event);
    setForm({
      title: event.title,
      start_date: startDate,
      end_date: endDate,
      type: event.type,
      target_department_ids: event.target_department_ids || [],
      target_designation_ids: event.target_designation_ids || [],
    });
    setModalOpen(true);
  };

  const saveEvent = async () => {
    const payload = {
      title: form.title.trim(),
      start_date: form.start_date,
      end_date: form.end_date,
      type: form.type,
      target_department_ids: selectedDepartmentIds,
      target_designation_ids: selectedDesignationIds,
    };
    if (!payload.title || !payload.start_date || !payload.end_date || !payload.type) {
      showToast("Please fill title, from date, to date, and type.", "error");
      return;
    }
    if (payload.end_date < payload.start_date) {
      showToast("To date cannot be before from date.", "error");
      return;
    }
    try {
      if (editingEvent) {
        await updateEvent.mutateAsync({ id: editingEvent.id, payload });
        showToast("Calendar event updated.");
      } else {
        await createEvent.mutateAsync(payload);
        showToast("Calendar event created.");
      }
      setModalOpen(false);
      setEditingEvent(null);
      setForm(initialForm);
    } catch {
      showToast("Could not save calendar event.", "error");
    }
  };

  return (
    <div>
      <div className="pg-head">
        <div>
          <div className="pg-greet">Calendar Events Configuration</div>
          <div className="pg-sub">Create and update backend calendar events shown on the calendar viewer.</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={13} /> Add Event
        </button>
      </div>

      <div className="card">
        {isLoading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--t3)" }}>Loading events...</div>
        ) : events.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--t3)" }}>No calendar events yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>From</th>
                <th>To</th>
                <th>Type</th>
                <th>Departments</th>
                <th>Designations</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td style={{ fontWeight: 700 }}>{event.title}</td>
                  <td className="mono">{toInputDate(event.start_date || event.date)}</td>
                  <td className="mono">{toInputDate(event.end_date || event.start_date || event.date)}</td>
                  <td><span className="pill pill-blue">{event.type}</span></td>
                  <td>
                    {event.target_department_names?.length
                      ? event.target_department_names.join(", ")
                      : event.target_department_ids?.length
                        ? event.target_department_ids.map((id) => departmentNames.get(String(id)) || id).join(", ")
                        : "All departments"}
                  </td>
                  <td>
                    {event.target_designation_names?.length
                      ? event.target_designation_names.join(", ")
                      : event.target_designation_ids?.length
                        ? event.target_designation_ids.map((id) => designationNames.get(String(id)) || id).join(", ")
                        : "All designations"}
                  </td>
                  <td>
                    <button className="ico-btn" aria-label={`Edit ${event.title}`} onClick={() => openEdit(event)}>
                      <Pencil size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingEvent ? "Edit Calendar Event" : "Add Calendar Event"} wide>
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, alignItems: "start" }}>
            <label className="form-group" style={{ margin: 0 }}>
              <span className="form-label">Title</span>
              <input className="input" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} />
            </label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <label className="form-group" style={{ margin: 0 }}>
              <span className="form-label">From Date</span>
              <input className="input" type="date" value={form.start_date} onChange={(event) => setForm((prev) => ({ ...prev, start_date: event.target.value }))} />
            </label>
            <label className="form-group" style={{ margin: 0 }}>
              <span className="form-label">To Date</span>
              <input className="input" type="date" value={form.end_date} onChange={(event) => setForm((prev) => ({ ...prev, end_date: event.target.value }))} />
            </label>
            <label className="form-group" style={{ margin: 0 }}>
              <span className="form-label">Event Category</span>
              <select className="input select-input" value={form.type} onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}>
                <option value="holiday">Holiday</option>
                <option value="event">Event</option>
                <option value="meeting">Meeting</option>
                <option value="deadline">Deadline</option>
                <option value="training">Training</option>
                <option value="emergency">Emergency</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>
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
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
          <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={saveEvent}>Save Event</button>
        </div>
      </Modal>
    </div>
  );
}
