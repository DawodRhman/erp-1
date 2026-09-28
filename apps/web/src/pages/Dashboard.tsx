import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { getVisibleEmployees } from "../utils/utils";
import { useNavigate, Navigate } from "react-router-dom";
import { useDashboardMetrics } from "../hooks/useDashboard";
import { useEmployees } from "../hooks/useEmployees";
import { useLeaves } from "../hooks/useLeaves";
import { useAuthStore } from "../store/useAuthStore";
import {
  Users,
  UserCheck,
  CalendarDays,
  AlertTriangle,
  Activity,
  Cake,
  TrendingUp,
  BarChart3,
  Plus,
  Megaphone,
  Bell,
  ShieldAlert,
  FileText,
  Target,
  Clock,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  LogIn,
  Settings,
  DollarSign,
  Briefcase,
  CheckCircle,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { useCalendarEvents } from "../hooks/useCalendarEvents";

// Live dashboard data only. Empty states are intentional when backend records are unavailable.
const MONTH_NAMES = [
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
const AV_COLORS = [
  "#6366f1",
  "#ec4899",
  "#f97316",
  "#14b8a6",
  "#a855f7",
  "#06b6d4",
];

// ─── Global CSS ───────────────────────────────────────────────────────────────
const G = `
  *{box-sizing:border-box;}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
  @keyframes up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  @keyframes calSlide{from{opacity:.2;transform:translateX(8px)}to{opacity:1;transform:translateX(0)}}
  .pg{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;}
  .hc{cursor:pointer;transition:transform .18s,box-shadow .18s;}
  .hc:hover{transform:translateY(-5px) scale(1.015);}
  .hc:active{transform:scale(.97);}
  .fc{animation:up .4s ease both;}
  .rh{transition:background .1s;border-radius:8px;}
  .rh:hover{background:#f5f7ff;}
  .cd{transition:background .1s;}
  .cd:hover{background:#eff6ff!important;cursor:pointer;}
  .nb{transition:opacity .15s,transform .15s;}
  .nb:hover{opacity:.85;transform:translateY(-1px);}
  .ni:hover{background:#f0f4ff!important;}
  ::-webkit-scrollbar{width:3px;}
  ::-webkit-scrollbar-track{background:transparent;}
  ::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:3px;}
  .cal-day{width:28px;height:28px;display:flex;align-items:center;justify-content:center;border-radius:50%;font-size:11px;cursor:default;position:relative;transition:background .12s;}
  .cal-day.today{background:#6366f1;color:#fff;font-weight:700;}
  .cal-day.has-event{font-weight:600;color:#1e1b4b;}
  .cal-day.has-event::after{content:'';position:absolute;bottom:2px;left:50%;transform:translateX(-50%);width:4px;height:4px;border-radius:50%;background:#6366f1;}
  .cal-day.today::after{background:#fff;}
  .cal-day.birthday::after{background:#ec4899;}
  .cal-day.today.birthday::after{background:#fff;}
  .cal-month-anim{animation:calSlide .22s ease both;}
`;

// ─── Reusable mini components ─────────────────────────────────────────────────
const Chip = ({
  bg,
  fg,
  children,
}: {
  bg: string;
  fg: string;
  children: React.ReactNode;
}) => (
  <span
    style={{
      background: bg,
      color: fg,
      padding: "2px 8px",
      borderRadius: 20,
      fontSize: 9,
      fontWeight: 700,
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </span>
);

const Prog = ({ pct, color }: { pct: number; color: string }) => (
  <div
    style={{
      height: 5,
      background: "#f1f5f9",
      borderRadius: 4,
      overflow: "hidden",
      marginTop: 5,
    }}
  >
    <div
      style={{
        height: "100%",
        width: `${Math.min(pct, 100)}%`,
        background: color,
        borderRadius: 4,
        transition: "width .8s ease",
      }}
    />
  </div>
);

const Av = ({
  ini,
  color,
  size = 32,
}: {
  ini: string;
  color: string;
  size?: number;
}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.3,
      background: color,
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: size * 0.29,
      fontWeight: 700,
      flexShrink: 0,
    }}
  >
    {ini}
  </div>
);

const chipColorForType = (type: string) => {
  const normalizedType = String(type).toLowerCase();
  if (normalizedType.includes("auth")) {
    return { bg: "rgba(99,102,241,0.08)", fg: "#6366f1" };
  } else if (normalizedType.includes("leave") || normalizedType.includes("wallet")) {
    return { bg: "rgba(13,148,136,0.08)", fg: "#0d9488" };
  } else if (normalizedType.includes("attendance")) {
    return { bg: "rgba(37,99,235,0.08)", fg: "#2563eb" };
  } else if (normalizedType.includes("employees") || normalizedType.includes("employee")) {
    if (normalizedType.includes("salary") || normalizedType.includes("allowance")) {
      return { bg: "rgba(217,119,6,0.08)", fg: "#d97706" };
    }
    return { bg: "rgba(5,150,105,0.08)", fg: "#059669" };
  } else if (normalizedType.includes("penalties") || normalizedType.includes("penalty")) {
    return { bg: "rgba(220,38,38,0.08)", fg: "#dc2626" };
  } else if (normalizedType.includes("announcement")) {
    return { bg: "rgba(245,158,11,0.08)", fg: "#f59e0b" };
  } else if (normalizedType.includes("calendar")) {
    return { bg: "rgba(99,102,241,0.08)", fg: "#6366f1" };
  } else if (normalizedType.includes("config") || normalizedType.includes("setting")) {
    return { bg: "rgba(71,85,105,0.08)", fg: "#475569" };
  } else if (normalizedType.includes("account")) {
    return { bg: "rgba(3,105,161,0.08)", fg: "#0369a1" };
  }
  return { bg: "#f3f4f6", fg: "#6b7280" };
};

const ActivityIcon = ({ type }: { type: string }) => {
  const normalizedType = String(type).toLowerCase();
  
  let IconComponent = Activity;
  let color = "#6b7280"; // default slate

  if (normalizedType.includes("auth")) {
    IconComponent = LogIn;
    color = "#6366f1"; // Indigo
  } else if (normalizedType.includes("leave") || normalizedType.includes("wallet")) {
    IconComponent = CalendarDays;
    color = "#0d9488"; // Teal
  } else if (normalizedType.includes("attendance")) {
    IconComponent = Clock;
    color = "#2563eb"; // Blue
  } else if (normalizedType.includes("employees") || normalizedType.includes("employee")) {
    if (normalizedType.includes("salary") || normalizedType.includes("allowance")) {
      IconComponent = DollarSign;
      color = "#d97706"; // Amber
    } else if (normalizedType.includes("attachment") || normalizedType.includes("document")) {
      IconComponent = FileText;
      color = "#7c3aed"; // Purple
    } else {
      IconComponent = UserPlus;
      color = "#059669"; // Green
    }
  } else if (normalizedType.includes("penalties") || normalizedType.includes("penalty")) {
    IconComponent = AlertTriangle;
    color = "#dc2626"; // Red
  } else if (normalizedType.includes("announcement")) {
    IconComponent = Megaphone;
    color = "#f59e0b"; // Orange/Amber
  } else if (normalizedType.includes("calendar")) {
    IconComponent = CalendarDays;
    color = "#6366f1"; // Indigo
  } else if (normalizedType.includes("config") || normalizedType.includes("setting")) {
    IconComponent = Settings;
    color = "#475569"; // Slate
  } else if (normalizedType.includes("account")) {
    IconComponent = UserCheck;
    color = "#0369a1"; // Sky
  }

  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        background: `${color}10`, // 10% opacity hex tint
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <IconComponent size={16} style={{ color }} />
    </div>
  );
};

const WCard = ({
  children,
  style,
  onClick,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  onClick?: () => void;
}) => (
  <div
    className="fc"
    onClick={onClick}
    style={{
      background: "#fff",
      borderRadius: 16,
      padding: "18px 20px",
      boxShadow: "0 1px 10px rgba(0,0,0,.07)",
      position: "relative",
      ...style,
      cursor: onClick ? "pointer" : "default",
    }}
  >
    {children}
  </div>
);

const SHead = ({
  icon,
  title,
  right,
}: {
  icon: React.ReactNode;
  title: string;
  right?: React.ReactNode;
}) => (
  <div
    style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}
  >
    {icon}
    <span style={{ fontSize: 13, fontWeight: 700, color: "#1e1b4b" }}>
      {title}
    </span>
    {right && <div style={{ marginLeft: "auto" }}>{right}</div>}
  </div>
);

