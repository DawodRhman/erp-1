import React, { useMemo, useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Search, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { CalendarEvent, CalendarEventFilters, toCalendarDateKey, useCalendarEvents } from "../hooks/useCalendarEvents";
import { useAuthStore } from "../store/useAuthStore";

const eventTypeColors: Record<string, string> = {
  holiday: "#ef4444",
  event: "#6366f1",
  meeting: "#3b82f6",
  deadline: "#f59e0b",
  training: "#10b981",
  emergency: "#b91c1c",
  other: "#6b7280",
};

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type RangeMode = "current" | "all" | "year" | "custom";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-PK", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function eventCoversDate(event: CalendarEvent, dateKey: string) {
  const startKey = toCalendarDateKey(event.start_date || event.date);
  const endKey = toCalendarDateKey(event.end_date || event.start_date || event.date);
  return Boolean(startKey && endKey && startKey <= dateKey && dateKey <= endKey);
}

function formatEventDateRange(event: CalendarEvent) {
  const startKey = toCalendarDateKey(event.start_date || event.date);
  const endKey = toCalendarDateKey(event.end_date || event.start_date || event.date);
  if (!endKey || startKey === endKey) return formatDate(event.start_date || event.date);
  return `${formatDate(event.start_date || event.date)} to ${formatDate(event.end_date)}`;
}

function getDaysInMonth(date: Date, events: CalendarEvent[]) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days = [];

  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = firstDay.getDay() - 1; i >= 0; i -= 1) {
    days.push({
      date: new Date(year, month - 1, prevMonthLastDay - i),
      isCurrentMonth: false,
      events: [] as CalendarEvent[],
    });
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    days.push({
      date: new Date(year, month, day),
      isCurrentMonth: true,
      events: events.filter((event) => eventCoversDate(event, dateKey)),
    });
  }

  const remainingCells = 42 - days.length;
  for (let day = 1; day <= remainingCells; day += 1) {
    days.push({
      date: new Date(year, month + 1, day),
      isCurrentMonth: false,
      events: [] as CalendarEvent[],
    });
  }

  return days;
}

