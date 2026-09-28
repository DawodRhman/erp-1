import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import { formatPKR } from "../services/api";
import { useEmployeeSelfMetrics } from "../hooks/useDashboard";
import { useLeaves } from "../hooks/useLeaves";
import { useAttendance } from "../hooks/useAttendance";
import { useMyPenalties } from "../hooks/usePenalties";
import {
  Calendar,
  CalendarDays,
  Clock,
  FileText,
  Plus,
  User,
  Lock,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import Modal from "../components/common/Modal";
import { useToastContext } from "../context/ToastContext";
import { useCalendarEvents } from "../hooks/useCalendarEvents";

export default function MyDashboard() {
  const { user } = useAuth();
  const [time, setTime] = useState(new Date());
  const { employees = [] } = useData();
  const { data: metrics } = useEmployeeSelfMetrics();
  const todayParam = `${time.getFullYear()}-${String(time.getMonth() + 1).padStart(2, "0")}-${String(time.getDate()).padStart(2, "0")}`;

  // Real data hooks
  const { data: myLeavesData, create: createLeave } = useLeaves(
    user?.employeeId ? { employee_id: user.employeeId } : undefined,
  );
  const { data: myAttendanceData, acknowledge: acknowledgeAttendance } = useAttendance({
    date: todayParam,
    employee_id: user?.employeeId,
  });
  const { data: myPenaltiesData } = useMyPenalties();
  const { data: calendarApiEvents = [] } = useCalendarEvents();

  const leaveRequests = Array.isArray(myLeavesData) ? myLeavesData : [];
  const attendanceData = Array.isArray(myAttendanceData)
    ? myAttendanceData
    : [];
  const penaltiesData = Array.isArray(myPenaltiesData) ? myPenaltiesData : [];

  const [leaveModal, setLeaveModal] = useState(false);
  const [leaveType, setLeaveType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const { showToast } = useToastContext();

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const dateStr = time.toLocaleDateString("en-PK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeStr =
    time.toLocaleTimeString("en-PK", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }) + " PKT";

  const balances = useMemo(() => {
    if (metrics?.leave_balances) {
      return metrics.leave_balances.map((b: any) => ({
        id: b.leave_type_id || b.leaveTypeId || b.type_id || b.id || "",
        type: b.name || b.leave_type_name || b.type || "Leave",
        remaining: b.remaining,
        total: b.balance || b.total || b.allowed || b.remaining,
        color:
          b.name === "Annual"
            ? "var(--p)"
            : b.name === "Casual"
              ? "var(--green)"
              : "var(--teal)",
      }));
    }
    return [];
  }, [metrics]);

  const calcDays = () => {
    if (!fromDate || !toDate) return 0;
    const diff =
      (new Date(toDate).getTime() - new Date(fromDate).getTime()) /
      (1000 * 60 * 60 * 24);
    return Math.max(0, diff + 1);
  };

  const selectedBalance =
    balances.find((b) => b.id === leaveType) || balances[0];
  const selectedLeaveTypeId = leaveType || selectedBalance?.id || "";
  const daysRequested = calcDays();
  const overBalance =
    selectedBalance && daysRequested > selectedBalance.remaining;

  const handleLeaveSubmit = async () => {
    if (!user?.employeeId) {
      showToast("Your employee profile is not linked yet.", "error");
      return;
    }
    if (!selectedLeaveTypeId) {
      showToast("No leave type is assigned to your profile yet.", "error");
      return;
    }
    if (!fromDate || !toDate || !reason) {
      showToast("Please fill all fields", "error");
      return;
    }
    if (overBalance) {
      showToast("Requested days exceed your available balance.", "error");
      return;
    }
    try {
      await createLeave({
        employee_id: user.employeeId,
        leave_type_id: selectedLeaveTypeId,
        start_date: fromDate,
        end_date: toDate,
        reason,
      });
      showToast("Leave request submitted");
      setLeaveModal(false);
      setFromDate("");
      setToDate("");
      setReason("");
      setLeaveType("");
    } catch {
      showToast("Could not submit leave request.", "error");
    }
  };

  const formatDateOnly = (value?: string) => {
    if (!value) return "-";
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, year, month, day] = match;
      return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))));
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const getInitials = (name?: string) =>
    String(name || "Employee")
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const currentEmployeeId = user?.employeeId;
  const currentMonth = time.getMonth();
  const currentYear = time.getFullYear();

  const employeeAttendance = attendanceData.filter((a: any) => {
    const rowEmployeeId = a.employee_id || a.empId || a.employeeId;
    return !rowEmployeeId || rowEmployeeId === currentEmployeeId;
  });
  const todayKey = todayParam;
  const todayAttendance = employeeAttendance.find((a: any) => {
    const rawDate = String(a.date || a.attendance_date || a.created_at || "");
    return rawDate.slice(0, 10) === todayKey;
  });
  const latestAttendance = todayAttendance || employeeAttendance[0];
  const attendanceId = latestAttendance?.id || latestAttendance?.attendance_id;
  const attendanceAcked = Boolean(
    latestAttendance?.ack ||
      latestAttendance?.acknowledged ||
      latestAttendance?.is_acknowledged,
  );
  const shiftName =
    metrics?.shift_name ||
    metrics?.employee?.shift_name ||
    metrics?.profile?.shift_name ||
    latestAttendance?.shift_name ||
    "Assigned Shift";
  const shiftStart =
    metrics?.shift_start_time ||
    metrics?.employee?.shift_start_time ||
    latestAttendance?.shift_start_time ||
    "-";
  const shiftEnd =
    metrics?.shift_end_time ||
    metrics?.employee?.shift_end_time ||
    latestAttendance?.shift_end_time ||
    "-";
  const departmentName =
    metrics?.department_name ||
    metrics?.employee?.department_name ||
    metrics?.profile?.department_name ||
    user?.department_name ||
    user?.department ||
    user?.departments?.[0] ||
    "Not assigned";
  const formatTimeOnly = (value?: string) => {
    if (!value) return "-";
    const text = String(value);
    const match = text.match(/(\d{2}):(\d{2})/);
    return match ? `${match[1]}:${match[2]}` : text;
  };
  const handleAcknowledgeAttendance = async () => {
    if (!attendanceId) {
      showToast("No attendance record is available to acknowledge.", "error");
      return;
    }
    await acknowledgeAttendance(attendanceId);
    showToast("Attendance acknowledged.");
  };
  const monthlyAttendance = employeeAttendance.filter((a: any) => {
    const rawDate = a.date || a.attendance_date || a.created_at;
    if (!rawDate) return false;
    const date = new Date(rawDate);
    return (
      !Number.isNaN(date.getTime()) &&
      date.getMonth() === currentMonth &&
      date.getFullYear() === currentYear
    );
  });
  const presentThisMonth = monthlyAttendance.filter((a: any) =>
    ["present", "late"].includes(String(a.status || "").toLowerCase()),
  ).length;
  const workingDaysThisMonth =
    metrics?.working_days_this_month ||
    metrics?.workingDaysThisMonth ||
    monthlyAttendance.length;
  const attendancePercent = workingDaysThisMonth
    ? Math.min(100, Math.round((presentThisMonth / workingDaysThisMonth) * 100))
    : 0;
  const pendingLeaveCount = leaveRequests.filter(
    (l: any) => String(l.status || "").toLowerCase() === "pending",
  ).length;

  const teamMembers = Array.isArray(metrics?.team_members)
    ? metrics.team_members.map((member: any) => ({
        name: member.name || member.employee_name || "Team Member",
        dept: member.department_name || member.department || "Team",
        initials: getInitials(member.name || member.employee_name),
      }))
    : [];

  const employeePenalties = penaltiesData.filter((p: any) => {
    const rowEmployeeId = p.employee_id || p.empId || p.employeeId;
    return !rowEmployeeId || rowEmployeeId === currentEmployeeId;
  });
  const recentPenalties = [...employeePenalties]
    .sort((a: any, b: any) => {
      const da = new Date(a.date || a.penalty_date || a.created_at || 0).getTime();
      const db = new Date(b.date || b.penalty_date || b.created_at || 0).getTime();
      return db - da;
    })
    .slice(0, 3);
  const penaltyAmount = (p: any) =>
    Number(p.amount || p.final_amount || p.deduction_amount || p.penalty_amount || 0);
  const penaltyStatus = (p: any) => String(p.status || "").toLowerCase();
  const penaltyThisMonth = employeePenalties.filter((p: any) => {
    const rawDate = p.date || p.penalty_date || p.created_at;
    if (!rawDate) return false;
    const date = new Date(rawDate);
    return (
      !Number.isNaN(date.getTime()) &&
      date.getMonth() === currentMonth &&
      date.getFullYear() === currentYear
    );
  });
  const penaltyThisMonthTotal = penaltyThisMonth.reduce(
    (sum: number, p: any) => sum + penaltyAmount(p),
    0,
  );
  const totalDeducted = employeePenalties
    .filter((p: any) => !["waived", "cancelled", "rejected"].includes(penaltyStatus(p)))
    .reduce((sum: number, p: any) => sum + penaltyAmount(p), 0);
  const totalWaived = employeePenalties
    .filter((p: any) => ["waived"].includes(penaltyStatus(p)))
    .reduce((sum: number, p: any) => sum + penaltyAmount(p), 0);
  const activePenaltyCount = employeePenalties.filter((p: any) =>
    ["approved", "acknowledged", "applied"].includes(penaltyStatus(p)),
  ).length;

  // Calendar events
  const calendarEvents = useMemo(() => {
    const events: Record<
      string,
      { type: string; label: string; color: string }[]
    > = {};
    // Birthdays from employees
    employees.forEach((emp: any) => {
      if (!emp.dob) return;
      const dobDate = new Date(emp.dob);
      if (dobDate.getMonth() === calMonth) {
        const day = dobDate.getDate();
        if (!events[day]) events[day] = [];
        events[day].push({
          type: "birthday",
          label: `${emp.name}`,
          color: "#e91e63",
        });
      }
    });
    // Backend calendar events (holidays, HR events)
    calendarApiEvents.forEach((gd: any) => {
      const gdDate = new Date(gd.date);
      if (gdDate.getMonth() === calMonth && gdDate.getFullYear() === calYear) {
        const day = gdDate.getDate();
        if (!events[day]) events[day] = [];
        events[day].push({
          type: gd.type,
          label: gd.title,
          color:
            gd.type === "emergency"
              ? "#b71c1c"
              : gd.type === "holiday"
                ? "#1b7a4e"
                : "#1565c0",
        });
      }
    });
    // Approved leaves (show team members on leave)
    leaveRequests
      .filter((l: any) => l.status === "Approved")
      .forEach((l: any) => {
        const from = new Date(l.from);
        const to = new Date(l.to);
        for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
          if (d.getMonth() === calMonth && d.getFullYear() === calYear) {
            const day = d.getDate();
            if (!events[day]) events[day] = [];
            if (!events[day].find((e) => e.label === `${l.empName} (Leave)`)) {
              events[day].push({
                type: "leave",
                label: `${l.empName} (Leave)`,
                color: "#1565c0",
              });
            }
          }
        }
      });
    return events;
  }, [employees, calendarApiEvents, leaveRequests, calMonth, calYear]);

  // Upcoming birthdays (next 30 days)
  const upcomingBirthdays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const birthdays: {
      name: string;
      date: Date;
      daysUntil: number;
      initials: string;
    }[] = [];
    employees.forEach((emp: any) => {
      if (!emp.dob) return;
      const dob = new Date(emp.dob);
      let birthday = new Date(
        today.getFullYear(),
        dob.getMonth(),
        dob.getDate(),
      );
      if (birthday < today) {
        birthday = new Date(
          today.getFullYear() + 1,
          dob.getMonth(),
          dob.getDate(),
        );
      }
      const daysUntil = Math.ceil(
        (birthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysUntil <= 30) {
        const nameParts = emp.name.split(" ");
        const initials = nameParts
          .map((n: string) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();
        birthdays.push({ name: emp.name, date: birthday, daysUntil, initials });
      }
    });
    return birthdays.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [employees]);

  const upcomingHolidays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return calendarApiEvents
      .filter((day: any) => {
        const type = String(day.type || "").toLowerCase();
        const date = new Date(day.date);
        return type === "holiday" && date >= today;
      })
      .map((day: any) => {
        const date = new Date(day.date);
        const daysUntil = Math.ceil(
          (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        );
        return {
          title: day.title || "Holiday",
          date,
          daysUntil,
        };
      })
      .sort((a: any, b: any) => a.daysUntil - b.daysUntil)
      .slice(0, 3);
  }, [calendarApiEvents]);

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
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();

  return (
    <div>
      {/* Welcome Banner */}
      <div
        className="card"
        style={{
          marginBottom: 12,
          background: "linear-gradient(135deg, var(--pl), var(--card))",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--t1)" }}>
              Welcome back, {user?.name || user?.username || "Employee"}
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
              {[
                { label: "Employee ID", value: user?.employeeId || "—" },
                {
                  label: "Department",
                  value: departmentName,
                },
                {
                  label: "Shift",
                  value: `${shiftName} (${formatTimeOnly(shiftStart)}-${formatTimeOnly(shiftEnd)})`,
                },
              ].map((item, i) => (
                <span
                  key={i}
                  className="mono"
                  style={{ fontSize: 10.5, color: "var(--t3)" }}
                >
                  {item.label}:{" "}
                  <strong style={{ color: "var(--t1)" }}>{item.value}</strong>
                </span>
              ))}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="mono" style={{ fontSize: 11, color: "var(--t2)" }}>
              {dateStr}
            </div>
            <div
              className="mono"
              style={{ fontSize: 14, fontWeight: 600, color: "var(--p)" }}
            >
              {timeStr}
            </div>
          </div>
        </div>
      </div>

      {/* Today's Schedule + Attendance ACK */}
      <div className="g2" style={{ marginBottom: 0 }}>
        <div className="card" style={{ position: "relative", overflow: "hidden" }}>
          <div className="ch">
            <div className="ct">
              <div className="ct-ico blue">
                <Clock size={13} />
              </div>
              Today's Schedule
            </div>
          </div>
          <div style={{ display: "flex", gap: 20, fontSize: 12.5, flexWrap: "wrap" }}>
            <div>
              <div
                style={{ fontSize: 10, color: "var(--t3)", marginBottom: 2 }}
              >
                Shift Start
              </div>
              <div className="mono" style={{ fontWeight: 600 }}>
                {formatTimeOnly(shiftStart)}
              </div>
            </div>
            <div>
              <div
                style={{ fontSize: 10, color: "var(--t3)", marginBottom: 2 }}
              >
                Shift End
              </div>
              <div className="mono" style={{ fontWeight: 600 }}>
                {formatTimeOnly(shiftEnd)}
              </div>
            </div>
            <div>
              <div
                style={{ fontSize: 10, color: "var(--t3)", marginBottom: 2 }}
              >
                HR Marked
              </div>
              <div className="mono" style={{ fontWeight: 600 }}>
                {formatTimeOnly(latestAttendance?.checkIn || latestAttendance?.check_in)}
              </div>
            </div>
          </div>
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span
              className={`pill ${
                String(latestAttendance?.status || "").toLowerCase() === "present"
                  ? "pill-green"
                  : String(latestAttendance?.status || "").toLowerCase() === "late"
                    ? "pill-amber"
                    : "pill-blue"
              }`}
            >
              {latestAttendance?.status
                ? `Marked ${latestAttendance.status}`
                : "Not marked yet"}
            </span>
            {attendanceId && !attendanceAcked ? (
              <button className="btn btn-primary" onClick={handleAcknowledgeAttendance}>
                Acknowledge Attendance
              </button>
            ) : attendanceId ? (
              <span className="pill pill-green">Acknowledged</span>
            ) : null}
          </div>
        </div>
        <div className="card" style={{ position: "relative", overflow: "hidden" }}>
          <div className="ch">
            <div className="ct">
              <div className="ct-ico green">
                <User size={13} />
              </div>
              Quick Actions
            </div>
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
          >
            <button
              className="btn btn-ghost"
              style={{ justifyContent: "flex-start" }}
              onClick={() => setLeaveModal(true)}
            >
              <Calendar size={13} /> Apply for Leave
            </button>
            <Link
              className="btn btn-ghost"
              style={{ justifyContent: "flex-start" }}
              to="/my-directory"
            >
              <User size={13} /> Company Directory
            </Link>
            <Link
              className="btn btn-ghost"
              style={{ justifyContent: "flex-start" }}
              to="/change-password"
            >
              <Lock size={13} /> Change Password
            </Link>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="kpi-strip">
        <div className="kpi-item k1">
          <div className="kpi-ico k1">
            <Calendar size={17} />
          </div>
          <div>
            <div className="kpi-val">
              {presentThisMonth}
              <span style={{ fontSize: 13, color: "var(--t3)" }}>
                {" "}
                / {workingDaysThisMonth || 0}
              </span>
            </div>
            <div className="kpi-lbl">Attendance This Month</div>
            <div className="progress-bar" style={{ width: 80, marginTop: 4 }}>
              <div
                className="progress-fill"
                style={{ width: `${attendancePercent}%`, background: "var(--p)" }}
              />
            </div>
          </div>
        </div>
        <div
          className="kpi-item k2"
          style={{ flexDirection: "column", alignItems: "flex-start", gap: 4 }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--t1)",
              marginBottom: 4,
            }}
          >
            Leave Balance
          </div>
          {balances.length ? (
            balances.map((b: any, i: number) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                }}
              >
                <span style={{ fontSize: 10.5, color: "var(--t2)", width: 50 }}>
                  {b.type}
                </span>
                <div className="progress-bar" style={{ flex: 1, height: 4 }}>
                  <div
                    className="progress-fill"
                    style={{
                      width: `${b.total ? (b.remaining / b.total) * 100 : 0}%`,
                      background: b.color,
                    }}
                  />
                </div>
                <span
                  className="mono"
                  style={{ fontSize: 10, color: "var(--t2)", width: 40 }}
                >
                  {b.remaining}/{b.total}
                </span>
              </div>
            ))
          ) : (
            <div style={{ fontSize: 11, color: "var(--t3)" }}>
              Leave balances are not assigned yet.
            </div>
          )}
        </div>
        <div className="kpi-item k3">
          <div className="kpi-ico k3">
            <Clock size={17} />
          </div>
          <div>
            <div className="kpi-val">{pendingLeaveCount}</div>
            <div className="kpi-lbl">Pending Requests</div>
          </div>
        </div>
        <div className="kpi-item k4">
          <div className="kpi-ico k4">
            <AlertTriangle size={17} />
          </div>
          <div>
            <div className="kpi-val">{activePenaltyCount}</div>
            <div className="kpi-lbl">Active Penalties</div>
          </div>
        </div>
      </div>

      {/* Attendance + Leave + Team */}
      <div className="g2">
        <div className="card">
          <div className="ch">
            <div className="ct">
              <div className="ct-ico blue">
                <Calendar size={13} />
              </div>
              My Attendance (Last 7 Days)
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Day</th>
                <th>Status</th>
                <th>In</th>
                <th>Out</th>
              </tr>
            </thead>
            <tbody>
              {employeeAttendance.slice(0, 7).map((a: any, i: number) => (
                <tr
                  key={i}
                  style={i === 0 ? { background: "var(--pl)" } : {}}
                >
                  <td className="mono">
                    {formatDateOnly(a.date || a.attendance_date || a.created_at)}
                  </td>
                  <td>{a.day || "-"}</td>
                  <td>
                    <span
                      className={`pill ${a.status === "Present" ? "pill-green" : a.status === "Late" ? "pill-amber" : "pill-red"}`}
                    >
                      {a.status || "-"}
                    </span>
                  </td>
                  <td className="mono">{a.checkIn || a.check_in || "-"}</td>
                  <td className="mono">{a.checkOut || a.check_out || "-"}</td>
                </tr>
              ))}
              {!employeeAttendance.length && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "var(--t3)" }}>
                    No attendance records yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="card">
          <div className="ch">
            <div className="ct">
              <div className="ct-ico amber">
                <FileText size={13} />
              </div>
              My Leave Requests
            </div>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => setLeaveModal(true)}
            >
              <Plus size={12} /> Apply
            </button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>From</th>
                <th>To</th>
                <th>Days</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {leaveRequests.slice(0, 5).map((l: any, i: number) => (
                <tr key={i}>
                  <td>{l.leaveType || l.leave_type || l.type || "-"}</td>
                  <td className="mono">
                    {formatDateOnly(l.from || l.from_date || l.start_date)}
                  </td>
                  <td className="mono">
                    {formatDateOnly(l.to || l.to_date || l.end_date)}
                  </td>
                  <td className="mono">{l.days || l.total_days || "-"}</td>
                  <td>
                    <span
                      className={`pill ${l.status === "Approved" ? "pill-green" : l.status === "Pending" ? "pill-amber" : "pill-red"}`}
                    >
                      {l.status || "-"}
                    </span>
                  </td>
                </tr>
              ))}
              {!leaveRequests.length && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "var(--t3)" }}>
                    No leave requests yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Future Team + Tab 1 Holidays */}
      <div className="g2">
        <div className="card" style={{ position: "relative", overflow: "hidden" }}>
          <div className="ch">
            <div className="ct">
              <div className="ct-ico teal">
                <User size={13} />
              </div>
              My Team
            </div>
          </div>
          {teamMembers.length ? (
            teamMembers.map((m: any, i: number) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 0",
                  borderBottom: "1px solid var(--br2)",
                }}
              >
                <div
                  className="feed-av"
                  style={{
                    background: "var(--p)",
                    width: 28,
                    height: 28,
                    fontSize: 9,
                  }}
                >
                  {m.initials}
                </div>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{m.name}</div>
                  <div style={{ fontSize: 10, color: "var(--t3)" }}>{m.dept}</div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ fontSize: 12, color: "var(--t3)", padding: "8px 0" }}>
              Team members will appear here after assignment.
            </div>
          )}
        </div>
        <div className="card">
          <div className="ch">
            <div className="ct">
              <div
                className="ct-ico"
                style={{ background: "#fce4ec", color: "#e91e63" }}
              >
                <CalendarDays size={13} />
              </div>
              Upcoming Holidays
            </div>
          </div>
          {upcomingHolidays.length ? (
            upcomingHolidays.map((b, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 0",
                borderBottom:
                  i < upcomingHolidays.length - 1 ? "1px solid var(--br2)" : "none",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background:
                    b.daysUntil === 0
                      ? "linear-gradient(135deg, #e91e63, #f48fb1)"
                      : "var(--p)",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {b.daysUntil === 0 ? "Today" : "Off"}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{ fontSize: 13, fontWeight: 600, color: "var(--t1)" }}
                >
                  {b.title}
                </div>
                <div
                  className="mono"
                  style={{ fontSize: 10, color: "var(--t3)" }}
                >
                  {b.date.toLocaleDateString("en-PK", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </div>
              </div>
              <span
                className={`pill`}
                style={{
                  background:
                    b.daysUntil === 0
                      ? "#e91e63"
                      : b.daysUntil === 1
                        ? "#ff9800"
                        : b.daysUntil <= 7
                          ? "#4caf50"
                          : "#e3f2fd",
                  color: b.daysUntil <= 7 ? "white" : "#1565c0",
                  fontWeight: 600,
                  fontSize: 10,
                }}
              >
                {b.daysUntil === 0
                  ? "Today"
                  : b.daysUntil === 1
                    ? "Tomorrow"
                    : `${b.daysUntil} days`}
              </span>
            </div>
            ))
          ) : (
            <div style={{ padding: "12px 0", color: "var(--t3)", fontSize: 12 }}>
              No upcoming holidays.
            </div>
          )}
        </div>
      </div>

      {/* Full calendar is future scope beyond SRS Tab 1 employee dashboard widgets. */}
      <div
        className="card"
        style={{ marginBottom: 12, position: "relative", overflow: "hidden" }}
      >
        <div className="ch">
          <div className="ct">
            <div className="ct-ico blue">
              <CalendarDays size={13} />
            </div>
            Full Calendar
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => {
              if (calMonth === 0) {
                setCalMonth(11);
                setCalYear((y) => y - 1);
              } else setCalMonth((m) => m - 1);
            }}
          >
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontSize: 13, fontWeight: 700 }}>
            {monthNames[calMonth]} {calYear}
          </span>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => {
              if (calMonth === 11) {
                setCalMonth(0);
                setCalYear((y) => y + 1);
              } else setCalMonth((m) => m + 1);
            }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 3,
            textAlign: "center",
          }}
        >
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
            <div
              key={i}
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "var(--t3)",
                padding: 6,
              }}
            >
              {d}
            </div>
          ))}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`e${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const evts = calendarEvents[day] || [];
            const isToday =
              day === new Date().getDate() &&
              calMonth === new Date().getMonth() &&
              calYear === new Date().getFullYear();
            const hasBirthday = evts.some((e) => e.type === "birthday");
            const hasHoliday = evts.some(
              (e) => e.type === "holiday" || e.type === "emergency",
            );
            return (
              <div
                key={day}
                style={{
                  padding: 5,
                  borderRadius: 8,
                  background: isToday
                    ? "var(--pl)"
                    : hasBirthday
                      ? "#fce4ec"
                      : hasHoliday
                        ? "#e8f5e9"
                        : evts.length > 0
                          ? "#f8fafc"
                          : "transparent",
                  minHeight: 52,
                  cursor: evts.length > 0 ? "pointer" : "default",
                  border: isToday
                    ? "2px solid var(--p)"
                    : hasBirthday
                      ? "1px solid #f48fb1"
                      : hasHoliday
                        ? "1px solid #81c784"
                        : "1px solid transparent",
                  transition: "all 0.15s ease",
                }}
                title={evts
                  .map((e) =>
                    e.type === "birthday"
                      ? `${e.label}'s birthday`
                      : e.label,
                  )
                  .join("\n")}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: isToday ? 700 : 500,
                    color: isToday ? "var(--p)" : "var(--t2)",
                    marginBottom: 2,
                  }}
                >
                  {day}
                </div>
                {evts.slice(0, 2).map((e, ei) => (
                  <div
                    key={ei}
                    style={{
                      fontSize: 8,
                      padding: "2px 3px",
                      borderRadius: 4,
                      background: e.color + "20",
                      color: e.color,
                      marginTop: 2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    {e.type === "birthday" && <CalendarDays size={8} />}
                    {e.type === "birthday"
                      ? e.label.split(" ")[0]
                      : e.label.length > 8
                        ? e.label.slice(0, 8) + "..."
                        : e.label}
                  </div>
                ))}
                {evts.length > 2 && (
                  <div
                    style={{ fontSize: 7, color: "var(--t3)", marginTop: 2 }}
                  >
                    +{evts.length - 2} more
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 12,
            fontSize: 10,
            padding: "8px 12px",
            background: "#f8fafc",
            borderRadius: 8,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#e91e63",
              }}
            />
            Birthday
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#1b7a4e",
              }}
            />
            Holiday
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#b71c1c",
              }}
            />
            Emergency
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#1565c0",
              }}
            />
            Leave
          </span>
        </div>
      </div>

      {/* My Penalties Summary */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="ch">
          <div className="ct">
            <div
              className="ct-ico"
              style={{ background: "#ffebee", color: "#c62828" }}
            >
              <AlertTriangle size={13} />
            </div>
            My Penalties
          </div>
          <Link to="/my-penalties" className="btn btn-sm btn-ghost">
            View All →
          </Link>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              background: "#ffebee",
              borderRadius: 8,
              borderLeft: "3px solid #c62828",
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "var(--t3)",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              This Month
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#c62828",
                marginTop: 4,
              }}
            >
              {formatPKR(penaltyThisMonthTotal)}
            </div>
            <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 2 }}>
              {penaltyThisMonth.length} penalties
            </div>
          </div>
          <div
            style={{
              padding: "12px 16px",
              background: "#fff3e0",
              borderRadius: 8,
              borderLeft: "3px solid #e65100",
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "var(--t3)",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              Total Deducted
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#e65100",
                marginTop: 4,
              }}
            >
              {formatPKR(totalDeducted)}
            </div>
            <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 2 }}>
              All time
            </div>
          </div>
          <div
            style={{
              padding: "12px 16px",
              background: "#e8f5e9",
              borderRadius: 8,
              borderLeft: "3px solid #4caf50",
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: "var(--t3)",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              Total Waived
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#4caf50",
                marginTop: 4,
              }}
            >
              {formatPKR(totalWaived)}
            </div>
            <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 2 }}>
              All time
            </div>
          </div>
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            marginBottom: 8,
            color: "var(--t2)",
          }}
        >
          Recent Penalties
        </div>
        {recentPenalties.length ? (
          recentPenalties.map((p: any, i: number) => (
            <div
              key={p.id || i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 0",
                borderBottom:
                  i < recentPenalties.length - 1 ? "1px solid var(--br2)" : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "#ffebee",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <AlertTriangle size={14} style={{ color: "#c62828" }} />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#c62828",
                    }}
                  >
                    {p.type || p.penalty_type || p.rule_name || "Penalty"}
                  </div>
                  <div
                    className="mono"
                    style={{ fontSize: 10, color: "var(--t3)" }}
                  >
                    {formatDateOnly(p.date || p.penalty_date || p.created_at)}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  className="mono"
                  style={{ fontSize: 12, fontWeight: 600, color: "#c62828" }}
                >
                  {formatPKR(penaltyAmount(p))}
                </div>
                <span className="pill pill-red" style={{ fontSize: 9 }}>
                  {p.status || "Deducted"}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div
            style={{
              padding: "14px 12px",
              borderRadius: 8,
              background: "rgba(16,185,129,.08)",
              color: "var(--green)",
              fontSize: 12,
              fontWeight: 650,
              textAlign: "center",
            }}
          >
            No penalties recorded.
          </div>
        )}
        <Link
          to="/my-penalties"
          style={{
            display: "block",
            textAlign: "center",
            marginTop: 12,
            fontSize: 11,
            color: "var(--p)",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          View full penalty history →
        </Link>
      </div>

      {/* Leave Modal */}
      <Modal
        open={leaveModal}
        onClose={() => setLeaveModal(false)}
        title="Apply for Leave"
        footer={
          <>
            <button
              className="btn btn-secondary"
              onClick={() => setLeaveModal(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              disabled={!fromDate || !toDate || !reason || !!overBalance || !balances.length}
              onClick={handleLeaveSubmit}
            >
              Submit Request
            </button>
          </>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--t3)",
              marginBottom: 8,
            }}
          >
            LEAVE BALANCE
          </div>
          {balances.length ? balances.map((b, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "4px 0",
                fontSize: 12,
              }}
            >
              <span>{b.type} Leave</span>
              <span
                className="mono"
                style={{ color: b.color, fontWeight: 600 }}
              >
                {b.remaining} days remaining
              </span>
            </div>
          )) : (
            <div style={{ color: "var(--t3)", fontSize: 12 }}>
              No leave balances are assigned to your profile.
            </div>
          )}
        </div>
        <div className="form-group">
          <label className="form-label">Leave Type</label>
          <select
            className="input select-input"
            value={selectedLeaveTypeId}
            onChange={(e) => setLeaveType(e.target.value)}
            disabled={!balances.length}
          >
            {balances.map((b) => (
              <option key={b.id || b.type} value={b.id}>
                {b.type} ({b.remaining} remaining)
              </option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">From Date</label>
            <input
              className="input"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">To Date</label>
            <input
              className="input"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Days Requested</label>
          <input
            className="input mono"
            value={daysRequested || ""}
            readOnly
            style={{ background: "var(--steell)" }}
          />
          {overBalance && (
            <div style={{ color: "var(--red)", fontSize: 11, marginTop: 4 }}>
              You only have {selectedBalance?.remaining} days remaining in
              this leave type
            </div>
          )}
        </div>
        <div className="form-group">
          <label className="form-label">Reason</label>
          <textarea
            className="input"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter reason for leave..."
          />
        </div>
      </Modal>
    </div>
  );
}