const EmptyState = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      padding: "28px 12px",
      textAlign: "center",
      color: "#94a3b8",
      fontSize: 11,
      lineHeight: 1.5,
    }}
  >
    {children}
  </div>
);

const initialsFor = (name = "?") =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

function parseLocalDate(value?: string) {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function eachDateInRange(startValue?: string, endValue?: string) {
  const start = parseLocalDate(startValue);
  const end = parseLocalDate(endValue || startValue);
  if (!start || !end || end < start) return [];
  const dates: Date[] = [];
  const cursor = new Date(start);
  while (cursor <= end && dates.length < 370) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  head_hr: "Head HR",
  branch_hr: "Branch HR",
  department_hr: "Department HR",
  hr_manager: "HR Manager",
  hr_executive: "HR Executive",
  employee: "Employee",
};

// Mini Calendar component (compact month view + events + birthdays)
function MiniCalendar({
  employees,
  events,
}: {
  employees: any[];
  events: any[];
}) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  };

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMon = new Date(viewYear, viewMonth + 1, 0).getDate();

  const birthdayDates = new Set<number>();
  employees.forEach((emp) => {
    if (!emp.dob && !emp.date_of_birth) return;
    const dob = parseLocalDate(emp.dob || emp.date_of_birth);
    if (!dob) return;
    if (dob.getMonth() === viewMonth) birthdayDates.add(dob.getDate());
  });

  const eventDates = new Set<number>();
  events.forEach((ev: any) => {
    eachDateInRange(ev?.start_date || ev?.date, ev?.end_date || ev?.date).forEach((date) => {
      if (date.getMonth() === viewMonth && date.getFullYear() === viewYear) {
        eventDates.add(date.getDate());
      }
    });
  });

  const monthEvents = events.filter((ev: any) => {
    const start = parseLocalDate(ev?.start_date || ev?.date);
    const end = parseLocalDate(ev?.end_date || ev?.date);
    if (!start || !end) return false;
    const monthStart = new Date(viewYear, viewMonth, 1);
    const monthEnd = new Date(viewYear, viewMonth + 1, 0);
    return start <= monthEnd && end >= monthStart;
  });

  const monthBirthdays = employees.filter((emp) => {
    if (!emp.dob && !emp.date_of_birth) return false;
    const dob = parseLocalDate(emp.dob || emp.date_of_birth);
    if (!dob) return false;
    return dob.getMonth() === viewMonth;
  });

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMon }, (_, i) => i + 1),
  ];

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <button
          onClick={prevMonth}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#9ca3af",
          }}
        >
          <ChevronLeft size={14} />
        </button>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#1e1b4b" }}>
          {MONTH_NAMES[viewMonth].slice(0, 3)} {viewYear}
        </span>
        <button
          onClick={nextMonth}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#9ca3af",
          }}
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <div
        key={`${viewYear}-${viewMonth}`}
        className="cal-month-anim"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7,1fr)",
          marginBottom: 4,
        }}
      >
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div
            key={d}
            style={{
              textAlign: "center",
              fontSize: 9,
              color: "#d1d5db",
              fontWeight: 600,
              paddingBottom: 4,
            }}
          >
            {d}
          </div>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7,1fr)",
          rowGap: 2,
        }}
      >
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const isToday =
            day === today.getDate() &&
            viewMonth === today.getMonth() &&
            viewYear === today.getFullYear();
          const hasBday = birthdayDates.has(day);
          const hasEvent = eventDates.has(day);
          let cls = "cal-day";
          if (isToday) cls += " today";
          if (hasEvent) cls += " has-event";
          if (hasBday) cls += " birthday";
          return (
            <div key={i} style={{ display: "flex", justifyContent: "center" }}>
              <div className={cls}>{day}</div>
            </div>
          );
        })}
      </div>

      <div
        style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 9,
            color: "#9ca3af",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#6366f1",
              display: "inline-block",
            }}
          />{" "}
          Event
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 9,
            color: "#9ca3af",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#ec4899",
              display: "inline-block",
            }}
          />{" "}
          Birthday
        </div>
      </div>

      {monthEvents.length > 0 && (
        <div
          style={{
            marginTop: 12,
            borderTop: "1px solid #f3f4f6",
            paddingTop: 10,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#6b7280",
              marginBottom: 6,
            }}
          >
            Events this month
          </div>
          {monthEvents.map((ev: any, i: number) => {
            const d = parseLocalDate(ev.start_date || ev.date);
            const color =
              ev.type === "holiday"
                ? "#ef4444"
                : ev.type === "meeting"
                  ? "#3b82f6"
                  : "#6b7280";
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "4px 0",
                  borderBottom:
                    i < monthEvents.length - 1 ? "1px solid #f9fafb" : "none",
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: color,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 10, color: "#374151", flex: 1 }}>
                  {ev.title}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    color: "#d1d5db",
                    whiteSpace: "nowrap",
                  }}
                >
                  {d ? `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)}` : ""}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {monthBirthdays.length > 0 && (
        <div
          style={{
            marginTop: 10,
            borderTop: "1px solid #f3f4f6",
            paddingTop: 10,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#6b7280",
              marginBottom: 6,
            }}
          >
            <Cake size={12} style={{ verticalAlign: "text-bottom", marginRight: 4 }} />
            Birthdays this month
          </div>
          {monthBirthdays.map((emp, i) => {
            const dob = parseLocalDate(emp.dob || emp.date_of_birth);
            if (!dob) return null;
            const ini = emp.name
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();
            const color = AV_COLORS[i % AV_COLORS.length];
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "4px 0",
                  borderBottom:
                    i < monthBirthdays.length - 1
                      ? "1px solid #f9fafb"
                      : "none",
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: color,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 8,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {ini}
                </div>
                <span style={{ fontSize: 10, color: "#374151", flex: 1 }}>
                  {emp.name}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    color: "#ec4899",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  {dob.getDate()} {MONTH_NAMES[dob.getMonth()].slice(0, 3)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const { user, activeRole } = useAuth();
  const { data: employees = [] } = useEmployees({ page: 1, limit: 1000 });
  const { data: leaveRequests = [] } = useLeaves();
  const { data: metrics } = useDashboardMetrics("6m");
  const { data: calendarApiEvents = [] } = useCalendarEvents();
  const canAddEmployee = useAuthStore((state) => state.hasPermission("employees:write"));
  const navigate = useNavigate();

  const [selectedBranch, setSelectedBranch] = useState<string>("All");

  const branches = useMemo(() => {
    const s = new Set<string>();
    employees?.forEach((e: any) => {
      if (e.branch) s.add(e.branch);
    });
    return ["All", ...Array.from(s)];
  }, [employees]);

  const [now, setNow] = useState(new Date());
  const [showNotif, setShowNotif] = useState(false);
  const [hovCard, setHovCard] = useState<number | null>(null);

  // live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const visibleEmployees = useMemo(
    () => getVisibleEmployees(user, activeRole, employees),
    [user, activeRole, employees],
  );

  const filteredEmployees = useMemo(() => {
    if (!visibleEmployees) return [];
    if (selectedBranch === "All") return visibleEmployees;
    return visibleEmployees.filter(
      (e: any) => (e.branch || "") === selectedBranch,
    );
  }, [visibleEmployees, selectedBranch]);

  const deptData = useMemo(() => {
    if (!filteredEmployees?.length) return [];
    const deptCounts: Record<string, number> = {};
    filteredEmployees.forEach((emp) => {
      const dept = emp.department || "Unassigned";
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });
    return Object.entries(deptCounts).map(([name, value], i) => ({
      name,
      value,
      color: AV_COLORS[i % AV_COLORS.length],
    })).sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  }, [filteredEmployees]);

  const topDeptData = useMemo(() => deptData.slice(0, 5), [deptData]);
  const otherDeptCount = useMemo(
    () => deptData.slice(5).reduce((sum, dept) => sum + dept.value, 0),
    [deptData],
  );
  const deptChartData = useMemo(
    () =>
      otherDeptCount > 0
        ? [
            ...topDeptData,
            { name: "Others", value: otherDeptCount, color: "#e2e8f0" },
          ]
        : topDeptData,
    [topDeptData, otherDeptCount],
  );
  const deptTotal = useMemo(
    () => deptData.reduce((sum, dept) => sum + dept.value, 0),
    [deptData],
  );

  // ── Real data ──
  const totalEmp = Math.max(
    Number(metrics?.total_employees ?? 0),
    filteredEmployees?.length ?? 0,
  );
  const activeEmp =
    metrics?.present_today ??
    filteredEmployees?.filter((e: any) => e.status === "active").length ??
    0;
  const visibleEmployeeIds = useMemo(
    () => new Set(filteredEmployees.map((e: any) => e.id || e.employee_id)),
    [filteredEmployees],
  );
  const visibleLeaveRequests = useMemo(
    () =>
      leaveRequests?.filter((l: any) =>
        visibleEmployeeIds.has(l.empId || l.employee_id),
      ) || [],
    [leaveRequests, visibleEmployeeIds],
  );

  const pendingLv = visibleLeaveRequests.filter(
    (l: any) => l.status === "Pending" || l.status === "pending",
  ).length;

  const attendanceChartData = useMemo(() => {
    return Array.isArray(metrics?.attendance_trend)
      ? metrics.attendance_trend
      : [];
  }, [metrics]);

  const growthData = useMemo(() => {
    return Array.isArray(metrics?.headcount_trend) ? metrics.headcount_trend : [];
  }, [metrics]);

  const leaveData = useMemo(() => {
    const summary: Record<string, { used: number; total: number; color: string }> = {};
    visibleLeaveRequests.forEach((l: any) => {
      const type = l.leaveType || l.leave_type_name || l.leave_type || "Leave";
      const start = l.start_date ? new Date(l.start_date) : null;
      const end = l.end_date ? new Date(l.end_date) : null;
      const dateRangeDays =
        start && end
          ? Math.floor((end.getTime() - start.getTime()) / 86400000) + 1
          : 0;
      const days = Number(
        l.days ?? l.days_requested ?? l.total_days ?? dateRangeDays,
      );
      if (!summary[type]) {
        summary[type] = {
          used: 0,
          total: 0,
          color: AV_COLORS[Object.keys(summary).length % AV_COLORS.length],
        };
      }
      summary[type].used += days;
      summary[type].total += Number(l.allowed ?? l.balance ?? l.total ?? days);
    });

    return Object.entries(summary).map(([type, row]) => ({
      type,
      used: row.used,
      total: row.total || row.used,
      color: row.color,
    }));
  }, [visibleLeaveRequests]);
  const leaveTotalUsed = leaveData.reduce((sum, row) => sum + row.used, 0);

  const attendPct = Number(
    metrics?.attendance_rate_percent ??
      metrics?.present_today_percent ??
      (totalEmp > 0 ? Math.round((activeEmp / totalEmp) * 100) : 0),
  );
  const onTimePct = Number(
    metrics?.on_time_percent ?? metrics?.on_time_rate ?? 0,
  );
  const leavePct = Number(metrics?.leave_utilization_percent ?? 0);

  // ── Greeting ──
  const h = now.getHours();
  const greeting =
    h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString("en-PK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-PK", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const selfEmployee =
    employees.find((employee: any) => employee.id === (user as any)?.employeeId) ||
    employees.find((employee: any) => employee.email === (user as any)?.email);
  const uName =
    metrics?.employee?.name ||
    metrics?.profile?.name ||
    metrics?.full_name ||
    metrics?.employee_name ||
    selfEmployee?.name ||
    (user as any)?.name ||
    (user as any)?.full_name ||
    ((user as any)?.username && !(user as any).username.includes("@") ? (user as any).username : "") ||
    "User";

  // ── Notifications ──
  const notifs = useMemo(() => {
    const metricNotifications = Array.isArray(metrics?.notifications)
      ? metrics.notifications.map((n: any, index: number) => ({
          id: n.id ?? `metric-${index}`,
          title: n.title || "Dashboard Alert",
          msg: n.message || n.msg || "",
          time: n.time || n.created_at || "",
          link: n.link || "/dashboard",
          read: Boolean(n.read),
        }))
      : [];
    const leaveNotification =
      pendingLv > 0
        ? [
            {
              id: "pending-leaves",
              title: "Leave Request Pending",
              msg: `${pendingLv} requests awaiting approval`,
              time: "Just now",
              link: "/leave",
              read: false,
            },
          ]
        : [];
    return [...leaveNotification, ...metricNotifications];
  }, [metrics, pendingLv]);
  const unread = notifs.filter((n) => !n.read).length;

  // Merge backend calendar events into announcements so the dashboard reflects HR calendar data.
  const combinedAnnouncements = useMemo(() => {
    const fromDays = calendarApiEvents.map((g: any) => ({
      title: g.title || g.type,
      date: g.date,
      text: "",
      id: g.id,
    }));
    return fromDays;
  }, [calendarApiEvents]);

  // ── Hero cards ──
  const hCards = [
    {
      grad: "linear-gradient(135deg,#667eea,#764ba2)",
      glow: "rgba(102,126,234,.45)",
      icon: <Users size={20} color="#fff" />,
      val: totalEmp,
      label: "Total Employees",
      sub: "From backend employee scope",
      chip: "Live",
      link: "/employees",
    },
    {
      grad: "linear-gradient(135deg,#11998e,#38ef7d)",
      glow: "rgba(17,153,142,.4)",
      icon: <UserCheck size={20} color="#fff" />,
      val: activeEmp,
      label: "Active Today",
      sub: "Live attendance",
      chip: "● Live",
      link: "/attendance",
    },
    {
      grad: "linear-gradient(135deg,#b721ff,#21d4fd)",
      glow: "rgba(183,33,255,.35)",
      icon: <CalendarDays size={20} color="#fff" />,
      val: pendingLv,
      label: "Pending Leave Requests",
      sub: "Need approval",
      chip: "Action Needed",
      link: "/leave",
    },
  ];

  // ── KPIs ──
  const kpis = [
    {
      label: "Attendance Rate",
      pct: attendPct,
      color: "#10b981",
      target: 90,
      period: "Month to date",
    },
    {
      label: "Leave Utilization",
      pct: leavePct,
      color: "#f97316",
      target: 60,
      period: "Current leave year",
    },
    {
      label: "On-time Rate",
      pct: onTimePct,
      color: "#6366f1",
      target: 95,
      period: "Month to date",
    },
  ];

  // ── Pending actions ──
  const actions = useMemo(() => {
    if (Array.isArray(metrics?.pending_actions)) {
      return metrics.pending_actions.map((pa: any) => ({
        marker: "!",
        text: pa.text || `Missing fields: ${(pa.missing_fields || []).join(", ")}`,
        cta: pa.cta || "Fix",
        link: pa.link || `/employees/${pa.employee_id}`,
      }));
    }
    return pendingLv > 0
      ? [
          {
            marker: "!",
            text: `${pendingLv} leave requests awaiting approval`,
            cta: "Review",
            link: "/leave",
          },
        ]
      : [];
  }, [metrics, pendingLv]);

  // ── Urgent alerts ──
  const alerts = useMemo(() => {
    if (!Array.isArray(metrics?.urgent_alerts)) return [];
    return metrics.urgent_alerts.map((ua: any) => ({
      name: ua.name || ua.title || "Alert",
      sub:
        ua.sub ||
        (ua.type && ua.days_remaining !== undefined
          ? `${String(ua.type).replace("_", " ")} in ${ua.days_remaining} days`
          : ua.message || ""),
      chip: ua.chip || "URGENT",
      bg: ua.bg || "#fef2f2",
      fg: ua.fg || "#dc2626",
    }));
  }, [metrics]);

  // ── Activity ──
  const activity = useMemo(() => {
    if (!Array.isArray(metrics?.recent_activity)) return [];
    return metrics.recent_activity.map((a: any, index: number) => {
      const type = a.type || a.chip || "system";
      const colors = chipColorForType(type);
      return {
        ini:
          a.ini || initialsFor(a.employee_name || a.name || a.text || "Activity"),
        color: a.color || AV_COLORS[index % AV_COLORS.length],
        text: a.text || a.message || "Activity recorded",
        time: a.time || a.created_at || "",
        by: a.by || a.actor_name || "System",
        chip: a.chip || a.type || "Update",
        cBg: colors.bg,
        cFg: colors.fg,
        activityIcon: type,
      };
    });
  }, [metrics]);

  // Department heads
  const departmentHeads = useMemo(() => {
    if (!Array.isArray(metrics?.department_heads)) return [];
    return metrics.department_heads.map((head: any, index: number) => ({
      employeeId: head.employee_id || "",
      name: head.name || head.employee_name || "Department Head",
      department: head.department_name || head.department || "Department not assigned",
      location: head.work_location_name || head.location_name || "",
      ini: initialsFor(head.name || head.employee_name || "Department Head"),
      color: head.color || AV_COLORS[index % AV_COLORS.length],
    }));
  }, [metrics]);

  // ── Upcoming birthdays (integrated with calendar) ──
  const birthdays = useMemo(() => {
    if (metrics?.upcoming_birthdays) {
      return metrics.upcoming_birthdays.map((b: any, idx: number) => ({
        name: b.name,
        dept: b.department || "—",
        date: parseLocalDate(b.next_birthday || b.date_of_birth) || new Date(),
        daysUntil: Number(b.days_until ?? 0),
        ini: (b.name || "?")
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
        color: AV_COLORS[idx % AV_COLORS.length],
      }));
    }
    const source =
      filteredEmployees && filteredEmployees.length
        ? filteredEmployees
        : employees || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const list: {
      name: string;
      dept: string;
      date: Date;
      daysUntil: number;
      ini: string;
      color: string;
    }[] = [];
    source.forEach((emp: any, idx: number) => {
      if (!emp.dob && !emp.date_of_birth) return;
      const dob = parseLocalDate(emp.dob || emp.date_of_birth);
      if (!dob) return;
      let bday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
      if (bday < today)
        bday = new Date(today.getFullYear() + 1, dob.getMonth(), dob.getDate());
      const days = Math.ceil((bday.getTime() - today.getTime()) / 86400000);
      if (days <= 30) list.push({
        name: emp.name,
        dept: emp.department || "—",
        date: bday,
        daysUntil: days,
        ini: (emp.name || "?")
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
        color: AV_COLORS[idx % AV_COLORS.length],
      });
    });
    return list.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [filteredEmployees, employees, metrics]);

  // Keep role redirects after hooks so React hook order stays stable.
  if (activeRole === "employee") {
    return <Navigate to="/my-dashboard" replace />;
  }
  if (activeRole === "branch_hr") {
    return <Navigate to="/hr/branch-dashboard" replace />;
  }
  if (activeRole === "head_hr") {
    return <Navigate to="/attendance-head-review" replace />;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{G}</style>
      <div
        className="pg"
        style={{ padding: "22px 28px", background: "#fff", minHeight: "100vh" }}
      >
        {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 20,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>
              {greeting},
            </p>
            <h1
              style={{
                margin: "2px 0 0",
                fontSize: 27,
                fontWeight: 800,
                color: "#1e1b4b",
                display: "flex",
                alignItems: "center",
                gap: 10,
                lineHeight: 1.15,
              }}
            >
              {uName} 
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  background: "#dcfce7",
                  padding: "3px 10px",
                  borderRadius: 20,
                  fontSize: 9,
                  fontWeight: 700,
                  color: "#166534",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#10b981",
                    animation: "pulse 1.5s infinite",
                  }}
                />
                LIVE
              </span>
            </h1>
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                margin: "8px 0 0",
              }}
            >
              <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>
                {dateStr} | {timeStr} PKT
              </p>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  background:
                    activeRole === "department_hr"
                      ? "#eff6ff"
                      : activeRole === "super_admin"
                        ? "#fef3c7"
                        : "#f0fdf4",
                  padding: "2px 8px",
                  borderRadius: 12,
                  fontSize: 9,
                  fontWeight: 600,
                  color:
                    activeRole === "department_hr"
                      ? "#2563eb"
                      : activeRole === "super_admin"
                        ? "#d97706"
                        : "#059669",
                  whiteSpace: "nowrap",
                }}
              >
                {roleLabels[activeRole || ""] || "HR"}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <button
                className="nb"
                onClick={() => setShowNotif((v) => !v)}
                style={{
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 40,
                  padding: "8px 16px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  fontSize: 12,
                  color: "#374151",
                  boxShadow: "0 1px 4px rgba(0,0,0,.06)",
                }}
              >
                <Bell size={15} color="#6b7280" />
                Alerts
                {unread > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      background: "#ef4444",
                      color: "#fff",
                      fontSize: 9,
                      fontWeight: 700,
                      padding: "1px 6px",
                      borderRadius: 20,
                      minWidth: 18,
                      textAlign: "center",
                    }}
                  >
                    {unread}
                  </span>
                )}
              </button>
              {showNotif && (
                <>
                  <div
                    style={{ position: "fixed", inset: 0, zIndex: 990 }}
                    onClick={() => setShowNotif(false)}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 8px)",
                      right: 0,
                      width: 310,
                      background: "#fff",
                      borderRadius: 14,
                      boxShadow: "0 16px 40px rgba(0,0,0,.14)",
                      zIndex: 999,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        padding: "11px 14px",
                        borderBottom: "1px solid #f3f4f6",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#1e1b4b",
                        }}
                      >
                        Notifications
                      </span>
                      <span style={{ fontSize: 10, color: "#9ca3af" }}>
                        {unread} unread
                      </span>
                    </div>
                    <div style={{ maxHeight: 320, overflowY: "auto" }}>
                      {notifs.map((n) => (
                        <div
                          key={n.id}
                          className="ni"
                          style={{
                            padding: "11px 14px",
                            borderBottom: "1px solid #f3f4f6",
                            cursor: "pointer",
                            background: n.read ? "#fff" : "#fffbeb",
                            transition: "background .1s",
                          }}
                          onClick={() => {
                            navigate(n.link);
                            setShowNotif(false);
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              gap: 8,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: "#1e1b4b",
                              }}
                            >
                              {n.title}
                            </div>
                            {!n.read && (
                              <span
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: "50%",
                                  background: "#3b82f6",
                                  flexShrink: 0,
                                  marginTop: 3,
                                }}
                              />
                            )}
                          </div>
                          <div
                            style={{
                              fontSize: 10,
                              color: "#6b7280",
                              marginTop: 2,
                            }}
                          >
                            {n.msg}
                          </div>
                          <div
                            style={{
                              fontSize: 9,
                              color: "#d1d5db",
                              marginTop: 3,
                            }}
                          >
                            {n.time}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {canAddEmployee && (
              <button
                className="nb"
                onClick={() => navigate("/employees/add")}
                style={{
                  background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                  border: "none",
                  borderRadius: 30,
                  padding: "9px 20px",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: "0 4px 14px rgba(99,102,241,.4)",
                }}
              >
                <Plus size={13} /> Add Employee
              </button>
            )}
          </div>
        </div>

        {/* ══ 3 HERO CARDS ════════════════════════════════════════════════════ */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 14,
            marginBottom: 18,
          }}
        >
          {hCards.map((c, i) => (
            <div
              key={i}
              className="hc"
              style={{
                background: c.grad,
                borderRadius: 18,
                padding: "20px",
                color: "#fff",
                position: "relative",
                overflow: "hidden",
                minHeight: 130,
                boxShadow:
                  hovCard === i
                    ? `0 20px 44px ${c.glow}`
                    : "0 6px 20px rgba(0,0,0,.10)",
              }}
              onClick={() => navigate(c.link)}
              onMouseEnter={() => setHovCard(i)}
              onMouseLeave={() => setHovCard(null)}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "rgba(255,255,255,.22)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 10,
                }}
              >
                {c.icon}
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1 }}>
                {c.val !== undefined && c.val !== null ? c.val : "Not provided"}
              </div>
              <div style={{ fontSize: 11, opacity: 0.9, marginTop: 4 }}>
                {c.label}
              </div>
              <div style={{ fontSize: 10, opacity: 0.65, marginTop: 2 }}>
                {c.sub}
              </div>
              <span
                style={{
                  position: "absolute",
                  top: 14,
                  right: 14,
                  background: "rgba(255,255,255,.22)",
                  borderRadius: 20,
                  padding: "3px 9px",
                  fontSize: 9,
                  fontWeight: 700,
                }}
              >
                {c.chip}
              </span>
              <div
                style={{
                  position: "absolute",
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,.07)",
                  bottom: -18,
                  right: -18,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,.06)",
                  bottom: 20,
                  right: 28,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: 12,
                  right: 14,
                  fontSize: 9,
                  opacity: 0.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                View
              </div>
            </div>
          ))}
        </div>

        {/* ══ KPI STRIP ═══════════════════════════════════════════════════════ */}
        <WCard style={{ marginBottom: 18, padding: "14px 22px" }}>
          <SHead
            icon={<Target size={14} color="#6366f1" />}
            title="Key Performance Indicators"
            right={
              <span style={{ fontSize: 10, color: "#9ca3af" }}>
                Live backend KPIs
              </span>
            }
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 20,
            }}
          >
            {kpis.map((k, i) => (
              <div key={i}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                  }}
                >
                  <span style={{ fontSize: 11, color: "#6b7280" }}>
                    {k.label}
                  </span>
                  <span
                    style={{ fontSize: 16, fontWeight: 800, color: k.color }}
                  >
                    {k.pct}%
                  </span>
                </div>
                <Prog pct={k.pct} color={k.color} />
                <div style={{ fontSize: 9, color: "#d1d5db", marginTop: 3 }}>
                  {k.period} · Target {k.target}%
                </div>
              </div>
            ))}
          </div>
        </WCard>

        {/* ══ CHARTS ROW: Attendance + Dept donut ════════════════════════════ */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
            marginBottom: 14,
          }}
        >
          <WCard onClick={() => navigate("/attendance")}>
            <SHead
              icon={<BarChart3 size={14} color="#6366f1" />}
              title="Monthly Attendance"
              right={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {(activeRole === "super_admin" ||
                    activeRole === "head_hr") && (
                    <select
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                      style={{
                        padding: "6px 8px",
                        borderRadius: 8,
                        border: "1px solid #e5e7eb",
                        fontSize: 12,
                      }}
                    >
                      {branches.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  )}
                  <Chip bg="#dcfce7" fg="#166534">
                    Live
                  </Chip>
                </div>
              }
            />
            <p
              style={{ margin: "-10px 0 10px", fontSize: 10, color: "#9ca3af" }}
            >
              Present vs Absent · Last 6 months
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={attendanceChartData} barGap={3}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: "none",
                    boxShadow: "0 4px 20px rgba(0,0,0,.1)",
                    fontSize: 11,
                  }}
                  cursor={{ fill: "#f8fafc" }}
                />
                <Bar
                  dataKey="present"
                  name="Present"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  barSize={18}
                />
                <Bar
                  dataKey="absent"
                  name="Absent"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                  barSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </WCard>

          <WCard onClick={() => navigate("/employees")}>
            <SHead
              icon={<Users size={14} color="#a855f7" />}
              title="Department Distribution"
              right={
                deptData.length > 5 ? (
                  <Chip bg="#f5f3ff" fg="#7c3aed">
                    Top 5 + Others
                  </Chip>
                ) : undefined
              }
            />
            <p
              style={{ margin: "-10px 0 12px", fontSize: 10, color: "#9ca3af" }}
            >
              Team mix by headcount
            </p>
            {deptChartData.length === 0 ? (
              <EmptyState>No department headcount available.</EmptyState>
            ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "170px 1fr",
                gap: 18,
                alignItems: "center",
                minHeight: 176,
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: 158,
                  height: 158,
                  flexShrink: 0,
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deptChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={47}
                      outerRadius={68}
                      dataKey="value"
                      stroke="none"
                    >
                      {deptChartData.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%,-50%)",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{ fontSize: 16, fontWeight: 800, color: "#1e1b4b" }}
                  >
                    {deptTotal || totalEmp}
                  </div>
                  <div style={{ fontSize: 8, color: "#9ca3af" }}>PEOPLE</div>
                </div>
              </div>
              <div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2,minmax(0,1fr))",
                    gap: 8,
                  }}
                >
                  {topDeptData.map((d, i) => {
                    const pct = Math.round((d.value / Math.max(deptTotal, 1)) * 100);
                    return (
                      <div
                        key={d.name}
                        title={`${d.name}: ${d.value}`}
                        style={{
                          background: "#f8fafc",
                          border: "1px solid #eef2f7",
                          borderRadius: 11,
                          padding: "9px 10px",
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 7,
                            marginBottom: 7,
                          }}
                        >
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: d.color,
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              flex: 1,
                              color: "#334155",
                              fontSize: 10,
                              fontWeight: 600,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {d.name}
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 800, color: "#1e1b4b" }}>
                            {d.value}
                          </span>
                        </div>
                        <Prog pct={pct} color={d.color} />
                        <div style={{ fontSize: 8, color: "#94a3b8", marginTop: 4 }}>
                          {pct}% of team
                        </div>
                      </div>
                    );
                  })}
                  {otherDeptCount > 0 && (
                    <div
                      title={`${deptData.length - 5} more departments`}
                      style={{
                        background: "#fff",
                        border: "1px dashed #d8b4fe",
                        borderRadius: 11,
                        padding: "9px 10px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                          marginBottom: 7,
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: "#e2e8f0",
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            flex: 1,
                            color: "#334155",
                            fontSize: 10,
                            fontWeight: 600,
                          }}
                        >
                          Others
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "#1e1b4b" }}>
                          {otherDeptCount}
                        </span>
                      </div>
                      <Prog
                        pct={(otherDeptCount / Math.max(deptTotal, 1)) * 100}
                        color="#94a3b8"
                      />
                      <div style={{ fontSize: 8, color: "#94a3b8", marginTop: 4 }}>
                        {deptData.length - 5} more departments
                      </div>
                    </div>
                  )}
                </div>
                <div
                  style={{
                    marginTop: 10,
                    paddingTop: 10,
                    borderTop: "1px solid #f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <span style={{ fontSize: 10, color: "#94a3b8" }}>
                    Showing the largest departments for a cleaner snapshot.
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: "#6366f1",
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    View employees →
                  </span>
                </div>
              </div>
            </div>
            )}
          </WCard>
        </div>

        {/* ══ CHARTS ROW 2: Headcount growth + Leave breakdown ═══════════════ */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
            marginBottom: 14,
          }}
        >
          <WCard onClick={() => navigate("/employees")}>
            <SHead
              icon={<TrendingUp size={14} color="#10b981" />}
              title="Headcount Growth"
              right={
                <span
                  style={{ fontSize: 12, fontWeight: 800, color: "#10b981" }}
                >
                  {growthData.length
                    ? growthData[growthData.length - 1]?.count
                    : "Live"}
                </span>
              }
            />
            <ResponsiveContainer width="100%" height={185}>
              <AreaChart data={growthData}>
                <defs>
                  <linearGradient id="gr1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  domain={["dataMin - 10", "dataMax + 10"]}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: "none",
                    boxShadow: "0 4px 20px rgba(0,0,0,.1)",
                    fontSize: 11,
                  }}
                  cursor={{ stroke: "#e2e8f0" }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#a855f7"
                  strokeWidth={2.5}
                  fill="url(#gr1)"
                  dot={{
                    r: 4,
                    fill: "#a855f7",
                    stroke: "#fff",
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </WCard>

          <WCard onClick={() => navigate("/leave")}>
            <SHead
              icon={<FileText size={14} color="#f97316" />}
              title="Leave Requests by Type"
              right={
                pendingLv > 0 ? (
                  <Chip bg="#fef3c7" fg="#d97706">
                    {pendingLv} Pending Requests
                  </Chip>
                ) : undefined
              }
            />
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <div
                style={{
                  position: "relative",
                  width: 130,
                  height: 130,
                  flexShrink: 0,
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={leaveData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={53}
                      dataKey="used"
                      stroke="none"
                    >
                      {leaveData.map((d, i) => (
                        <Cell key={i} fill={d.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%,-50%)",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{ fontSize: 14, fontWeight: 800, color: "#1e1b4b" }}
                  >
                    {leaveTotalUsed}
                  </div>
                  <div style={{ fontSize: 8, color: "#9ca3af" }}>TOTAL REQUESTS</div>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                {leaveData.map((d, i) => (
                  <div key={i} style={{ marginBottom: 9 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 10,
                      }}
                    >
                      <span
                        style={{
                          color: "#374151",
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: d.color,
                            display: "inline-block",
                          }}
                        />
                        {d.type}
                      </span>
                      <span style={{ fontWeight: 700, color: "#1e1b4b" }}>
                        {d.used}
                        <span style={{ color: "#d1d5db", fontWeight: 400 }}>
                          /{d.total}
                        </span>
                      </span>
                    </div>
                    <Prog pct={(d.used / d.total) * 100} color={d.color} />
                  </div>
                ))}
              </div>
            </div>
          </WCard>
        </div>

        {/* 3-COL: Pending Actions + Urgent Alerts + Department Heads */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: 14,
            marginBottom: 14,
          }}
        >
          <WCard>
            <SHead
              icon={<AlertTriangle size={14} color="#f59e0b" />}
              title="Pending Actions"
              right={
                <Chip bg="#fef3c7" fg="#d97706">
                  {actions.length}
                </Chip>
              }
            />
            {actions.length === 0 ? (
              <EmptyState>No live pending actions.</EmptyState>
            ) : (
              <div style={{ maxHeight: 200, overflowY: "auto" }}>
                {actions.map((a, i) => (
                  <div
                    key={i}
                    className="rh"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 6px",
                      borderBottom:
                        i < actions.length - 1 ? "1px solid #f3f4f6" : "none",
                    }}
                  >
                    <span style={{ fontSize: 15 }}>{a.marker}</span>
                    <span
                      style={{
                        flex: 1,
                        fontSize: 11,
                        color: "#374151",
                        lineHeight: 1.4,
                      }}
                    >
                      {a.text}
                    </span>
                    <button
                      onClick={() => navigate(a.link)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#6366f1",
                        fontSize: 10,
                        fontWeight: 700,
                        cursor: "pointer",
                        padding: "2px 0",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {a.cta}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </WCard>

          <WCard>
            <SHead
              icon={<ShieldAlert size={14} color="#ef4444" />}
              title="Urgent Alerts"
              right={
                <Chip bg="#fef2f2" fg="#dc2626">
                  {alerts.length}
                </Chip>
              }
            />
            {alerts.length === 0 ? (
              <EmptyState>No live urgent alerts.</EmptyState>
            ) : (
              <div style={{ maxHeight: 200, overflowY: "auto" }}>
                {alerts.map((a, i) => (
                  <div
                    key={i}
                    className="rh"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 6px",
                      borderBottom:
                        i < alerts.length - 1 ? "1px solid #f3f4f6" : "none",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{ fontSize: 11, fontWeight: 600, color: "#1e1b4b" }}
                      >
                        {a.name}
                      </div>
                      <div style={{ fontSize: 9, color: "#9ca3af", marginTop: 2 }}>
                        {a.sub}
                      </div>
                    </div>
                    <Chip bg={a.bg} fg={a.fg}>
                      {a.chip}
                    </Chip>
                  </div>
                ))}
              </div>
            )}
          </WCard>

          <WCard>
            <SHead
              icon={<UserCheck size={14} color="#0f766e" />}
              title="Department Heads"
              right={
                <Chip bg="#ecfdf5" fg="#047857">
                  {departmentHeads.length}
                </Chip>
              }
            />
            {departmentHeads.length === 0 ? (
              <EmptyState>No department heads assigned.</EmptyState>
            ) : (
              <div style={{ maxHeight: 200, overflowY: "auto" }}>
                {departmentHeads.map((head, i) => (
                  <div
                    key={i}
                    className="rh"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 6px",
                      borderBottom:
                        i < departmentHeads.length - 1 ? "1px solid #f3f4f6" : "none",
                    }}
                  >
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        background: head.color,
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 9,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {head.ini}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{ fontSize: 11, fontWeight: 600, color: "#1e1b4b" }}
                      >
                        {head.name}
                      </div>
                      <div style={{ fontSize: 9, color: "#6b7280" }}>
                        {head.department}
                      </div>
                      {head.location ? (
                        <div style={{ fontSize: 9, color: "#9ca3af", marginTop: 2 }}>
                          {head.location}
                        </div>
                      ) : null}
                    </div>
                    <span
                      style={{ fontSize: 10, fontWeight: 800, color: "#0f766e" }}
                    >
                      {head.employeeId}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </WCard>
        </div>

        {/* ══ 2-COL: Recent Activity + Announcements ══════════════════════════ */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
            marginBottom: 14,
          }}
        >
          <WCard>
            <SHead
              icon={<Activity size={14} color="#6b7280" />}
              title="Recent Activity"
              right={
                <button
                  onClick={() => navigate("/audit-log")}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 10,
                    color: "#6366f1",
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  View All →
                </button>
              }
            />
            {activity.length === 0 ? (
              <EmptyState>No recent activity available.</EmptyState>
            ) : (
              <div style={{ maxHeight: 200, overflowY: "auto" }}>
                {activity.map((a, i) => (
                  <div
                    key={i}
                    className="rh"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 6px",
                      borderBottom:
                        i < activity.length - 1 ? "1px solid #f3f4f6" : "none",
                    }}
                  >
                    <ActivityIcon type={a.activityIcon} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: "#374151" }}>{a.text}</div>
                      <div style={{ fontSize: 9, color: "#d1d5db", marginTop: 2 }}>
                        {a.time} · {a.by}
                      </div>
                    </div>
                    <Chip bg={a.cBg} fg={a.cFg}>
                      {a.chip}
                    </Chip>
                  </div>
                ))}
              </div>
            )}
          </WCard>

          <WCard>
            <SHead
              icon={<Megaphone size={14} color="#f59e0b" />}
              title="Announcements"
            />
            {combinedAnnouncements.length === 0 ? (
              <EmptyState>No calendar announcements available.</EmptyState>
            ) : (
              <div style={{ maxHeight: 200, overflowY: "auto" }}>
                {combinedAnnouncements.map((a: any, i: number) => (
                  <div
                    key={i}
                    style={{
                      padding: "10px 0",
                      borderBottom:
                        i < combinedAnnouncements.length - 1
                          ? "1px solid #f3f4f6"
                          : "none",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#1e1b4b",
                          lineHeight: 1.3,
                        }}
                      >
                        {a.title}
                      </span>
                      <span
                        style={{
                          fontSize: 9,
                          color: "#d1d5db",
                          whiteSpace: "nowrap",
                          marginTop: 2,
                        }}
                      >
                        {a.date}
                      </span>
                    </div>
                    <p
                      style={{
                        margin: "4px 0 0",
                        fontSize: 10,
                        color: "#9ca3af",
                        lineHeight: 1.55,
                      }}
                    >
                      {a.text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </WCard>
        </div>

        {/* ══ CALENDAR + BIRTHDAYS (Same size as other cards) ════════════════ */}
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}
        >
          {/* Calendar - compact mini calendar that syncs with DataContext */}
          <WCard>
            <SHead
              icon={<CalendarDays size={14} color="#6366f1" />}
              title="Calendar — Events"
              right={
                <button
                  onClick={() => navigate("/calendar")}
                  style={{
                    fontSize: 11,
                    color: "#6366f1",
                    fontWeight: 600,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  View Full →
                </button>
              }
            />
            <MiniCalendar
              employees={
                filteredEmployees && filteredEmployees.length
                  ? filteredEmployees
                  : employees
              }
              events={calendarApiEvents.map((g: any) => ({
                date: g.date,
                start_date: g.start_date || g.date,
                end_date: g.end_date || g.start_date || g.date,
                title: g.title || g.type,
                type: g.type,
              }))}
            />
          </WCard>

          {/* Birthdays - Exactly same size as other cards */}
          <WCard>
            <SHead
              icon={<Cake size={14} color="#ec4899" />}
              title="Employee Birthdays"
              right={
                <span
                  style={{
                    background: "#fdf2f8",
                    color: "#ec4899",
                    padding: "3px 9px",
                    borderRadius: 20,
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  Full Year · {birthdays.length}
                </span>
              }
            />

            {birthdays.length === 0 ? (
              <div style={{ textAlign: "center", padding: "36px 20px" }}>
                <div style={{ fontSize: 28 }}><Cake size={48} color="var(--p)" /></div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>
                  No birthdays in the next 30 days
                </div>
              </div>
            ) : (
              <div style={{ maxHeight: 340, overflowY: "auto" }}>
                {birthdays.map((b, i) => (
                  <div
                    key={i}
                    className="rh"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 6px",
                      borderBottom:
                        i < birthdays.length - 1 ? "1px solid #f3f4f6" : "none",
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        flexShrink: 0,
                        background:
                          b.daysUntil === 0
                            ? "linear-gradient(135deg,#ec4899,#fbcfe8)"
                            : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {b.daysUntil === 0 ? <Cake size={16} /> : b.ini}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#1e1b4b",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {b.name}
                      </div>
                      <div
                        style={{ fontSize: 9, color: "#9ca3af", marginTop: 1 }}
                      >
                        {b.dept}
                      </div>
                    </div>
                    <div
                      style={{
                        background:
                          b.daysUntil === 0
                            ? "#ec4899"
                            : b.daysUntil <= 3
                              ? "#f59e0b"
                              : "#eff6ff",
                        color: b.daysUntil <= 3 ? "#fff" : "#6366f1",
                        padding: "3px 8px",
                        borderRadius: 16,
                        fontSize: 9,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      {b.daysUntil === 0
                        ? "Today"
                        : b.daysUntil === 1
                          ? "Tomorrow"
                          : `${b.daysUntil}d`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </WCard>
        </div>
      </div>
    </>
  );
}