export default function Calendar() {
  const canManageCalendar = useAuthStore(
    (state) => state.hasPermission("calendar:write") || state.hasPermission("calendar:department_write"),
  );
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [rangeMode, setRangeMode] = useState<RangeMode>("current");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("");
  const [order, setOrder] = useState<"asc" | "desc" | "">("");

  const filters = useMemo<CalendarEventFilters>(() => {
    const next: CalendarEventFilters = {};
    if (rangeMode === "all") next.all = true;
    if (rangeMode === "year") next.year = year;
    if (rangeMode === "custom") {
      next.from = from;
      next.to = to;
    }
    next.type = type;
    next.search = search.trim();
    next.sort = sort;
    next.order = order;
    return next;
  }, [from, order, rangeMode, search, sort, to, type, year]);

  const { data: events = [], isLoading, isError } = useCalendarEvents(filters);

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => new Date(a.start_date || a.date).getTime() - new Date(b.start_date || b.date).getTime()),
    [events],
  );

  const visibleEvents = sortedEvents.slice(0, 50);
  const days = getDaysInMonth(currentDate, sortedEvents);
  const selectedDateEvents = selectedDate
    ? sortedEvents.filter((event) => eventCoversDate(event, selectedDate))
    : [];

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + (direction === "prev" ? -1 : 1));
      return next;
    });
  };

  return (
    <div>
      <div className="pg-head">
        <div>
          <div className="pg-greet">Calendar Events</div>
          <div className="pg-sub">View holidays and HR events from the backend calendar.</div>
        </div>
        {canManageCalendar && (
          <Link className="btn btn-secondary" to="/settings/calendar-events">
            <Settings size={15} /> Manage Calendar Events
          </Link>
        )}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.2fr repeat(4, minmax(120px, 1fr))",
            gap: 10,
            alignItems: "end",
          }}
        >
          <label className="form-group" style={{ margin: 0 }}>
            <span className="form-label">Search</span>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: 11, color: "var(--t3)" }} />
              <input
                className="input"
                style={{ paddingLeft: 32 }}
                placeholder="Search calendar..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </label>
          <label className="form-group" style={{ margin: 0 }}>
            <span className="form-label">Range</span>
            <select className="input select-input" value={rangeMode} onChange={(event) => setRangeMode(event.target.value as RangeMode)}>
              <option value="current">Current year</option>
              <option value="all">All years</option>
              <option value="year">Specific year</option>
              <option value="custom">Custom range</option>
            </select>
          </label>
          <label className="form-group" style={{ margin: 0 }}>
            <span className="form-label">Type</span>
            <select className="input select-input" value={type} onChange={(event) => setType(event.target.value)}>
              <option value="">All types</option>
              <option value="holiday">Holiday</option>
              <option value="event">Event</option>
              <option value="meeting">Meeting</option>
              <option value="deadline">Deadline</option>
              <option value="training">Training</option>
              <option value="emergency">Emergency</option>
            </select>
          </label>
          <label className="form-group" style={{ margin: 0 }}>
            <span className="form-label">Sort</span>
            <select className="input select-input" value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="">Default</option>
              <option value="date">Date</option>
              <option value="title">Title</option>
              <option value="type">Type</option>
            </select>
          </label>
          <label className="form-group" style={{ margin: 0 }}>
            <span className="form-label">Order</span>
            <select className="input select-input" value={order} onChange={(event) => setOrder(event.target.value as "asc" | "desc" | "")}>
              <option value="">Default</option>
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </label>
        </div>

        {rangeMode === "year" && (
          <div style={{ marginTop: 12, maxWidth: 180 }}>
            <label className="form-group" style={{ margin: 0 }}>
              <span className="form-label">Year</span>
              <input className="input" type="number" min="2000" max="2100" value={year} onChange={(event) => setYear(event.target.value)} />
            </label>
          </div>
        )}

        {rangeMode === "custom" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(180px, 240px))", gap: 10, marginTop: 12 }}>
            <label className="form-group" style={{ margin: 0 }}>
              <span className="form-label">From</span>
              <input className="input" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            </label>
            <label className="form-group" style={{ margin: 0 }}>
              <span className="form-label">To</span>
              <input className="input" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
            </label>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, .9fr) minmax(0, 1.4fr)", gap: 16, alignItems: "start" }}>
        <div className="card">
          <div className="ch">
            <div className="ct">
              <div className="ct-ico blue">
                <CalendarIcon size={13} />
              </div>
              Calendar Feed
            </div>
            <span className="pill pill-blue">{events.length} events</span>
          </div>
          {isLoading ? (
            <div style={{ padding: "18px 0", color: "var(--t3)", fontSize: 13 }}>Loading calendar events...</div>
          ) : isError ? (
            <div style={{ padding: "18px 0", color: "var(--red)", fontSize: 13 }}>Could not load calendar events.</div>
          ) : visibleEvents.length ? (
            <div style={{ display: "grid", gap: 10, maxHeight: 520, overflowY: "auto", paddingRight: 4 }}>
              {visibleEvents.map((event) => (
                <div key={event.id} style={{ display: "grid", gap: 8, padding: 12, borderRadius: 8, background: "var(--inp)", border: "1px solid var(--br)" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: eventTypeColors[event.type] || eventTypeColors.other, marginTop: 5, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ fontSize: 13, color: "var(--t1)" }}>{event.title}</strong>
                      <div className="mono" style={{ fontSize: 11, color: "var(--t3)" }}>{formatEventDateRange(event)}</div>
                    </div>
                  </div>
                  <div>
                    <span className="pill" style={{ background: `${eventTypeColors[event.type] || eventTypeColors.other}20`, color: eventTypeColors[event.type] || eventTypeColors.other, textTransform: "capitalize" }}>
                      {event.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: "18px 0", color: "var(--t3)", fontSize: 13 }}>No calendar events match these filters.</div>
          )}
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <button className="btn btn-secondary" onClick={() => navigateMonth("prev")}>
              <ChevronLeft size={16} />
            </button>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button className="btn btn-secondary" onClick={() => navigateMonth("next")}>
              <ChevronRight size={16} />
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 1, background: "var(--br)", borderRadius: 8, overflow: "hidden" }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} style={{ background: "var(--inp)", padding: "12px 8px", textAlign: "center", fontWeight: 700, fontSize: 12, color: "var(--t3)" }}>
                {day}
              </div>
            ))}

            {days.map((day, index) => (
              <button
                key={index}
                type="button"
                style={{
                  border: 0,
                  textAlign: "left",
                  background: "var(--card)",
                  minHeight: 100,
                  padding: 8,
                  cursor: day.events.length ? "pointer" : "default",
                  opacity: day.isCurrentMonth ? 1 : 0.45,
                }}
                onClick={() => {
                  const dateKey = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, "0")}-${String(day.date.getDate()).padStart(2, "0")}`;
                  setSelectedDate(dateKey);
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 12, color: "var(--t2)", marginBottom: 6 }}>{day.date.getDate()}</div>
                <div style={{ display: "grid", gap: 4 }}>
                  {day.events.slice(0, 3).map((event) => (
                    <span key={event.id} style={{ height: 6, borderRadius: 999, background: eventTypeColors[event.type] || eventTypeColors.other }} title={event.title} />
                  ))}
                  {day.events.length > 3 && <span style={{ fontSize: 10, color: "var(--t3)" }}>+{day.events.length - 3}</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {selectedDate && selectedDateEvents.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="ct" style={{ marginBottom: 12 }}>Events on {selectedDate}</div>
          <div style={{ display: "grid", gap: 8 }}>
            {selectedDateEvents.map((event) => (
              <div key={event.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: eventTypeColors[event.type] || eventTypeColors.other }} />
                <strong>{event.title}</strong>
                <span className="pill pill-steel">{event.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
