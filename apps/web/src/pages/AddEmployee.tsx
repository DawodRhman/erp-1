import React, { useState, useEffect } from "react";
import { useData } from "../context/DataContext";
import { useNavigate } from "react-router-dom";
import { formatPKR } from "../services/api";
import {
  Check,
  Lock,
  X,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  BadgeCheck,
  CalendarDays,
  Fingerprint,
  IdCard,
  ShieldCheck,
  UserRound,
  Briefcase,
  Building2,
  Clock,
  Home,
  Mail,
  MapPin,
  Phone,
  Users,
  Banknote,
  Calculator,
  HeartPulse,
  Landmark,
  PlusCircle,
  WalletCards,
} from "lucide-react";
import DecisionBanner from "../components/common/DecisionBanner";
import { useToastContext } from "../context/ToastContext";
import { renderCredentialTemplate, useCredentialTemplate } from "../hooks/useAccounts";
import { useAuthStore } from "../store/useAuthStore";

// ─── Attractive CSS matching Dashboard aesthetic ──────────────────────────────
const S = `
  *{box-sizing:border-box;}
  @keyframes up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
  @keyframes slideR{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:translateX(0)}}
  @keyframes slideL{from{opacity:0;transform:translateX(-24px)}to{opacity:1;transform:translateX(0)}}

  .add-pg{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;padding:22px 28px;background:#f0f2f8;min-height:100vh;}

  /* Header */
  .add-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;flex-wrap:wrap;gap:12px;}
  .add-title{margin:0;font-size:27px;font-weight:800;color:#1e1b4b;line-height:1.15;}
  .add-sub{margin:4px 0 0;font-size:11px;color:#9ca3af;}

  /* Cards */
  .add-card{background:#fff;border-radius:16px;padding:20px 22px;box-shadow:0 1px 10px rgba(0,0,0,.07);animation:up .4s ease both;}
  .add-card-body{background:#fff;border-radius:16px;padding:24px 26px;box-shadow:0 1px 10px rgba(0,0,0,.07);min-height:300px;}

  /* Stepper */
  .step-track{display:flex;align-items:center;justify-content:center;gap:0;}
  .step-node{display:flex;flex-direction:column;align-items:center;min-width:62px;}
  .step-circle{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;transition:all .3s;}
  .step-circle.done{background:linear-gradient(135deg,#10b981,#059669);color:#fff;box-shadow:0 3px 10px rgba(16,185,129,.35);}
  .step-circle.active{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;box-shadow:0 3px 12px rgba(99,102,241,.4);}
  .step-circle.idle{background:#f1f5f9;color:#9ca3af;border:1.5px solid #e5e7eb;}
  .step-label{font-size:9px;margin-top:5px;font-weight:600;text-align:center;transition:color .3s;}
  .step-label.active{color:#6366f1;}
  .step-label.done{color:#10b981;}
  .step-label.idle{color:#9ca3af;}
  .step-line{flex:1;height:2px;margin:0 -4px;margin-bottom:18px;border-radius:2px;transition:background .4s;}
  .step-line.done{background:linear-gradient(90deg,#10b981,#6366f1);}
  .step-line.idle{background:#e5e7eb;}

  /* Progress bar */
  .add-progress-track{height:4px;background:#f1f5f9;border-radius:4px;overflow:hidden;margin-top:14px;}
  .add-progress-fill{height:100%;background:linear-gradient(90deg,#6366f1,#8b5cf6,#10b981);border-radius:4px;transition:width .5s cubic-bezier(.4,0,.2,1);}

  /* Form elements */
  .add-form-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:14px;}
  .add-form-row-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:14px;}
  .add-form-row-4{display:grid;grid-template-columns:1.2fr 1fr 160px 1.4fr;gap:14px;margin-bottom:14px;}
  .add-form-row-5{display:grid;grid-template-columns:1fr 1fr 1fr 1fr 1fr;gap:9px;margin-bottom:14px;width:100%;}
  .add-form-row-allowance{display:grid;grid-template-columns:1.2fr 1fr auto auto;gap:10px;margin-bottom:10px;align-items:end;padding:12px;border:1px solid #eef2f7;border-radius:14px;background:#fbfcff;}
  .allowance-row-action{height:38px;width:38px;border:1px solid #fee2e2;border-radius:10px;background:#fff;color:#ef4444;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:all .15s;}
  .allowance-row-action:hover{background:#fef2f2;border-color:#fca5a5;}
  .add-form-row-emg{display:grid;grid-template-columns:160px 1fr 1fr;gap:14px;margin-bottom:14px;align-items:end;}
  .emg-span-2{grid-column:2 / span 2;}
  .emg-stack{display:grid;grid-template-columns:1fr;gap:14px;}
  .add-form-group{display:flex;flex-direction:column;}
  .add-label{font-size:11px;font-weight:700;color:#374151;margin-bottom:5px;letter-spacing:.02em;}
  .add-label span{color:#ef4444;}
  .add-input{height:38px;border:1.5px solid #e5e7eb;border-radius:10px;padding:0 12px;font-size:12px;color:#1e1b4b;outline:none;transition:border .15s,box-shadow .15s;background:#fafafa;font-family:inherit;}
  .add-input-sm{}
  .add-input:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.12);background:#fff;}
  .add-input:disabled{background:#f8f9fb;color:#9ca3af;cursor:not-allowed;}
  .add-input.mono{font-family:'SF Mono',Consolas,monospace;font-size:11.5px;}
  .add-input.error{border-color:#ef4444;box-shadow:0 0 0 3px rgba(239,68,68,.1);}
  .add-textarea{border:1.5px solid #e5e7eb;border-radius:10px;padding:10px 12px;font-size:12px;color:#1e1b4b;outline:none;resize:vertical;transition:border .15s,box-shadow .15s;background:#fafafa;font-family:inherit;min-height:64px;}
  .add-textarea:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.12);background:#fff;}
  .add-textarea:disabled{background:#f8f9fb;color:#9ca3af;}
  .add-select{height:38px;border:1.5px solid #e5e7eb;border-radius:10px;padding:0 12px;font-size:12px;color:#1e1b4b;outline:none;background:#fafafa;cursor:pointer;transition:border .15s,box-shadow .15s;font-family:inherit;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;}
  .add-select.error{border-color:#ef4444;box-shadow:0 0 0 3px rgba(239,68,68,.1);}
  .add-select-sm{}
  .add-select:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.12);background-color:#fff;}
  .add-err{color:#ef4444;font-size:10px;margin-top:3px;}
  .location-combo{position:relative;}
  .location-dropdown{
    position:absolute;
    top:100%;
    left:0;
    right:0;
    z-index:99;
    margin-top:4px;
    background:#fff;
    border:1px solid #e5e7eb;
    border-radius:10px;
    box-shadow:0 10px 25px rgba(30,27,75,0.12);
    max-height:200px;
    overflow-y:auto;
    display:flex;
    flex-direction:column;
    padding:4px;
  }
  .location-dropdown-option{
    width:100%;
    border:none;
    background:transparent;
    text-align:left;
    padding:8px 12px;
    font-size:12px;
    color:#374151;
    cursor:pointer;
    border-radius:6px;
    transition:all .15s;
  }
  .location-dropdown-option:hover, .location-dropdown-option.focused{
    background:#f5f3ff;
    color:#4f46e5;
  }
  .location-dropdown-add{
    border-top:1px solid #f1f5f9;
    margin-top:4px;
    padding-top:4px;
  }
  .location-dropdown-add-btn{
    width:100%;
    border:1px dashed #c7d2fe;
    background:#f5f7ff;
    color:#4f46e5;
    border-radius:8px;
    padding:8px 12px;
    font-size:12px;
    font-weight:700;
    cursor:pointer;
    text-align:left;
    transition:all .15s;
  }
  .location-dropdown-add-btn:hover, .location-dropdown-add-btn.focused{
    background:#e0e7ff;
    border-color:#6366f1;
  }
  .location-dropdown-add-btn:disabled{
    opacity:0.6;
    cursor:not-allowed;
  }
  .location-dropdown-empty{
    padding:8px 12px;
    font-size:12px;
    color:#9ca3af;
    text-align:center;
  }

  /* Step content animation */
  .step-slide-r{animation:slideR .3s ease both;}
  .step-slide-l{animation:slideL .3s ease both;}

  /* Section title inside form */
  .form-sec-head{display:flex;align-items:center;gap:7px;margin-bottom:16px;padding-bottom:10px;border-bottom:1px solid #f1f5f9;}
  .form-sec-title{font-size:13px;font-weight:700;color:#1e1b4b;}
  .form-sec-badge{padding:2px 9px;border-radius:20px;font-size:9px;font-weight:700;}

  .personal-shell{display:grid;grid-template-columns:minmax(230px,280px) 1fr;gap:18px;align-items:stretch;}
  .personal-aside{border:1px solid #e5e7eb;border-radius:16px;padding:18px;background:linear-gradient(180deg,#ffffff 0%,#f8fbff 100%);box-shadow:0 12px 28px rgba(30,27,75,.06);display:flex;flex-direction:column;gap:14px;}
  .personal-kicker{display:flex;align-items:center;justify-content:space-between;gap:10px;}
  .personal-kicker span:first-child{font-size:10px;font-weight:800;color:#6366f1;text-transform:uppercase;letter-spacing:.08em;}
  .personal-icon-badge{width:30px;height:30px;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;background:#eef2ff;color:#6366f1;}
  .personal-avatar{width:78px;height:78px;border-radius:24px;background:linear-gradient(135deg,#1e1b4b,#6366f1 58%,#14b8a6);color:#fff;display:flex;align-items:center;justify-content:center;font-size:25px;font-weight:800;box-shadow:0 14px 24px rgba(99,102,241,.28);}
  .personal-name{margin:0;font-size:18px;line-height:1.2;color:#1e1b4b;font-weight:800;word-break:break-word;}
  .personal-muted{margin:3px 0 0;font-size:11px;color:#6b7280;line-height:1.45;}
  .personal-id-pill{align-self:flex-start;display:inline-flex;align-items:center;gap:6px;padding:6px 9px;border-radius:999px;background:#ecfeff;color:#0f766e;font-size:10px;font-weight:800;border:1px solid #ccfbf1;}
  .personal-progress-card{border-radius:14px;padding:12px;background:#111827;color:#fff;}
  .personal-progress-top{display:flex;justify-content:space-between;align-items:flex-end;gap:10px;margin-bottom:9px;}
  .personal-progress-title{font-size:11px;font-weight:800;}
  .personal-progress-count{font-size:20px;font-weight:800;color:#a7f3d0;}
  .personal-meter{height:6px;background:rgba(255,255,255,.14);border-radius:999px;overflow:hidden;}
  .personal-meter span{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#14b8a6,#a7f3d0);transition:width .25s ease;}
  .personal-checklist{display:grid;gap:8px;margin-top:2px;}
  .personal-check{display:flex;align-items:center;gap:8px;font-size:11px;color:#4b5563;}
  .personal-check svg{flex:0 0 auto;}
  .personal-check.done{color:#047857;font-weight:700;}
  .personal-main{min-width:0;display:flex;flex-direction:column;gap:14px;}
  .personal-intro{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:14px 16px;border:1px solid #e0e7ff;border-radius:16px;background:linear-gradient(135deg,#f8f9ff,#ffffff 55%,#f0fdfa);}
  .personal-intro h2{margin:0;color:#1e1b4b;font-size:18px;line-height:1.2;}
  .personal-intro p{margin:5px 0 0;color:#6b7280;font-size:12px;line-height:1.5;max-width:620px;}
  .personal-step-chip{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;padding:6px 10px;border-radius:999px;background:#eef2ff;color:#4f46e5;font-size:10px;font-weight:800;}
  .personal-panels{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
  .personal-panel{border:1px solid #edf0f7;border-radius:16px;background:#fff;padding:15px;box-shadow:0 10px 24px rgba(15,23,42,.04);}
  .personal-panel-head{display:flex;align-items:center;gap:10px;margin-bottom:14px;}
  .personal-panel-icon{width:34px;height:34px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:#f5f3ff;color:#6366f1;}
  .personal-panel-title{margin:0;color:#1e1b4b;font-size:13px;font-weight:800;}
  .personal-panel-sub{margin:2px 0 0;color:#9ca3af;font-size:10.5px;line-height:1.35;}
  .personal-fields{display:grid;gap:13px;}
  .personal-field-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
  .add-hint{margin-top:5px;font-size:10px;line-height:1.35;color:#9ca3af;}
  .wizard-field-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
  .wizard-field-grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;}
  .wizard-aside-stat{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
  .wizard-stat{border:1px solid #edf0f7;border-radius:12px;padding:10px;background:#fff;}
  .wizard-stat span{display:block;font-size:9px;font-weight:800;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em;}
  .wizard-stat strong{display:block;margin-top:4px;color:#1e1b4b;font-size:12px;line-height:1.25;word-break:break-word;}
  .wizard-note{border:1px solid #dbeafe;background:#eff6ff;color:#1d4ed8;border-radius:12px;padding:10px 12px;font-size:11px;line-height:1.45;}
  .contact-card{border:1px solid #edf0f7;border-radius:16px;background:#fff;padding:15px;box-shadow:0 10px 24px rgba(15,23,42,.04);}
  .contact-card.primary{border-color:#c7d2fe;background:linear-gradient(180deg,#fff,#f8f9ff);}
  .contact-card-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:14px;}
  .contact-card-title{margin:0;color:#1e1b4b;font-size:13px;font-weight:800;}
  .contact-card-sub{margin:3px 0 0;color:#9ca3af;font-size:10.5px;line-height:1.35;}
  .address-card{border:1px solid #edf0f7;border-radius:16px;background:#fff;padding:15px;box-shadow:0 10px 24px rgba(15,23,42,.04);}

  /* Salary table */
  .sal-table{width:100%;border-collapse:collapse;border-radius:12px;overflow:hidden;border:1px solid #f1f5f9;}
  .sal-table thead tr{background:linear-gradient(135deg,#f8f9ff,#f3f4f6);}
  .sal-table th{padding:10px 14px;text-align:left;font-size:10px;font-weight:700;color:#6b7280;letter-spacing:.04em;text-transform:uppercase;}
  .sal-table td{padding:9px 14px;border-bottom:1px solid #f8f9fb;font-size:12px;color:#374151;vertical-align:middle;}
  .sal-table tbody tr:hover{background:#f5f7ff;}
  .sal-table tbody tr:last-child td{border-bottom:none;}
  .sal-total-box{background:linear-gradient(135deg,#eff6ff,#f5f3ff);border:1px solid #c7d2fe;border-radius:12px;padding:14px 18px;margin-top:12px;display:flex;justify-content:space-between;align-items:center;}
  .sal-total-label{font-size:13px;font-weight:700;color:#1e1b4b;}
  .sal-total-val{font-size:20px;font-weight:800;color:#6366f1;font-family:'SF Mono',Consolas,monospace;}
  .salary-studio{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(280px,.85fr);gap:16px;align-items:start;}
  .salary-panel,.salary-snapshot,.allowance-panel,.allowance-summary{border:1px solid #edf0f7;border-radius:16px;background:#fff;padding:16px;box-shadow:0 10px 24px rgba(15,23,42,.04);}
  .salary-panel-head,.allowance-panel-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:14px;}
  .salary-panel-title,.allowance-panel-title{margin:0;color:#1e1b4b;font-size:14px;font-weight:800;}
  .salary-panel-sub,.allowance-panel-sub{margin:4px 0 0;color:#9ca3af;font-size:10.5px;line-height:1.4;}
  .salary-snapshot{background:linear-gradient(180deg,#ffffff,#f8f9ff);position:sticky;top:14px;}
  .salary-snapshot-head{display:flex;align-items:center;gap:10px;margin-bottom:14px;}
  .salary-snapshot-icon{width:38px;height:38px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:#eef2ff;color:#6366f1;}
  .salary-snapshot-title{margin:0;color:#1e1b4b;font-size:14px;font-weight:800;}
  .salary-snapshot-sub{margin:2px 0 0;color:#9ca3af;font-size:10.5px;}
  .salary-stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
  .salary-stat{border:1px solid #edf0f7;border-radius:12px;padding:11px;background:#fff;}
  .salary-stat span{display:block;color:#9ca3af;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;}
  .salary-stat strong{display:block;margin-top:5px;color:#1e1b4b;font-size:12px;line-height:1.25;word-break:break-word;}
  .salary-stat.primary{grid-column:1 / -1;background:#111827;border-color:#111827;}
  .salary-stat.primary span{color:#c7d2fe;}
  .salary-stat.primary strong{color:#fff;font-size:20px;font-family:'SF Mono',Consolas,monospace;}
  .revision-context{margin-top:12px;border:1px solid #dbeafe;background:#eff6ff;color:#1d4ed8;border-radius:12px;padding:10px 12px;}
  .revision-context strong{display:block;font-size:11px;margin-bottom:4px;color:#1e40af;}
  .revision-context span{display:block;font-size:10.5px;line-height:1.45;}
  .allowance-workbench{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(260px,.75fr);gap:16px;align-items:start;}
  .allowance-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px;}
  .allowance-metric{border:1px solid #edf0f7;background:#fff;border-radius:12px;padding:10px;}
  .allowance-metric span{display:block;color:#9ca3af;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;}
  .allowance-metric strong{display:block;margin-top:5px;color:#1e1b4b;font-size:13px;}
  .allowance-card-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px;}
  .allowance-card-title{margin:0;color:#1e1b4b;font-size:13px;font-weight:800;}
  .allowance-status-pill{border-radius:999px;background:#f1f5f9;color:#64748b;padding:5px 9px;font-size:10px;font-weight:800;white-space:nowrap;}
  .allowance-status-pill.selected{background:#ecfdf5;color:#047857;}
  .allowance-card-body{display:grid;grid-template-columns:1.2fr 1fr auto auto;gap:10px;align-items:end;}
  .allowance-summary{background:linear-gradient(180deg,#fff,#fbfcff);position:sticky;top:14px;}
  .allowance-summary-head{display:flex;align-items:center;gap:10px;margin-bottom:14px;}
  .allowance-summary-icon{width:36px;height:36px;border-radius:13px;display:flex;align-items:center;justify-content:center;background:#f0fdf4;color:#059669;}
  .allowance-summary-title{margin:0;color:#1e1b4b;font-size:14px;font-weight:800;}
  .allowance-summary-sub{margin:2px 0 0;color:#9ca3af;font-size:10.5px;}
  .allowance-summary-row{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid #f1f5f9;padding:10px 0;font-size:12px;color:#6b7280;}
  .allowance-summary-row strong{color:#1e1b4b;font-family:'SF Mono',Consolas,monospace;}
  .allowance-tags{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px;}
  .allowance-tag{border:1px solid #dbeafe;background:#eff6ff;color:#1d4ed8;border-radius:999px;padding:5px 9px;font-size:10px;font-weight:800;}
  .allowance-empty-mini{border:1px dashed #cbd5e1;border-radius:12px;padding:12px;color:#64748b;font-size:11px;line-height:1.45;background:#f8fafc;margin-top:12px;}

  /* Account toggle */
  .acc-toggle{display:flex;gap:0;background:#f8f9fb;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;margin-bottom:18px;}
  .acc-toggle button{flex:1;padding:11px;border:none;cursor:pointer;font-weight:700;font-size:12px;transition:all .25s;}
  .acc-toggle .active{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;box-shadow:0 3px 10px rgba(99,102,241,.3);}
  .acc-toggle .idle{background:transparent;color:#6b7280;}

  /* Summary box */
  .summary-box{background:linear-gradient(135deg,#f8f9ff,#f5f3ff);border:1px solid #c7d2fe;border-radius:12px;padding:14px 16px;margin-top:16px;font-size:12px;color:#374151;line-height:1.7;}

  /* Checkbox / radio */
  .add-check-label{display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;color:#374151;}
  .add-radio-group{display:flex;gap:14px;margin-top:7px;}
  .add-radio-label{font-size:12.5px;cursor:pointer;display:flex;align-items:center;gap:4px;color:#374151;}

  /* Allowance amount helpers */
  .amount-with-prefix{display:flex;align-items:center;gap:8px;}
  .amount-prefix{height:38px;min-width:38px;display:inline-flex;align-items:center;justify-content:center;border:1.5px solid #e5e7eb;border-radius:10px;background:#f8f9fb;color:#6b7280;font-size:12px;font-weight:700;}
  .allowance-toggle{display:inline-flex;gap:6px;background:#f8f9fb;border:1px solid #e5e7eb;border-radius:10px;padding:4px;}
  .allowance-toggle button{border:none;background:transparent;padding:6px 10px;border-radius:8px;font-size:11px;font-weight:700;color:#6b7280;cursor:pointer;}
  .allowance-toggle .active{background:#111827;color:#fff;}
  .allowance-type-field{max-width:max-content;}

  /* Footer nav */
  .add-footer{display:flex;align-items:center;justify-content:space-between;margin-top:14px;padding:12px 0;}
  .add-cancel-btn{height:38px;padding:0 18px;border:1.5px solid #e5e7eb;border-radius:10px;background:#fff;font-size:12px;font-weight:600;color:#6b7280;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all .15s;}
  .add-cancel-btn:hover{border-color:#6366f1;color:#6366f1;background:#f5f3ff;}
  .add-back-btn{height:38px;padding:0 18px;border:1.5px solid #e5e7eb;border-radius:10px;background:#fff;font-size:12px;font-weight:600;color:#374151;cursor:pointer;display:flex;align-items:center;gap:5px;transition:all .15s;}
  .add-back-btn:hover{border-color:#6366f1;color:#6366f1;}
  .add-back-btn:disabled{opacity:.55;cursor:not-allowed;border-color:#e5e7eb;color:#9ca3af;background:#f9fafb;}
  .add-next-btn{height:38px;padding:0 22px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;box-shadow:0 4px 12px rgba(99,102,241,.35);transition:opacity .15s,transform .15s;}
  .add-next-btn:hover{opacity:.9;transform:translateY(-1px);}
  .add-next-btn:disabled{opacity:.55;cursor:default;transform:none;}
  .add-save-btn{height:38px;padding:0 24px;background:linear-gradient(135deg,#10b981,#059669);border:none;border-radius:10px;color:#fff;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;box-shadow:0 4px 12px rgba(16,185,129,.35);transition:opacity .15s,transform .15s;}
  .add-save-btn:hover{opacity:.9;transform:translateY(-1px);}
  .add-save-btn:disabled{opacity:.55;cursor:default;transform:none;}

  /* Readonly field */
  .add-input-readonly{background:linear-gradient(135deg,#f8f9fb,#f3f4f6)!important;color:#9ca3af!important;}

  /* Step footer info */
  .step-info{font-size:12px;color:#9ca3af;font-weight:500;}

  @media(max-width:1040px){
    .personal-shell{grid-template-columns:1fr;}
    .personal-aside{display:grid;grid-template-columns:auto 1fr;align-items:center;}
    .personal-progress-card,.personal-checklist{grid-column:1 / -1;}
  }
  @media(max-width:760px){
    .add-pg{padding:16px;}
    .personal-intro{flex-direction:column;}
    .personal-panels,.personal-field-row,.wizard-field-grid,.wizard-field-grid-3,.wizard-aside-stat,.salary-studio,.allowance-workbench,.allowance-card-body{grid-template-columns:1fr;}
    .personal-aside{display:flex;}
    .salary-snapshot,.allowance-summary{position:static;}
    .allowance-metrics{grid-template-columns:1fr;}
  }
`;

const STEPS = [
  "Personal Info",
  "Job Info",
  "Employee Contact",
  "Emergency Contacts",
  "Bank Info",
  "Medical Info",
  "Salary",
  "Allowances",
  "Account",
];

const STEP_COLORS = [
  "#6366f1",
  "#ec4899",
  "#f97316",
  "#14b8a6",
  "#10b981",
  "#a855f7",
  "#06b6d4",
  "#8b5cf6",
];

import {
  useDepartments,
  useDesignations,
  useEmploymentTypes,
  useJobStatuses,
  useWorkModes,
  useWorkLocations,
  useLocations,
  useShifts,
  useAllowanceTypes,
  useRoles,
} from "../hooks/useConfig";
import { useEmployees } from "../hooks/useEmployees";

type LocationKind = "province" | "district" | "city" | "town";

function locationName(option: any) {
  return String(option?.name || option?.location_name || option?.label || option?.value || "").trim();
}

interface LocationComboProps {
  id: string;
  label: string;
  kind: LocationKind;
  value: string;
  province?: string;
  mandatory?: boolean;
  disabled?: boolean;
  error?: string;
  options: any[];
  create: (payload: any) => Promise<any>;
  onChange: (value: string) => void;
  onCreated?: () => void;
}

function LocationCombo({
  id,
  label,
  kind,
  value,
  province,
  mandatory: isMandatory,
  disabled,
  error,
  options,
  create,
  onChange,
  onCreated,
}: LocationComboProps) {
  const { showToast } = useToastContext();
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const trimmedValue = value.trim();
  const visibleOptions = options
    .map(locationName)
    .filter(Boolean)
    .filter((name, index, list) => list.findIndex((item) => item.toLowerCase() === name.toLowerCase()) === index)
    .filter((name) => !trimmedValue || name.toLowerCase().includes(trimmedValue.toLowerCase()))
    .slice(0, 8);

  const hasExactOption = options
    .map(locationName)
    .some((name) => name.toLowerCase() === trimmedValue.toLowerCase());

  const canAdd = Boolean(
    trimmedValue &&
      !hasExactOption &&
      !disabled &&
      !isAdding &&
      (kind === "province" || province)
  );

  const addOption = async () => {
    if (!canAdd) return;

    // Special Character Validation
    if (!/^[a-zA-Z\s\-]+$/.test(trimmedValue)) {
      showToast(`${label.replace(/\s*\*$/, "")} name can only contain letters, spaces, and hyphens.`, "error");
      return;
    }

    setIsAdding(true);
    try {
      await create({
        kind,
        country: "Pakistan",
        province: kind === "province" ? null : province,
        name: trimmedValue,
        is_active: true,
      });
      onChange(trimmedValue);
      showToast(`${label.replace(/\s*\*$/, "")} "${trimmedValue}" added successfully`, "success");
      onCreated?.();
      setIsOpen(false);
    } catch (err: any) {
      console.error(err);
      const backendError = err?.response?.data?.error;
      const message = backendError?.message || err?.message || "";
      if (/exist|duplicate/i.test(message)) {
        showToast(`This ${label.toLowerCase().replace(/\s*\*$/, "")} already exists.`, "error");
      } else {
        showToast(`Failed to add ${label.toLowerCase().replace(/\s*\*$/, "")}: ${message || "unknown error"}.`, "error");
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleSelect = (name: string) => {
    onChange(name);
    setIsOpen(false);
  };

  // Reset focus index when input or open state changes
  useEffect(() => {
    setFocusedIndex(-1);
  }, [value, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === "Escape") {
      setIsOpen(false);
      e.preventDefault();
    } else if (e.key === "ArrowDown") {
      if (!isOpen) {
        setIsOpen(true);
      } else {
        const totalItems = visibleOptions.length + (canAdd ? 1 : 0);
        if (totalItems > 0) {
          setFocusedIndex((prev) => (prev + 1) % totalItems);
        }
      }
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      if (isOpen) {
        const totalItems = visibleOptions.length + (canAdd ? 1 : 0);
        if (totalItems > 0) {
          setFocusedIndex((prev) => (prev - 1 + totalItems) % totalItems);
        }
      }
      e.preventDefault();
    } else if (e.key === "Enter") {
      if (isOpen) {
        if (focusedIndex >= 0 && focusedIndex < visibleOptions.length) {
          handleSelect(visibleOptions[focusedIndex]);
          e.preventDefault();
        } else if (canAdd && (focusedIndex === visibleOptions.length || (focusedIndex === -1 && visibleOptions.length === 0))) {
          addOption();
          e.preventDefault();
        }
      }
    }
  };

  return (
    <div className="add-form-group location-combo">
      <label className="add-label" htmlFor={id}>
        {label} {isMandatory && <span>*</span>}
      </label>
      <input
        id={id}
        className={`add-input${error ? " error" : ""}`}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          if (!disabled) setIsOpen(true);
        }}
        onBlur={() => {
          // Small delay so click event on option triggers before dropdown closes
          setTimeout(() => {
            setIsOpen(false);
          }, 150);
        }}
        onKeyDown={handleKeyDown}
        disabled={disabled || isAdding}
        autoComplete="off"
        placeholder={
          kind === "province"
            ? "Select province"
            : province
            ? `Search ${label.toLowerCase()}`
            : "Select province first"
        }
      />
      {isOpen && !disabled && (
        <div
          className="location-dropdown"
          role="listbox"
          aria-label={`${label} options`}
          onMouseDown={(e) => e.preventDefault()} // Keeps input focused when clicking items
        >
          {visibleOptions.map((name, index) => (
            <button
              key={`${id}-${name}`}
              type="button"
              className={`location-dropdown-option${
                focusedIndex === index ? " focused" : ""
              }`}
              onClick={() => handleSelect(name)}
            >
              {name}
            </button>
          ))}
          {visibleOptions.length === 0 && !canAdd && (
            <div className="location-dropdown-empty">No results found</div>
          )}
          {canAdd && (
            <div className="location-dropdown-add">
              <button
                type="button"
                className={`location-dropdown-add-btn${
                  focusedIndex === visibleOptions.length ? " focused" : ""
                }`}
                onClick={addOption}
                disabled={isAdding}
              >
                {isAdding ? "Adding..." : `Add ${label.replace(/\s*\*$/, "")} ${trimmedValue}`}
              </button>
            </div>
          )}
        </div>
      )}
      {error && <div className="add-err">{error}</div>}
    </div>
  );
}

export default function AddEmployee() {
  const navigate = useNavigate();
  const { showToast } = useToastContext();
  const { data: credentialTemplateData } = useCredentialTemplate();
  const hasPermission = useAuthStore((state) => state.hasPermission);

  const { data: deptData = [] } = useDepartments();
  const { data: empTypeData = [] } = useEmploymentTypes();
  const { data: jobStatData = [] } = useJobStatuses();
  const { data: wModeData = [] } = useWorkModes();
  const { data: wLocData = [] } = useWorkLocations();
  const { data: shiftsData = [] } = useShifts();
  const { data: allowanceTypeData = [] } = useAllowanceTypes({
    enabled: hasPermission("allowances:read"),
  });
  const { data: roleData = [] } = useRoles();
  const { data: provinceOptions = [], create: createProvince } = useLocations({ kind: "province" });

  const getOptionId = (d: any) =>
    d.id ?? d.uuid ?? d.code ?? d.value ?? d.key ?? d.slug ?? d.name;
  const getOptionName = (d: any) =>
    d.name ??
    d.title ??
    d.label ??
    d.field_name ??
    d.department_name ??
    d.designation_name ??
    d.type_name ??
    d.employment_type_name ??
    d.employment_type ??
    d.status_name ??
    d.job_status_name ??
    d.job_status ??
    d.mode_name ??
    d.work_mode_name ??
    d.work_mode ??
    d.value ??
    d.type ??
    d.status ??
    d.mode ??
    d.code ??
    d.slug ??
    d.id;

  const departments = deptData.map((d: any) => ({
    id: getOptionId(d),
    name: getOptionName(d),
  }));
  const roles = roleData.map((d: any) => ({
    id: d.id ?? d.uuid,
    roleName: d.role_name ?? d.name ?? d.title ?? d.role,
    description: d.description ?? d.label,
  })).filter((role: any) => String(role.roleName || "").toLowerCase() !== "super_admin");
  const employmentTypes = empTypeData.map((d: any) => ({
    id: getOptionId(d),
    name: getOptionName(d),
  }));
  const jobStatuses = jobStatData.map((d: any) => ({
    id: getOptionId(d),
    name: getOptionName(d),
  }));
  const workModes = wModeData.map((d: any) => ({
    id: getOptionId(d),
    name: getOptionName(d),
  }));
  const workLocations = wLocData.map((d: any) => ({
    id: getOptionId(d),
    name:
      d.name ??
      d.title ??
      d.location_name ??
      d.work_location_name ??
      d.workLocation,
  }));
  const shifts = shiftsData.map((s: any) => ({
    id: getOptionId(s),
    name: getOptionName(s),
    start: s.start ?? s.start_time ?? s.startTime ?? s.start_at,
    end: s.end ?? s.end_time ?? s.endTime ?? s.end_at,
  }));
  const allowanceTypes = allowanceTypeData
    .map((a: any) => ({
      id: getOptionId(a),
      name: getOptionName(a) ?? a.field_name ?? a.allowance_type,
      isActive: a.is_active ?? a.isActive ?? a.status !== "inactive",
    }))
    .filter((a: any) => a.isActive !== false);

  const { create: addEmployee } = useEmployees();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [animating, setAnimating] = useState(false);

  // ── All logic identical to original ──────────────────────────────────────────
  const handleNumberChange = (val: string, setter: (v: string) => void) => {
    const digits = val.replace(/\D/g, "");
    if (digits.length <= 11) setter(digits);
  };
  const handleTextChange = (val: string, setter: (v: string) => void) => {
    const letters = val.replace(/[^a-zA-Z\s]/g, "");
    setter(letters);
  };
  const handleCountryCodeChange = (
    val: string,
    setter: (v: string) => void,
  ) => {
    const trimmed = val.trim();
    const digits = trimmed.replace(/[^0-9]/g, "");
    if (!digits) {
      setter("+");
      return;
    }
    setter(`+${digits}`);
  };
  const formatEmployeeId = (val: string) => {
    const raw = val.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const digits = raw.replace(/[^0-9]/g, "").slice(0, 4);
    if (!digits) return "EMP";
    return `EMP${digits}`;
  };

  const [fullName, setFullName] = useState("");
  const [employeeIdInput, setEmployeeIdInput] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [cnic, setCnic] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("male");
  const [contact1, setContact1] = useState("");
  const [contact2, setContact2] = useState("");
  const [emg1Relation, setEmg1Relation] = useState("father");
  const [emg1Name, setEmg1Name] = useState("");
  const [emg1Phone, setEmg1Phone] = useState("");
  const [emg1PhoneCode, setEmg1PhoneCode] = useState("+92");
  const [emg1Email, setEmg1Email] = useState("");
  const [emg2Relation, setEmg2Relation] = useState("");
  const [emg2Name, setEmg2Name] = useState("");
  const [emg2Phone, setEmg2Phone] = useState("");
  const [emg2PhoneCode, setEmg2PhoneCode] = useState("+92");
  const [emg2Email, setEmg2Email] = useState("");
  const [permCountry, setPermCountry] = useState("Pakistan");
  const [permProvince, setPermProvince] = useState("");
  const [permDistrict, setPermDistrict] = useState("");
  const [permCity, setPermCity] = useState("");
  const [permTown, setPermTown] = useState("");
  const [permStreet, setPermStreet] = useState("");
  const [permPostalCode, setPermPostalCode] = useState("");
  const [postCountry, setPostCountry] = useState("Pakistan");
  const [postProvince, setPostProvince] = useState("");
  const [postDistrict, setPostDistrict] = useState("");
  const [postCity, setPostCity] = useState("");
  const [postTown, setPostTown] = useState("");
  const [postStreet, setPostStreet] = useState("");
  const [postPostalCode, setPostPostalCode] = useState("");
  const [sameAddress, setSameAddress] = useState(false);
  const { data: permDistrictOptions = [], create: createPermDistrict } = useLocations({ kind: "district", province: permProvince });
  const { data: permCityOptions = [], create: createPermCity } = useLocations({ kind: "city", province: permProvince });
  const { data: permTownOptions = [], create: createPermTown } = useLocations({ kind: "town", province: permProvince });
  const { data: postDistrictOptions = [], create: createPostDistrict } = useLocations({ kind: "district", province: sameAddress ? permProvince : postProvince });
  const { data: postCityOptions = [], create: createPostCity } = useLocations({ kind: "city", province: sameAddress ? permProvince : postProvince });
  const { data: postTownOptions = [], create: createPostTown } = useLocations({ kind: "town", province: sameAddress ? permProvince : postProvince });
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankIban, setBankIban] = useState("");
  const [bankAccountTitle, setBankAccountTitle] = useState("");
  const [bankBranchName, setBankBranchName] = useState("");
  const [bankBranchCode, setBankBranchCode] = useState("");
  const [bankAccountType, setBankAccountType] = useState("");
  const [paymentMode, setPaymentMode] = useState("Online Transfer");
  const [dept, setDept] = useState("");
  const [desig, setDesig] = useState("");
  const { data: desigData = [], isLoading: designationsLoading } =
    useDesignations(dept || null);
  const [empType, setEmpType] = useState("");
  const [jobStat, setJobStat] = useState("");
  const [wMode, setWMode] = useState("");
  const [wLoc, setWLoc] = useState("");
  const [shift, setShift] = useState("");
  const [doj, setDoj] = useState("");
  const [doe, setDoe] = useState("");
  const [probationEndDate, setProbationEndDate] = useState("");
  const [contractEndDate, setContractEndDate] = useState("");
  const [salBasic, setSalBasic] = useState(0);
  const [basicSalary, setBasicSalary] = useState(0);
  const [bloodGroup, setBloodGroup] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [hasDisability, setHasDisability] = useState(false);
  const [disabilityType, setDisabilityType] = useState("");
  const [disabilityDescription, setDisabilityDescription] = useState("");
  const [hasChronicCondition, setHasChronicCondition] = useState(false);
  const [hasKnownAllergies, setHasKnownAllergies] = useState(false);
  const [allergies, setAllergies] = useState("");
  const [chronic, setChronic] = useState("");
  const [medications, setMedications] = useState("");
  const [fitnessStatus, setFitnessStatus] = useState("");
  const [lastMedicalExamDate, setLastMedicalExamDate] = useState("");
  const [nextMedicalExamDate, setNextMedicalExamDate] = useState("");
  const [accountMethod, setAccountMethod] = useState<"A" | "B">("A");
  const [username, setUsername] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [empEmail, setEmpEmail] = useState("");
  const [emailManuallyEdited, setEmailManuallyEdited] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mandatory = (label = "This field") => `${label} is mandatory.`;
  const isDobAllowed = (value: string) => {
    if (!value) return true;
    const year = Number(String(value).slice(0, 4));
    return Number.isFinite(year) && year >= 1900;
  };
  const autoGeneratedEmail = () => {
    const name = fullName.trim().toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
    const father = fatherName.trim().toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
    const emp = formatEmployeeId(employeeIdInput).toLowerCase();
    if (!name || !father || emp === "emp") return "";
    return `${name}.${father}.${emp}@esspl.com.pk`;
  };
  const handlePermanentProvinceChange = (value: string) => {
    setPermProvince(value);
    setPermDistrict("");
    setPermCity("");
    setPermTown("");
  };
  const handlePostalProvinceChange = (value: string) => {
    setPostProvince(value);
    setPostDistrict("");
    setPostCity("");
    setPostTown("");
  };
  const buildAddress = ({
    country,
    province,
    district,
    city,
    town,
    street,
    postalCode,
  }: {
    country: string;
    province: string;
    district: string;
    city: string;
    town: string;
    street: string;
    postalCode: string;
  }) =>
    [
      street && `Address: ${street}`,
      town && `Town/Area: ${town}`,
      city && `City: ${city}`,
      district && `District: ${district}`,
      province && `Province: ${province}`,
      country && `Country: ${country}`,
      postalCode && `Postal Code: ${postalCode}`,
    ]
      .filter(Boolean)
      .join(", ");
  const permanentAddress = () =>
    buildAddress({
      country: permCountry,
      province: permProvince,
      district: permDistrict,
      city: permCity,
      town: permTown,
      street: permStreet,
      postalCode: permPostalCode,
    });
  const postalAddress = () =>
    sameAddress
      ? permanentAddress()
      : buildAddress({
          country: postCountry,
          province: postProvince,
          district: postDistrict,
          city: postCity,
          town: postTown,
          street: postStreet,
          postalCode: postPostalCode,
        });
  const addressPayload = (
    country: string,
    province: string,
    district: string,
    city: string,
    town: string,
    street: string,
    postalCode: string,
  ) => ({
    country: country || "Pakistan",
    province,
    district: district || null,
    city,
    town: town || null,
    street: street || null,
    postal_code: postalCode || null,
  });
  const copyPermanentToPostal = () => {
    setPostCountry(permCountry);
    setPostProvince(permProvince);
    setPostDistrict(permDistrict);
    setPostCity(permCity);
    setPostTown(permTown);
    setPostStreet(permStreet);
    setPostPostalCode(permPostalCode);
  };
  const focusField = (field: string) => {
    const idMap: Record<string, string> = {
      empEmail: "employee-email-a",
    };
    window.setTimeout(() => {
      const target =
        document.getElementById(idMap[field] || field) ||
        document.querySelector(`[aria-label="${field}"]`);
      if (target instanceof HTMLElement) target.focus();
    }, 350);
  };
  const backendFieldMap: Record<string, { field: string; step: number; message?: string }> = {
    employee_id: { field: "employeeIdInput", step: 0 },
    cnic: { field: "cnic", step: 0 },
    date_of_birth: { field: "dob", step: 0 },
    email: {
      field: "empEmail",
      step: 8,
      message: "An account with this email already exists. You can edit it and try again.",
    },
    department_id: { field: "dept", step: 1 },
    designation_id: { field: "desig", step: 1 },
    employment_type_id: { field: "empType", step: 1 },
    job_status_id: { field: "jobStat", step: 1 },
    work_mode_id: { field: "wMode", step: 1 },
    work_location_id: { field: "wLoc", step: 1 },
    shift_id: { field: "shift", step: 1 },
    date_of_joining: { field: "doj", step: 1 },
    contact_1: { field: "contact1", step: 2 },
    primary_phone: { field: "contact1", step: 2 },
    permanent_province: { field: "permProvince", step: 2 },
    permanent_city: { field: "permCity", step: 2 },
    postal_province: { field: "postProvince", step: 2 },
    postal_city: { field: "postCity", step: 2 },
    e_contact_1_relation: { field: "emg1Relation", step: 3 },
    e_contact_1_full_name: { field: "emg1Name", step: 3 },
    e_contact_1_phone: { field: "emg1Phone", step: 3 },
    bank_name: { field: "bankName", step: 4 },
    account_title: { field: "bankAccountTitle", step: 4 },
    iban: { field: "bankIban", step: 4 },
  };

  const applyBackendFieldErrors = (details: any[]) => {
    if (!Array.isArray(details) || !details.length) return false;
    const nextErrors: Record<string, string> = {};
    let firstTarget: { field: string; step: number } | null = null;

    details.forEach((detail) => {
      const path = Array.isArray(detail?.path) ? detail.path : [];
      const rawField = String(detail?.field || path[path.length - 1] || "");
      const target = backendFieldMap[rawField];
      if (!target) return;
      if (!firstTarget) firstTarget = target;
      nextErrors[target.field] = target.message || detail.message || `${rawField.replace(/_/g, " ")} needs attention.`;
    });

    if (!Object.keys(nextErrors).length || !firstTarget) return false;
    setErrors((prev) => ({ ...prev, ...nextErrors }));
    setStep(firstTarget.step);
    focusField(firstTarget.field);
    return true;
  };

  const designations = desigData
    .map((d: any) => ({
      id: getOptionId(d),
      name: getOptionName(d),
      departmentId:
        d.department_id ??
        d.departmentId ??
        d.department?.id ??
        d.department?.department_id,
      isActive: d.is_active ?? d.isActive ?? d.status !== "inactive",
    }))
    .filter((d: any) => d.isActive !== false);
  const selectedDept = departments.find((d: any) => d.id === dept);
  const filteredDesignations = dept ? designations : [];
  const selectedDesig = filteredDesignations.find((d: any) => d.id === desig);
  const selectedShift = shifts.find((s: any) => s.id === shift);
  const shiftTiming =
    selectedShift?.start && selectedShift?.end
      ? `${selectedShift.start} – ${selectedShift.end} PKT`
      : "";
  const totalSalary = basicSalary;

  const formatCnic = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 13);
    if (digits.length <= 5) return digits;
    if (digits.length <= 12) return digits.slice(0, 5) + "-" + digits.slice(5);
    return (
      digits.slice(0, 5) + "-" + digits.slice(5, 12) + "-" + digits.slice(12)
    );
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    const currentStep = STEP_CONTENT[step];
    if (currentStep === 0) {
      if (!employeeIdInput.trim() || employeeIdInput === "EMP") {
        e.employeeIdInput = mandatory("Employee ID");
      } else if (!/^EMP\d{4}$/.test(employeeIdInput)) {
        e.employeeIdInput = "Use EMP0001 format";
      } else if (Number(employeeIdInput.slice(3)) < 1) {
        e.employeeIdInput = "Use 0001-9999";
      }
      if (!fullName.trim()) e.fullName = mandatory("Full name");
      if (!fatherName.trim()) e.fatherName = mandatory("Father name");
      else if (fatherName.trim().length < 2) e.fatherName = "Father name must be at least 2 characters.";
      if (!cnic.trim()) e.cnic = mandatory("CNIC number");
      if (!dob.trim()) e.dob = mandatory("Date of birth");
      else if (!isDobAllowed(dob)) e.dob = "Date of birth cannot be before year 1900.";
    }
    if (currentStep === 8) {
      if (!contact1.trim()) e.contact1 = mandatory("Primary phone");
      else if (contact1.trim().length < 7) e.contact1 = "Use at least 7 digits";
      if (contact2.trim() && contact2.trim().length < 7)
        e.contact2 = "Use at least 7 digits";
      if (!permProvince.trim()) e.permProvince = mandatory("Permanent province");
      if (!permCity.trim()) e.permCity = mandatory("Permanent city");
      if (!sameAddress) {
        if (!postProvince.trim()) e.postProvince = mandatory("Postal province");
        if (!postCity.trim()) e.postCity = mandatory("Postal city");
      }
    }
    if (currentStep === 1) {
      if (!emg1Relation.trim()) e.emg1Relation = mandatory("Emergency relation");
      if (!emg1Name.trim()) e.emg1Name = mandatory("Emergency contact name");
      if (!emg1Phone.trim()) e.emg1Phone = mandatory("Emergency contact phone");
      else if (emg1Phone.trim().length < 7)
        e.emg1Phone = "Use at least 7 digits";
      if (emg2Phone.trim() && emg2Phone.trim().length < 7)
        e.emg2Phone = "Use at least 7 digits";
    }
    if (currentStep === 4) {
      if (!dept) e.dept = mandatory("Department");
      if (!desig) e.desig = mandatory("Designation");
      if (!empType) e.empType = mandatory("Employment type");
      if (!jobStat) e.jobStat = mandatory("Job status");
      if (!wMode) e.wMode = mandatory("Work mode");
      if (!wLoc) e.wLoc = mandatory("Work location");
      if (!shift) e.shift = mandatory("Shift");
      if (!doj) e.doj = mandatory("Date of joining");
    }
    if (currentStep === 7) {
      const selectedAllowanceTypes = new Map<string, number>();
      allowances.forEach((row, idx) => {
        if (!row.allowance_type_id) {
          e[`allowanceType_${idx}`] = mandatory("Allowance type");
        } else if (selectedAllowanceTypes.has(row.allowance_type_id)) {
          e[`allowanceType_${idx}`] = "Allowance type already selected";
        } else {
          selectedAllowanceTypes.set(row.allowance_type_id, idx);
        }
        if (Number.isNaN(row.amount) || row.amount === null) {
          e[`allowanceAmount_${idx}`] = mandatory("Allowance amount");
        } else if (row.amount < 0) {
          e[`allowanceAmount_${idx}`] = "Must be 0 or more";
        }
      });
    }
    if (currentStep === 5) {
      if (!empEmail || !empEmail.trim()) {
        e.empEmail = mandatory("Employee email");
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(empEmail)) {
        e.empEmail = "Invalid email";
      }
    }
    if (currentStep === 2) {
      if (!bankName || !bankName.trim()) e.bankName = mandatory("Bank name");
      if (!bankAccountTitle || bankAccountTitle.trim().length < 2)
        e.bankAccountTitle = mandatory("Account title");
      if (!bankIban || !bankIban.trim()) {
        e.bankIban = mandatory("IBAN");
      } else if (bankIban.trim().length < 10) {
        e.bankIban = "IBAN must be at least 10 characters.";
      } else if (bankIban.trim().length > 34) {
        e.bankIban = "IBAN cannot exceed 34 characters.";
      }
    }
    if (currentStep === 3) {
      if (gender && !["male", "female", "other"].includes(gender)) {
        e.gender = "Invalid option";
      }
      if (heightCm && (!Number.isInteger(Number(heightCm)) || Number(heightCm) <= 0))
        e.heightCm = "Use a positive whole number";
      if (weightKg && (!Number.isInteger(Number(weightKg)) || Number(weightKg) <= 0))
        e.weightKg = "Use a positive whole number";
      if (disabilityType.length > 100)
        e.disabilityType = "Max 100 characters";
      if (fitnessStatus.length > 30) e.fitnessStatus = "Max 30 characters";
    }
    setErrors(e);
    if (Object.keys(e).length > 0) focusField(Object.keys(e)[0]);
    return Object.keys(e).length === 0;
  };

  const validateBeforeSubmit = (): boolean => {
    const e: Record<string, string> = {};
    const normalizedEmployeeId = formatEmployeeId(employeeIdInput);

    if (!normalizedEmployeeId.trim() || normalizedEmployeeId === "EMP") {
      e.employeeIdInput = mandatory("Employee ID");
    } else if (!/^EMP\d{4}$/.test(normalizedEmployeeId)) {
      e.employeeIdInput = "Use EMP0001 format";
    } else if (Number(normalizedEmployeeId.slice(3)) < 1) {
      e.employeeIdInput = "Use 0001-9999";
    }
    if (!fullName.trim()) e.fullName = mandatory("Full name");
    if (!fatherName.trim()) e.fatherName = mandatory("Father name");
    else if (fatherName.trim().length < 2) e.fatherName = "Father name must be at least 2 characters.";
    if (!cnic.trim()) e.cnic = mandatory("CNIC number");
    if (!dob.trim()) e.dob = mandatory("Date of birth");
    else if (!isDobAllowed(dob)) e.dob = "Date of birth cannot be before year 1900.";
    if (!dept) e.dept = mandatory("Department");
    if (!desig) e.desig = mandatory("Designation");
    if (!empType) e.empType = mandatory("Employment type");
    if (!jobStat) e.jobStat = mandatory("Job status");
    if (!wMode) e.wMode = mandatory("Work mode");
    if (!wLoc) e.wLoc = mandatory("Work location");
    if (!shift) e.shift = mandatory("Shift");
    if (!doj) e.doj = mandatory("Date of joining");
    if (!contact1.trim()) e.contact1 = mandatory("Primary phone");
    else if (contact1.trim().length < 7) e.contact1 = "Use at least 7 digits";
    if (contact2.trim() && contact2.trim().length < 7)
      e.contact2 = "Use at least 7 digits";
    if (!permProvince.trim()) e.permProvince = mandatory("Permanent province");
    if (!permCity.trim()) e.permCity = mandatory("Permanent city");
    if (!sameAddress) {
      if (!postProvince.trim()) e.postProvince = mandatory("Postal province");
      if (!postCity.trim()) e.postCity = mandatory("Postal city");
    }
    if (!emg1Relation.trim()) e.emg1Relation = mandatory("Emergency relation");
    if (!emg1Name.trim()) e.emg1Name = mandatory("Emergency contact name");
    if (!emg1Phone.trim()) e.emg1Phone = mandatory("Emergency contact phone");
    else if (emg1Phone.trim().length < 7)
      e.emg1Phone = "Use at least 7 digits";
    if (emg2Phone.trim() && emg2Phone.trim().length < 7)
      e.emg2Phone = "Use at least 7 digits";
    if (!empEmail || !empEmail.trim()) {
      e.empEmail = mandatory("Employee email");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(empEmail)) {
      e.empEmail = "Invalid email";
    }
    if (!bankName || !bankName.trim()) e.bankName = mandatory("Bank name");
    if (!bankAccountTitle || bankAccountTitle.trim().length < 2)
      e.bankAccountTitle = mandatory("Account title");
    if (!bankIban || !bankIban.trim()) {
      e.bankIban = mandatory("IBAN");
    } else if (bankIban.trim().length < 10) {
      e.bankIban = "IBAN must be at least 10 characters.";
    } else if (bankIban.trim().length > 34) {
      e.bankIban = "IBAN cannot exceed 34 characters.";
    }
    const selectedAllowanceTypes = new Map<string, number>();
    allowances.forEach((row, idx) => {
      if (!row.allowance_type_id) {
        e[`allowanceType_${idx}`] = mandatory("Allowance type");
      } else if (selectedAllowanceTypes.has(row.allowance_type_id)) {
        e[`allowanceType_${idx}`] = "Allowance type already selected";
      } else {
        selectedAllowanceTypes.set(row.allowance_type_id, idx);
      }
      if (Number.isNaN(row.amount) || row.amount === null)
        e[`allowanceAmount_${idx}`] = mandatory("Allowance amount");
      else if (row.amount < 0) e[`allowanceAmount_${idx}`] = "Must be 0 or more";
    });

    setErrors(e);
    if (Object.keys(e).length > 0) {
      const firstError = Object.keys(e)[0];
      const stepByField: Record<string, number> = {
        employeeIdInput: 0,
        fullName: 0,
        fatherName: 0,
        cnic: 0,
        dob: 0,
        dept: 1,
        desig: 1,
        empType: 1,
        jobStat: 1,
        wMode: 1,
        wLoc: 1,
        shift: 1,
        doj: 1,
        contact1: 2,
        contact2: 2,
        permProvince: 2,
        permCity: 2,
        postProvince: 2,
        postCity: 2,
        emg1Relation: 3,
        emg1Name: 3,
        emg1Phone: 3,
        emg2Phone: 3,
        bankName: 4,
        bankAccountTitle: 4,
        bankIban: 4,
        empEmail: 8,
      };
      const targetStep =
        stepByField[firstError] ??
        (firstError.startsWith("allowance") ? 7 : step);
      if (targetStep !== step) setStep(targetStep);
      focusField(firstError);
      showToast("Please complete the highlighted mandatory fields.", "error");
      return false;
    }

    if (employeeIdInput !== normalizedEmployeeId) {
      setEmployeeIdInput(normalizedEmployeeId);
    }
    return true;
  };

  const [allowances, setAllowances] = useState<
    { allowance_type_id: string; amount: number; is_percentage: boolean }[]
  >([]);
  const selectedAllowanceRows = allowances.filter(
    (row) => row.allowance_type_id,
  );
  const fixedAllowanceTotal = allowances.reduce(
    (sum, row) =>
      row.is_percentage
        ? sum
        : sum + (Number.isFinite(row.amount) ? row.amount : 0),
    0,
  );
  const percentageAllowanceCount = allowances.filter(
    (row) => row.is_percentage && row.amount > 0,
  ).length;
  const selectedAllowanceNames = selectedAllowanceRows.map((row) => {
    const option = allowanceTypes.find(
      (type: any) => type.id === row.allowance_type_id,
    );
    return option?.name || row.allowance_type_id;
  });
  const remainingAllowanceTypes = Math.max(
    allowanceTypes.length - selectedAllowanceRows.length,
    0,
  );
  const [empPhone, setEmpPhone] = useState("");
  const [roleId, setRoleId] = useState("");
  const [salaryEffectiveFrom, setSalaryEffectiveFrom] = useState("");
  const [currency, setCurrency] = useState("PKR");
  const [revisionType, setRevisionType] = useState<
    | "Initial"
    | "Promotion"
    | "Demotion"
    | "Increment"
    | "Decrement"
    | "Correction"
    | "Market Adjustment"
  >("Initial");
  const [revisionPercent, setRevisionPercent] = useState("");
  const [revisionReason, setRevisionReason] = useState("");
  const [createdTempPassword, setCreatedTempPassword] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (step > 0 || fullName.trim()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [step, fullName]);

  useEffect(() => {
    if (desig && !filteredDesignations.some((d: any) => d.id === desig)) {
      setDesig("");
    }
  }, [desig, filteredDesignations]);

  useEffect(() => {
    if (emailManuallyEdited) return;
    const nextEmail = autoGeneratedEmail();
    if (nextEmail) setEmpEmail(nextEmail);
  }, [fullName, fatherName, employeeIdInput, emailManuallyEdited]);

  const goNext = () => {
    if (!validate()) return;
    if (step < STEPS.length - 1) {
      setDirection("right");
      setAnimating(true);
      setTimeout(() => {
        setStep(step + 1);
        setAnimating(false);
      }, 300);
    }
  };
  const goBack = () => {
    if (step > 0) {
      setDirection("left");
      setAnimating(true);
      setTimeout(() => {
        setStep(step - 1);
        setAnimating(false);
      }, 300);
    }
  };

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pwd = "";
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setTempPassword(pwd);
  };

  const sendWhatsAppInvite = () => {
    const phone = empPhone || contact1;
    if (!phone) {
      showToast("Employee phone number is missing. Please add it in Step 3.", "error");
      return;
    }
    if (!empEmail || !tempPassword) {
      showToast("Email and Temporary Password are mandatory to send an invite.", "error");
      return;
    }
    
    // Clean phone number (remove + and spaces)
    const cleanPhone = phone.replace(/\D/g, "");
    // If it doesn't start with a country code, assume Pakistan (92)
    const finalPhone = cleanPhone.length === 10 ? `92${cleanPhone}` : cleanPhone;

    const message = renderCredentialTemplate(credentialTemplateData?.template, {
      employeeName: fullName,
      employeeId: employeeIdInput,
      email: empEmail,
      password: tempPassword,
      loginUrl: `${window.location.origin}/login`,
    });
    
    const whatsappUrl = `https://wa.me/${finalPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleSave = async () => {
    if (!validateBeforeSubmit()) return;
    const normalizedEmployeeId = formatEmployeeId(employeeIdInput).trim();
    setSaving(true);
    try {
      await addEmployee({
        employee_id: normalizedEmployeeId,
        name: fullName.trim(),
        father_name: fatherName.trim(),
        cnic,
        date_of_birth: dob,
        department_id: dept,
        designation_id: desig,
        employment_type_id: empType,
        job_status_id: jobStat,
        work_mode_id: wMode,
        work_location_id: wLoc,
        shift_id: shift,
        date_of_joining: doj,
        email: empEmail || username,
        phone: empPhone || contact1,
        role_id: roleId || null,
        personalInfo: {
          employee_id: normalizedEmployeeId,
          name: fullName.trim(),
          father_name: fatherName.trim(),
          cnic,
          date_of_birth: dob,
        },
        jobInfo: {
          department_id: dept,
          designation_id: desig,
          employment_type_id: empType,
          job_status_id: jobStat,
          work_mode_id: wMode,
          work_location_id: wLoc,
          shift_id: shift,
          date_of_joining: doj,
          date_of_exit: doe || null,
          probation_end_date: probationEndDate || null,
          contract_end_date: contractEndDate || null,
        },
        accountInfo: {
          email: empEmail || username,
          phone: empPhone || contact1,
          role_id: roleId || null,
          account_method: accountMethod,
          username:
            accountMethod === "A"
              ? username || fullName.toLowerCase().replace(/\s+/g, ".")
              : undefined,
          temp_password:
            accountMethod === "A" ? tempPassword || undefined : undefined,
        },
        employeeContact: {
          primary_phone: contact1,
          alternate_phone: contact2 || null,
          same_as_permanent: sameAddress,
          permanent_address: addressPayload(
            permCountry,
            permProvince,
            permDistrict,
            permCity,
            permTown,
            permStreet,
            permPostalCode,
          ),
          postal_address: sameAddress
            ? null
            : addressPayload(
                postCountry,
                postProvince,
                postDistrict,
                postCity,
                postTown,
                postStreet,
                postPostalCode,
              ),
        },
        emergencyContacts: {
          e_contact_1_relation: emg1Relation,
          e_contact_1_full_name: emg1Name,
          e_contact_1_phone: emg1Phone,
          e_contact_1_phone_country_code: "+92",
          e_contact_1_email: emg1Email || null,
          e_contact_2_relation: emg2Relation || null,
          e_contact_2_full_name: emg2Name || null,
          e_contact_2_phone: emg2Phone || null,
          e_contact_2_phone_country_code: "+92",
          e_contact_2_email: emg2Email || null,
          primary_contact: 1,
        },
        bankInfo: {
          bank_name: bankName,
          branch_name: bankBranchName || null,
          branch_code: bankBranchCode || null,
          iban: bankIban,
          account_title: bankAccountTitle,
          account_number: bankAccount || null,
          account_type: bankAccountType || null,
        },
        medicalInfo: {
          blood_group: bloodGroup || null,
          date_of_birth: dob || null,
          gender,
          height_cm: heightCm ? Number(heightCm) : null,
          weight_kg: weightKg ? Number(weightKg) : null,
          has_disability: hasDisability,
          disability_type: disabilityType || null,
          disability_description: disabilityDescription || null,
          has_chronic_condition: hasChronicCondition,
          chronic_condition_notes: chronic || null,
          has_known_allergies: hasKnownAllergies,
          allergy_notes: allergies || null,
          emergency_medication: medications || null,
          fitness_status: fitnessStatus || null,
          last_medical_exam_date: lastMedicalExamDate || null,
          next_medical_exam_date: nextMedicalExamDate || null,
        },
        salaryInfo: {
          base_salary: basicSalary,
          currency,
          effective_from: salaryEffectiveFrom || doj,
          revision_type: revisionType,
          revision_percent:
            revisionPercent.trim() === "" ? null : Number(revisionPercent),
          revision_reason: revisionReason || null,
        },
        allowances: allowances.length ? allowances : undefined,
      });
      showToast("Employee saved successfully");
      navigate("/employees");
    } catch (e: any) {
      const error = e?.response?.data?.error;
      const code = error?.code;
      const message = error?.message || e?.message || "";
      const mappedBackendError = applyBackendFieldErrors(error?.details || []);
      if (code === "DUPLICATE_EMPLOYEE_ID" || /employee.*id.*exist/i.test(message)) {
        setStep(0);
        setErrors((prev) => ({ ...prev, employeeIdInput: "Employee ID already exists." }));
        focusField("employeeIdInput");
        showToast("Employee ID already exists.", "error");
      } else if (code === "DUPLICATE_CNIC" || /cnic.*exist/i.test(message)) {
        setStep(0);
        setErrors((prev) => ({ ...prev, cnic: "CNIC number already exists." }));
        focusField("cnic");
        showToast("CNIC number already exists.", "error");
      } else if (code === "DUPLICATE_EMAIL" || /email.*exist/i.test(message)) {
        setStep(8);
        setErrors((prev) => ({ ...prev, empEmail: "An account with this email already exists. You can edit it and try again." }));
        focusField("empEmail");
        showToast("An account with this email already exists.", "error");
      } else if (mappedBackendError) {
        showToast("Please review the highlighted fields and try again.", "error");
      } else if (/too short|min/i.test(message)) {
        showToast("One of the fields is too short. Please review the highlighted form fields.", "error");
      } else if (/too long|max|character/i.test(message)) {
        showToast("One of the fields is too long. Please shorten the highlighted information and try again.", "error");
      } else {
        showToast("Failed to save employee. Please review the form and try again.", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Step colors for section badge ──
  const stepColor = STEP_COLORS[step];

  const STEP_CONTENT = [0, 4, 8, 1, 2, 3, 6, 7, 5] as const;

  const employeeInitials =
    fullName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "NE";
  const hasValidEmployeeId =
    /^EMP\d{4}$/.test(employeeIdInput) && Number(employeeIdInput.slice(3)) > 0;
  const personalChecklist = [
    { label: "Employee ID", done: hasValidEmployeeId },
    { label: "Full name", done: Boolean(fullName.trim()) },
    { label: "Father name", done: Boolean(fatherName.trim()) },
    { label: "CNIC", done: cnic.replace(/\D/g, "").length === 13 },
    { label: "Date of birth", done: Boolean(dob.trim()) },
  ];
  const personalReadyCount = personalChecklist.filter((item) => item.done).length;
  const personalReadyPercent = Math.round(
    (personalReadyCount / personalChecklist.length) * 100,
  );
  const jobChecklist = [
    { label: "Department", done: Boolean(dept) },
    { label: "Designation", done: Boolean(desig) },
    { label: "Location", done: Boolean(wLoc) },
    { label: "Shift", done: Boolean(shift) },
    { label: "Joining date", done: Boolean(doj) },
  ];
  const jobReadyCount = jobChecklist.filter((item) => item.done).length;
  const jobReadyPercent = Math.round((jobReadyCount / jobChecklist.length) * 100);
  const employeeContactChecklist = [
    { label: "Primary phone", done: Boolean(contact1.trim()) },
    { label: "Permanent city", done: Boolean(permCity.trim()) },
    { label: "Permanent province", done: Boolean(permProvince.trim()) },
    { label: "Postal route", done: sameAddress || Boolean(postCity.trim()) },
  ];
  const employeeContactReadyCount = employeeContactChecklist.filter((item) => item.done).length;
  const employeeContactReadyPercent = Math.round(
    (employeeContactReadyCount / employeeContactChecklist.length) * 100,
  );
  const contactChecklist = [
    { label: "Emergency relation", done: Boolean(emg1Relation.trim()) },
    { label: "Emergency name", done: Boolean(emg1Name.trim()) },
    { label: "Emergency phone", done: Boolean(emg1Phone.trim()) },
  ];
  const contactReadyCount = contactChecklist.filter((item) => item.done).length;
  const contactReadyPercent = Math.round(
    (contactReadyCount / contactChecklist.length) * 100,
  );
  const relationOptions = [
    "father",
    "mother",
    "brother",
    "sister",
    "wife",
    "husband",
    "son",
    "daughter",
    "friend",
    "neighbor",
    "other",
  ];

  const renderStep = () => {
    switch (STEP_CONTENT[step]) {
      case 0:
        return (
          <div
            className={direction === "right" ? "step-slide-r" : "step-slide-l"}
          >
            <div className="personal-shell">
              <aside className="personal-aside" aria-label="Identity snapshot">
                <div className="personal-kicker">
                  <span>Identity snapshot</span>
                  <span className="personal-icon-badge">
                    <UserRound size={16} />
                  </span>
                </div>
                <div className="personal-avatar">{employeeInitials}</div>
                <div>
                  <h2 className="personal-name">
                    {fullName.trim() || "New employee"}
                  </h2>
                  <p className="personal-muted">
                    {fatherName.trim()
                      ? `Father name: ${fatherName.trim()}`
                      : "Capture clean identity details before job setup."}
                  </p>
                </div>
                <span className="personal-id-pill">
                  <BadgeCheck size={13} />
                  {hasValidEmployeeId ? employeeIdInput : "ID pending"}
                </span>

                <div className="personal-progress-card">
                  <div className="personal-progress-top">
                    <span className="personal-progress-title">
                      Profile readiness
                    </span>
                    <span className="personal-progress-count">
                      {personalReadyCount}/{personalChecklist.length}
                    </span>
                  </div>
                  <div className="personal-meter" aria-hidden="true">
                    <span style={{ width: `${personalReadyPercent}%` }} />
                  </div>
                </div>

                <div className="personal-checklist">
                  {personalChecklist.map((item) => (
                    <div
                      key={item.label}
                      className={`personal-check${item.done ? " done" : ""}`}
                    >
                      <Check size={14} />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </aside>

              <section className="personal-main">
                <div className="personal-intro">
                  <div>
                    <h2>Personal Info</h2>
                    <p>
                      Start with the verified identity fields used across HR,
                      payroll, attendance, and account creation.
                    </p>
                  </div>
                  <span className="personal-step-chip">
                    <ShieldCheck size={13} />
                    Step 1 of 9
                  </span>
                </div>

                <div className="personal-panels">
                  <div className="personal-panel">
                    <div className="personal-panel-head">
                      <span className="personal-panel-icon">
                        <IdCard size={17} />
                      </span>
                      <div>
                        <h3 className="personal-panel-title">Core identity</h3>
                        <p className="personal-panel-sub">
                          Names and employee code used in records.
                        </p>
                      </div>
                    </div>
                    <div className="personal-fields">
                      <div className="add-form-group">
                        <label className="add-label" htmlFor="employee-id">
                          Employee ID <span>*</span>
                        </label>
                        <input
                          id="employee-id"
                          className={`add-input mono${errors.employeeIdInput ? " error" : ""}`}
                          placeholder="EMP0001"
                          value={employeeIdInput}
                          onChange={(e) =>
                            setEmployeeIdInput(formatEmployeeId(e.target.value))
                          }
                        />
                        <div className="add-hint">
                          Type numbers or the full code. It will normalize to
                          EMP0001 format.
                        </div>
                        {errors.employeeIdInput && (
                          <div className="add-err">
                            {errors.employeeIdInput}
                          </div>
                        )}
                      </div>
                      <div className="add-form-group">
                        <label className="add-label" htmlFor="full-name">
                          Full Name <span>*</span>
                        </label>
                        <input
                          id="full-name"
                          className={`add-input${errors.fullName ? " error" : ""}`}
                          placeholder="Enter full legal name"
                          value={fullName}
                          onChange={(e) =>
                            handleTextChange(e.target.value, setFullName)
                          }
                        />
                        {errors.fullName && (
                          <div className="add-err">{errors.fullName}</div>
                        )}
                      </div>
                      <div className="add-form-group">
                        <label className="add-label" htmlFor="father-name">
                          Father Name <span>*</span>
                        </label>
                        <input
                          id="father-name"
                          className={`add-input${errors.fatherName ? " error" : ""}`}
                          placeholder="Enter father name"
                          value={fatherName}
                          onChange={(e) =>
                            handleTextChange(e.target.value, setFatherName)
                          }
                        />
                        {errors.fatherName && (
                          <div className="add-err">{errors.fatherName}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="personal-panel">
                    <div className="personal-panel-head">
                      <span className="personal-panel-icon">
                        <Fingerprint size={17} />
                      </span>
                      <div>
                        <h3 className="personal-panel-title">
                          Legal verification
                        </h3>
                        <p className="personal-panel-sub">
                          Government identity and demographic basics.
                        </p>
                      </div>
                    </div>
                    <div className="personal-fields">
                      <div className="add-form-group">
                        <label className="add-label" htmlFor="cnic">
                          CNIC <span>*</span>
                        </label>
                        <input
                          id="cnic"
                          className={`add-input mono${errors.cnic ? " error" : ""}`}
                          placeholder="00000-0000000-0"
                          value={cnic}
                          onChange={(e) => setCnic(formatCnic(e.target.value))}
                        />
                        <div className="add-hint">
                          Enter 13 digits. Separators are added automatically.
                        </div>
                        {errors.cnic && (
                          <div className="add-err">{errors.cnic}</div>
                        )}
                      </div>
                      <div className="personal-field-row">
                        <div className="add-form-group">
                          <label className="add-label" htmlFor="date-of-birth">
                            Date of Birth <span>*</span>
                          </label>
                          <input
                            id="date-of-birth"
                            className={`add-input${errors.dob ? " error" : ""}`}
                            type="date"
                            value={dob}
                            onChange={(e) => setDob(e.target.value)}
                          />
                          {errors.dob && (
                            <div className="add-err">{errors.dob}</div>
                          )}
                        </div>
                        <div className="add-form-group">
                          <label className="add-label" htmlFor="gender">
                            Gender
                          </label>
                          <select
                            id="gender"
                            className="add-select"
                            value={gender}
                            onChange={(e) => setGender(e.target.value)}
                          >
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>
                      <div className="personal-id-pill">
                        <CalendarDays size={13} />
                        {dob ? "Birth date captured" : "Birth date mandatory"}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        );

      case 8:
        return (
          <div
            className={direction === "right" ? "step-slide-r" : "step-slide-l"}
          >
            <div className="personal-shell">
              <aside className="personal-aside" aria-label="Employee contact summary">
                <div className="personal-kicker">
                  <span>Employee contact</span>
                  <span className="personal-icon-badge">
                    <Phone size={16} />
                  </span>
                </div>
                <div className="personal-avatar">
                  <MapPin size={30} />
                </div>
                <div>
                  <h2 className="personal-name">
                    {contact1.trim() || "Primary phone pending"}
                  </h2>
                  <p className="personal-muted">
                    {permCity || permProvince
                      ? [permCity, permProvince, permCountry].filter(Boolean).join(", ")
                      : "Add employee phone numbers and standardized Pakistan address details."}
                  </p>
                </div>
                <span className="personal-id-pill">
                  <Phone size={13} />
                  {contact2 ? "Primary and alternate captured" : "Primary phone required"}
                </span>
                <div className="personal-progress-card">
                  <div className="personal-progress-top">
                    <span className="personal-progress-title">
                      Contact readiness
                    </span>
                    <span className="personal-progress-count">
                      {employeeContactReadyCount}/{employeeContactChecklist.length}
                    </span>
                  </div>
                  <div className="personal-meter" aria-hidden="true">
                    <span style={{ width: `${employeeContactReadyPercent}%` }} />
                  </div>
                </div>
                <div className="personal-checklist">
                  {employeeContactChecklist.map((item) => (
                    <div
                      key={item.label}
                      className={`personal-check${item.done ? " done" : ""}`}
                    >
                      <Check size={14} />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </aside>

              <section className="personal-main">
                <div className="personal-intro">
                  <div>
                    <h2>Employee Contact</h2>
                    <p>
                      Keep the employee's own phone numbers and Pakistan address
                      separate from emergency contacts.
                    </p>
                  </div>
                  <span className="personal-step-chip">
                    <MapPin size={13} />
                    Step 3 of 9
                  </span>
                </div>

                <div className="contact-card primary">
                  <div className="contact-card-head">
                    <div>
                      <h3 className="contact-card-title">Phone numbers</h3>
                      <p className="contact-card-sub">
                        These are the employee's personal contact numbers, not emergency contacts.
                      </p>
                    </div>
                    <span className="personal-id-pill">Employee</span>
                  </div>
                  <div className="wizard-field-grid">
                    <div className="add-form-group">
                      <label className="add-label" htmlFor="primary-phone">
                        Primary Phone <span>*</span>
                      </label>
                      <input
                        id="primary-phone"
                        className={`add-input${errors.contact1 ? " error" : ""}`}
                        value={contact1}
                        onChange={(e) =>
                          handleNumberChange(e.target.value, setContact1)
                        }
                      />
                      {errors.contact1 && (
                        <div className="add-err">{errors.contact1}</div>
                      )}
                    </div>
                    <div className="add-form-group">
                      <label className="add-label" htmlFor="alternate-phone">
                        Alternate Phone
                      </label>
                      <input
                        id="alternate-phone"
                        className={`add-input${errors.contact2 ? " error" : ""}`}
                        value={contact2}
                        onChange={(e) =>
                          handleNumberChange(e.target.value, setContact2)
                        }
                      />
                      {errors.contact2 && (
                        <div className="add-err">{errors.contact2}</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="address-card">
                  <div className="personal-panel-head">
                    <span className="personal-panel-icon">
                      <Home size={17} />
                    </span>
                    <div>
                      <h3 className="personal-panel-title">
                        Permanent Address
                      </h3>
                      <p className="personal-panel-sub">
                        Pakistan-standard address fields for HR records.
                      </p>
                    </div>
                  </div>
                  <div className="personal-fields">
                    <div className="wizard-field-grid-3">
                      <div className="add-form-group">
                        <label className="add-label" htmlFor="perm-country">Country</label>
                        <input id="perm-country" className="add-input" value={permCountry} onChange={() => setPermCountry("Pakistan")} disabled />
                      </div>
                      <LocationCombo
                        id="perm-province"
                        label="Province / Region"
                        kind="province"
                        value={permProvince}
                        options={provinceOptions}
                        create={createProvince}
                        onChange={handlePermanentProvinceChange}
                        mandatory
                        error={errors.permProvince}
                      />
                      <LocationCombo
                        id="perm-district"
                        label="District"
                        kind="district"
                        value={permDistrict}
                        province={permProvince}
                        options={permProvince ? permDistrictOptions : []}
                        create={createPermDistrict}
                        onChange={setPermDistrict}
                        disabled={!permProvince}
                      />
                    </div>
                    <div className="wizard-field-grid-3">
                      <LocationCombo
                        id="perm-city"
                        label="City"
                        kind="city"
                        value={permCity}
                        province={permProvince}
                        options={permProvince ? permCityOptions : []}
                        create={createPermCity}
                        onChange={setPermCity}
                        mandatory
                        disabled={!permProvince}
                        error={errors.permCity}
                      />
                      <LocationCombo
                        id="perm-town"
                        label="Town / Area"
                        kind="town"
                        value={permTown}
                        province={permProvince}
                        options={permProvince ? permTownOptions : []}
                        create={createPermTown}
                        onChange={setPermTown}
                        disabled={!permProvince}
                      />
                      <div className="add-form-group">
                        <label className="add-label" htmlFor="perm-postal-code">Postal Code</label>
                        <input id="perm-postal-code" className="add-input" value={permPostalCode} onChange={(e) => handleNumberChange(e.target.value, setPermPostalCode)} />
                      </div>
                    </div>
                    <div className="add-form-group">
                      <label className="add-label" htmlFor="perm-street">House / Street / Landmark</label>
                      <input id="perm-street" className="add-input" value={permStreet} onChange={(e) => setPermStreet(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="address-card">
                  <div className="personal-panel-head">
                    <span className="personal-panel-icon">
                      <Mail size={17} />
                    </span>
                    <div>
                      <h3 className="personal-panel-title">Postal Address</h3>
                      <p className="personal-panel-sub">
                        Use a different mailing address only when needed.
                      </p>
                    </div>
                  </div>
                  <label className="add-check-label" style={{ marginBottom: 12 }}>
                    <input
                      type="checkbox"
                      checked={sameAddress}
                      onChange={(e) => {
                        setSameAddress(e.target.checked);
                        if (e.target.checked) copyPermanentToPostal();
                      }}
                    />
                    Same as permanent address
                  </label>
                  <div className="personal-fields">
                    <div className="wizard-field-grid-3">
                      <div className="add-form-group">
                        <label className="add-label" htmlFor="post-country">Country</label>
                        <input id="post-country" className="add-input" value={sameAddress ? permCountry : postCountry} onChange={() => setPostCountry("Pakistan")} disabled />
                      </div>
                      <LocationCombo
                        id="post-province"
                        label="Province / Region"
                        kind="province"
                        value={sameAddress ? permProvince : postProvince}
                        options={provinceOptions}
                        create={createProvince}
                        onChange={handlePostalProvinceChange}
                        mandatory
                        disabled={sameAddress}
                        error={!sameAddress ? errors.postProvince : undefined}
                      />
                      <LocationCombo
                        id="post-district"
                        label="District"
                        kind="district"
                        value={sameAddress ? permDistrict : postDistrict}
                        province={sameAddress ? permProvince : postProvince}
                        options={!sameAddress && postProvince ? postDistrictOptions : []}
                        create={createPostDistrict}
                        onChange={setPostDistrict}
                        disabled={sameAddress || !postProvince}
                      />
                    </div>
                    <div className="wizard-field-grid-3">
                      <LocationCombo
                        id="post-city"
                        label="City"
                        kind="city"
                        value={sameAddress ? permCity : postCity}
                        province={sameAddress ? permProvince : postProvince}
                        options={!sameAddress && postProvince ? postCityOptions : []}
                        create={createPostCity}
                        onChange={setPostCity}
                        mandatory
                        disabled={sameAddress || !postProvince}
                        error={!sameAddress ? errors.postCity : undefined}
                      />
                      <LocationCombo
                        id="post-town"
                        label="Town / Area"
                        kind="town"
                        value={sameAddress ? permTown : postTown}
                        province={sameAddress ? permProvince : postProvince}
                        options={!sameAddress && postProvince ? postTownOptions : []}
                        create={createPostTown}
                        onChange={setPostTown}
                        disabled={sameAddress || !postProvince}
                      />
                      <div className="add-form-group">
                        <label className="add-label" htmlFor="post-postal-code">Postal Code</label>
                        <input id="post-postal-code" className="add-input" value={sameAddress ? permPostalCode : postPostalCode} onChange={(e) => handleNumberChange(e.target.value, setPostPostalCode)} disabled={sameAddress} />
                      </div>
                    </div>
                    <div className="add-form-group">
                      <label className="add-label" htmlFor="post-street">House / Street / Landmark</label>
                      <input id="post-street" className="add-input" value={sameAddress ? permStreet : postStreet} onChange={(e) => setPostStreet(e.target.value)} disabled={sameAddress} />
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        );

      case 1:
        return (
          <div
            className={direction === "right" ? "step-slide-r" : "step-slide-l"}
          >
            <div className="personal-shell">
              <aside className="personal-aside" aria-label="Emergency contact summary">
                <div className="personal-kicker">
                  <span>Emergency contacts</span>
                  <span className="personal-icon-badge">
                    <Phone size={16} />
                  </span>
                </div>
                <div className="personal-avatar">
                  <Users size={30} />
                </div>
                <div>
                  <h2 className="personal-name">
                    {emg1Name.trim() || "Primary contact pending"}
                  </h2>
                  <p className="personal-muted">
                    {emg1Relation
                      ? `${emg1Relation} contact${emg1Phone ? ` at +92 ${emg1Phone}` : ""}`
                      : "Add the first reliable person to call in an emergency."}
                  </p>
                </div>
                <span className="personal-id-pill">
                  <Phone size={13} />
                  {emg1Phone ? `Emergency phone +92 ${emg1Phone}` : "Emergency phone pending"}
                </span>
                <div className="personal-progress-card">
                  <div className="personal-progress-top">
                    <span className="personal-progress-title">
                      Emergency readiness
                    </span>
                    <span className="personal-progress-count">
                      {contactReadyCount}/{contactChecklist.length}
                    </span>
                  </div>
                  <div className="personal-meter" aria-hidden="true">
                    <span style={{ width: `${contactReadyPercent}%` }} />
                  </div>
                </div>
                <div className="personal-checklist">
                  {contactChecklist.map((item) => (
                    <div
                      key={item.label}
                      className={`personal-check${item.done ? " done" : ""}`}
                    >
                      <Check size={14} />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </aside>

              <section className="personal-main">
                <div className="personal-intro">
                  <div>
                    <h2>Emergency Contacts</h2>
                    <p>
                      Capture reliable emergency contacts so HR can respond
                      quickly when it matters.
                    </p>
                  </div>
                  <span className="personal-step-chip">
                    <ShieldCheck size={13} />
                    Step 4 of 9
                  </span>
                </div>

                <div className="wizard-field-grid">
                  <div className="contact-card primary">
                    <div className="contact-card-head">
                      <div>
                        <h3 className="contact-card-title">
                          Primary emergency contact
                        </h3>
                        <p className="contact-card-sub">
                          Mandatory contact used first during urgent situations.
                        </p>
                      </div>
                      <span className="personal-id-pill">Primary</span>
                    </div>
                    <div className="personal-fields">
                      <div className="wizard-field-grid">
                        <div className="add-form-group">
                          <label className="add-label" htmlFor="emergency-1-relation">
                            Relation <span>*</span>
                          </label>
                          <select
                            id="emergency-1-relation"
                            className={`add-select${errors.emg1Relation ? " error" : ""}`}
                            value={emg1Relation}
                            onChange={(e) => setEmg1Relation(e.target.value)}
                          >
                            {relationOptions.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                          {errors.emg1Relation && (
                            <div className="add-err">{errors.emg1Relation}</div>
                          )}
                        </div>
                        <div className="add-form-group">
                          <label className="add-label" htmlFor="emergency-1-name">
                            Contact Name <span>*</span>
                          </label>
                          <input
                            id="emergency-1-name"
                            className={`add-input${errors.emg1Name ? " error" : ""}`}
                            value={emg1Name}
                            onChange={(e) =>
                              handleTextChange(e.target.value, setEmg1Name)
                            }
                          />
                          {errors.emg1Name && (
                            <div className="add-err">{errors.emg1Name}</div>
                          )}
                        </div>
                      </div>
                      <div className="wizard-field-grid">
                        <div className="add-form-group">
                          <label className="add-label" htmlFor="emergency-1-phone">
                            Contact Phone <span>*</span>
                          </label>
                          <input
                            id="emergency-1-phone"
                            className={`add-input${errors.emg1Phone ? " error" : ""}`}
                            value={emg1Phone}
                            onChange={(e) =>
                              handleNumberChange(e.target.value, setEmg1Phone)
                            }
                          />
                          {errors.emg1Phone && (
                            <div className="add-err">{errors.emg1Phone}</div>
                          )}
                        </div>
                        <div className="add-form-group">
                          <label className="add-label" htmlFor="emergency-1-code">
                            Country Code
                          </label>
                          <input
                            id="emergency-1-code"
                            className="add-input add-input-sm add-input-readonly"
                            value="+92"
                            disabled
                            readOnly
                          />
                          <div className="add-hint">Locked for Pakistan numbers.</div>
                        </div>
                      </div>
                      <div className="add-form-group">
                        <label className="add-label" htmlFor="emergency-1-email">
                          Email
                        </label>
                        <input
                          id="emergency-1-email"
                          className="add-input"
                          type="email"
                          value={emg1Email}
                          onChange={(e) => setEmg1Email(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="contact-card">
                    <div className="contact-card-head">
                      <div>
                        <h3 className="contact-card-title">Backup contact</h3>
                        <p className="contact-card-sub">
                          Optional second contact when the primary is not reachable.
                        </p>
                      </div>
                      <span className="personal-id-pill">Optional</span>
                    </div>
                    <div className="personal-fields">
                      <div className="wizard-field-grid">
                        <div className="add-form-group">
                          <label className="add-label" htmlFor="emergency-2-relation">
                            Relation
                          </label>
                          <select
                            id="emergency-2-relation"
                            className="add-select"
                            value={emg2Relation}
                            onChange={(e) => setEmg2Relation(e.target.value)}
                          >
                            <option value="">Select</option>
                            {relationOptions.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="add-form-group">
                          <label className="add-label" htmlFor="emergency-2-name">
                            Contact Name
                          </label>
                          <input
                            id="emergency-2-name"
                            className="add-input"
                            value={emg2Name}
                            onChange={(e) =>
                              handleTextChange(e.target.value, setEmg2Name)
                            }
                          />
                        </div>
                      </div>
                      <div className="wizard-field-grid">
                        <div className="add-form-group">
                          <label className="add-label" htmlFor="emergency-2-phone">
                            Contact Phone
                          </label>
                          <input
                            id="emergency-2-phone"
                            className={`add-input${errors.emg2Phone ? " error" : ""}`}
                            value={emg2Phone}
                            onChange={(e) =>
                              handleNumberChange(e.target.value, setEmg2Phone)
                            }
                          />
                          {errors.emg2Phone && (
                            <div className="add-err">{errors.emg2Phone}</div>
                          )}
                        </div>
                        <div className="add-form-group">
                          <label className="add-label" htmlFor="emergency-2-code">
                            Country Code
                          </label>
                          <input
                            id="emergency-2-code"
                            className="add-input add-input-sm add-input-readonly"
                            value="+92"
                            disabled
                            readOnly
                          />
                          <div className="add-hint">Locked for Pakistan numbers.</div>
                        </div>
                      </div>
                      <div className="add-form-group">
                        <label className="add-label" htmlFor="emergency-2-email">
                          Email
                        </label>
                        <input
                          id="emergency-2-email"
                          className="add-input"
                          type="email"
                          value={emg2Email}
                          onChange={(e) => setEmg2Email(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        );

      case 2:
        return (
          <div
            className={direction === "right" ? "step-slide-r" : "step-slide-l"}
          >
            <div className="personal-intro" style={{ marginBottom: 16 }}>
              <div>
                <h2>Bank account profile</h2>
                <p>
                  Capture mandatory payroll banking fields and nullable branch
                  details exactly as the backend expects.
                </p>
              </div>
              <span className="personal-step-chip">
                <Landmark size={13} />
                Step 5 of 9
              </span>
            </div>
            <div className="add-form-row-3">
              <div className="add-form-group">
                <label className="add-label" htmlFor="bank-name">
                  Bank Name <span>*</span>
                </label>
                <input
                  id="bank-name"
                  className={`add-input${errors.bankName ? " error" : ""}`}
                  placeholder="e.g. HBL, Alfalah"
                  value={bankName}
                  onChange={(e) =>
                    handleTextChange(e.target.value, setBankName)
                  }
                />
                {errors.bankName && (
                  <div className="add-err">{errors.bankName}</div>
                )}
              </div>
              <div className="add-form-group">
                <label className="add-label" htmlFor="account-title">
                  Account Title <span>*</span>
                </label>
                <input
                  id="account-title"
                  className={`add-input${errors.bankAccountTitle ? " error" : ""}`}
                  placeholder="e.g. John Doe"
                  value={bankAccountTitle}
                  onChange={(e) => setBankAccountTitle(e.target.value)}
                />
                {errors.bankAccountTitle && (
                  <div className="add-err">{errors.bankAccountTitle}</div>
                )}
              </div>
              <div className="add-form-group">
                <label className="add-label" htmlFor="iban">
                  IBAN <span>*</span>
                </label>
                <input
                  id="iban"
                  className={`add-input mono${errors.bankIban ? " error" : ""}`}
                  placeholder="PK00XXXX0000..."
                  value={bankIban}
                  onChange={(e) => {
                    setBankIban(e.target.value.slice(0, 34));
                  }}
                />
                {errors.bankIban && (
                  <div className="add-err">{errors.bankIban}</div>
                )}
              </div>
            </div>
            <div className="add-form-row-3">
              <div className="add-form-group">
                <label className="add-label" htmlFor="branch-name">
                  Branch Name
                </label>
                <input
                  id="branch-name"
                  className="add-input"
                  value={bankBranchName}
                  onChange={(e) => setBankBranchName(e.target.value)}
                />
              </div>
              <div className="add-form-group">
                <label className="add-label" htmlFor="branch-code">
                  Branch Code
                </label>
                <input
                  id="branch-code"
                  className="add-input"
                  value={bankBranchCode}
                  onChange={(e) => setBankBranchCode(e.target.value)}
                />
              </div>
              <div className="add-form-group">
                <label className="add-label" htmlFor="account-type">
                  Account Type
                </label>
                <select
                  id="account-type"
                  className={`add-select`}
                  value={bankAccountType}
                  onChange={(e) => setBankAccountType(e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="current">Current</option>
                  <option value="savings">Savings</option>
                  <option value="salary">Salary</option>
                </select>
              </div>
            </div>
            <div className="add-form-row">
              <div className="add-form-group">
                <label className="add-label" htmlFor="account-number">
                  Account Number
                </label>
                <input
                  id="account-number"
                  className="add-input mono"
                  placeholder="Numbers only"
                  value={bankAccount}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    setBankAccount(digits.slice(0, 30));
                  }}
                />
              </div>
            </div>
            <div className="add-form-group">
              <label className="add-label" htmlFor="payment-mode">
                Payment Mode
              </label>
              <select
                id="payment-mode"
                className="add-select"
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
              >
                <option>Cash</option>
                <option>Online Transfer</option>
                <option>Cheque</option>
              </select>
            </div>
          </div>
        );

      case 3:
        return (
          <div
            className={direction === "right" ? "step-slide-r" : "step-slide-l"}
          >
            <div className="personal-shell">
              <aside className="personal-aside" aria-label="Medical profile">
                <div className="personal-kicker">
                  <span>Medical profile</span>
                  <span className="personal-icon-badge">
                    <HeartPulse size={16} />
                  </span>
                </div>
                <div className="personal-avatar">
                  <HeartPulse size={30} />
                </div>
                <div>
                  <h2 className="personal-name">
                    {bloodGroup || "Health details pending"}
                  </h2>
                  <p className="personal-muted">
                    Optional medical context for workplace safety and emergency
                    readiness.
                  </p>
                </div>
                <div className="wizard-aside-stat">
                  <div className="wizard-stat">
                    <span>Height</span>
                    <strong>{heightCm ? `${heightCm} cm` : "Nullable"}</strong>
                  </div>
                  <div className="wizard-stat">
                    <span>Weight</span>
                    <strong>{weightKg ? `${weightKg} kg` : "Nullable"}</strong>
                  </div>
                </div>
                <div className="wizard-note">
                  Backend limits: disability type max 100 characters, fitness
                  status max 30 characters. Height and weight must be positive
                  whole numbers.
                </div>
              </aside>

              <section className="personal-main">
                <div className="personal-intro">
                  <div>
                    <h2>Medical Information</h2>
                    <p>
                      Add health fields exactly as accepted by employee medical
                      records. Empty optional fields are sent as null.
                    </p>
                  </div>
                  <span className="personal-step-chip">
                    <ShieldCheck size={13} />
                    Step 6 of 9
                  </span>
                </div>

                <div className="personal-panels">
                  <div className="personal-panel">
                    <div className="personal-panel-head">
                      <span className="personal-panel-icon">
                        <IdCard size={17} />
                      </span>
                      <div>
                        <h3 className="personal-panel-title">
                          Baseline details
                        </h3>
                        <p className="personal-panel-sub">
                          Blood group, DOB, gender, height, and weight.
                        </p>
                      </div>
                    </div>
                    <div className="personal-fields">
                      <div className="wizard-field-grid-3">
                        <div className="add-form-group">
                          <label className="add-label" htmlFor="blood-group">
                            Blood Group
                          </label>
                          <select
                            id="blood-group"
                            className="add-select"
                            value={bloodGroup}
                            onChange={(e) => setBloodGroup(e.target.value)}
                          >
                            <option value="">Nullable</option>
                            {[
                              "A+",
                              "A-",
                              "B+",
                              "B-",
                              "AB+",
                              "AB-",
                              "O+",
                              "O-",
                              "unknown",
                            ].map((b) => (
                              <option key={b} value={b}>
                                {b}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="add-form-group">
                          <label className="add-label" htmlFor="medical-dob">
                            Date of Birth
                          </label>
                          <input
                            id="medical-dob"
                            className="add-input add-input-readonly"
                            value={dob || "Nullable"}
                            readOnly
                          />
                        </div>
                        <div className="add-form-group">
                          <label className="add-label" htmlFor="medical-gender">
                            Gender
                          </label>
                          <input
                            id="medical-gender"
                            className="add-input add-input-readonly"
                            value={gender || "Nullable"}
                            readOnly
                          />
                        </div>
                      </div>
                      <div className="wizard-field-grid">
                        <div className="add-form-group">
                          <label className="add-label" htmlFor="height-cm">
                            Height (cm)
                          </label>
                          <input
                            id="height-cm"
                            className={`add-input${errors.heightCm ? " error" : ""}`}
                            type="number"
                            min="1"
                            step="1"
                            value={heightCm}
                            onChange={(e) => setHeightCm(e.target.value)}
                          />
                          <div className="add-hint">Positive whole number.</div>
                          {errors.heightCm && (
                            <div className="add-err">{errors.heightCm}</div>
                          )}
                        </div>
                        <div className="add-form-group">
                          <label className="add-label" htmlFor="weight-kg">
                            Weight (kg)
                          </label>
                          <input
                            id="weight-kg"
                            className={`add-input${errors.weightKg ? " error" : ""}`}
                            type="number"
                            min="1"
                            step="1"
                            value={weightKg}
                            onChange={(e) => setWeightKg(e.target.value)}
                          />
                          <div className="add-hint">Positive whole number.</div>
                          {errors.weightKg && (
                            <div className="add-err">{errors.weightKg}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="personal-panel">
                    <div className="personal-panel-head">
                      <span className="personal-panel-icon">
                        <ShieldCheck size={17} />
                      </span>
                      <div>
                        <h3 className="personal-panel-title">
                          Conditions and support
                        </h3>
                        <p className="personal-panel-sub">
                          Disability, chronic condition, allergy, and medication.
                        </p>
                      </div>
                    </div>
                    <div className="personal-fields">
                      <label className="add-check-label">
                        <input
                          type="checkbox"
                          checked={hasDisability}
                          onChange={(e) => setHasDisability(e.target.checked)}
                        />
                        Has disability
                      </label>
                      <div className="wizard-field-grid">
                        <div className="add-form-group">
                          <label className="add-label" htmlFor="disability-type">
                            Disability Type
                          </label>
                          <input
                            id="disability-type"
                            className={`add-input${errors.disabilityType ? " error" : ""}`}
                            value={disabilityType}
                            maxLength={100}
                            onChange={(e) => setDisabilityType(e.target.value)}
                          />
                          <div className="add-hint">
                            Optional, max 100 characters.
                          </div>
                          {errors.disabilityType && (
                            <div className="add-err">
                              {errors.disabilityType}
                            </div>
                          )}
                        </div>
                        <div className="add-form-group">
                          <label
                            className="add-label"
                            htmlFor="fitness-status"
                          >
                            Fitness Status
                          </label>
                          <input
                            id="fitness-status"
                            className={`add-input${errors.fitnessStatus ? " error" : ""}`}
                            value={fitnessStatus}
                            maxLength={30}
                            onChange={(e) => setFitnessStatus(e.target.value)}
                          />
                          <div className="add-hint">
                            Optional, max 30 characters.
                          </div>
                          {errors.fitnessStatus && (
                            <div className="add-err">
                              {errors.fitnessStatus}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="add-form-group">
                        <label
                          className="add-label"
                          htmlFor="disability-description"
                        >
                          Disability Description
                        </label>
                        <textarea
                          id="disability-description"
                          className="add-textarea"
                          rows={2}
                          value={disabilityDescription}
                          onChange={(e) =>
                            setDisabilityDescription(e.target.value)
                          }
                        />
                        <div className="add-hint">
                          Optional nullable text field.
                        </div>
                      </div>
                      <label className="add-check-label">
                        <input
                          type="checkbox"
                          checked={hasChronicCondition}
                          onChange={(e) =>
                            setHasChronicCondition(e.target.checked)
                          }
                        />
                        Has chronic condition
                      </label>
                      <div className="add-form-group">
                        <label className="add-label" htmlFor="chronic-notes">
                          Chronic Condition Notes
                        </label>
                        <textarea
                          id="chronic-notes"
                          className="add-textarea"
                          rows={2}
                          value={chronic}
                          onChange={(e) => setChronic(e.target.value)}
                        />
                        <div className="add-hint">
                          Optional nullable text field.
                        </div>
                      </div>
                      <label className="add-check-label">
                        <input
                          type="checkbox"
                          checked={hasKnownAllergies}
                          onChange={(e) =>
                            setHasKnownAllergies(e.target.checked)
                          }
                        />
                        Has known allergies
                      </label>
                      <div className="add-form-group">
                        <label className="add-label" htmlFor="allergy-notes">
                          Allergy Notes
                        </label>
                        <textarea
                          id="allergy-notes"
                          className="add-textarea"
                          rows={2}
                          value={allergies}
                          onChange={(e) => setAllergies(e.target.value)}
                        />
                        <div className="add-hint">
                          Optional nullable text field.
                        </div>
                      </div>
                      <div className="add-form-group">
                        <label
                          className="add-label"
                          htmlFor="emergency-medication"
                        >
                          Emergency Medication
                        </label>
                        <textarea
                          id="emergency-medication"
                          className="add-textarea"
                          rows={2}
                          value={medications}
                          onChange={(e) => setMedications(e.target.value)}
                        />
                        <div className="add-hint">
                          Optional nullable text field.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="address-card">
                  <div className="personal-panel-head">
                    <span className="personal-panel-icon">
                      <CalendarDays size={17} />
                    </span>
                    <div>
                      <h3 className="personal-panel-title">
                        Medical examination dates
                      </h3>
                      <p className="personal-panel-sub">
                        Last and next exam dates are optional nullable fields.
                      </p>
                    </div>
                  </div>
                  <div className="wizard-field-grid">
                    <div className="add-form-group">
                      <label
                        className="add-label"
                        htmlFor="last-medical-exam-date"
                      >
                        Last Medical Exam Date
                      </label>
                      <input
                        id="last-medical-exam-date"
                        className="add-input"
                        type="date"
                        value={lastMedicalExamDate}
                        onChange={(e) =>
                          setLastMedicalExamDate(e.target.value)
                        }
                      />
                    </div>
                    <div className="add-form-group">
                      <label
                        className="add-label"
                        htmlFor="next-medical-exam-date"
                      >
                        Next Medical Exam Date
                      </label>
                      <input
                        id="next-medical-exam-date"
                        className="add-input"
                        type="date"
                        value={nextMedicalExamDate}
                        onChange={(e) => setNextMedicalExamDate(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        );

      case 4:
        return (
          <div
            className={direction === "right" ? "step-slide-r" : "step-slide-l"}
          >
            <div className="personal-shell">
              <aside className="personal-aside" aria-label="Workforce placement">
                <div className="personal-kicker">
                  <span>Workforce placement</span>
                  <span className="personal-icon-badge">
                    <Briefcase size={16} />
                  </span>
                </div>
                <div className="personal-avatar">
                  <Building2 size={30} />
                </div>
                <div>
                  <h2 className="personal-name">
                    {selectedDept?.name || "Department pending"}
                  </h2>
                  <p className="personal-muted">
                    {selectedDesig?.name || "Choose the role, shift, and work setup."}
                  </p>
                </div>
                <div className="wizard-aside-stat">
                  <div className="wizard-stat">
                    <span>Mode</span>
                    <strong>
                      {workModes.find((d: any) => d.id === wMode)?.name || "Pending"}
                    </strong>
                  </div>
                  <div className="wizard-stat">
                    <span>Shift</span>
                    <strong>{selectedShift?.name || "Pending"}</strong>
                  </div>
                </div>
                <div className="personal-progress-card">
                  <div className="personal-progress-top">
                    <span className="personal-progress-title">
                      Placement readiness
                    </span>
                    <span className="personal-progress-count">
                      {jobReadyCount}/{jobChecklist.length}
                    </span>
                  </div>
                  <div className="personal-meter" aria-hidden="true">
                    <span style={{ width: `${jobReadyPercent}%` }} />
                  </div>
                </div>
                <div className="personal-checklist">
                  {jobChecklist.map((item) => (
                    <div
                      key={item.label}
                      className={`personal-check${item.done ? " done" : ""}`}
                    >
                      <Check size={14} />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </aside>

              <section className="personal-main">
                <div className="personal-intro">
                  <div>
                    <h2>Job Information</h2>
                    <p>
                      Place the employee in the right team, workplace, and shift
                      before compensation and account setup.
                    </p>
                  </div>
                  <span className="personal-step-chip">
                    <ShieldCheck size={13} />
                    Step 2 of 9
                  </span>
                </div>

                <div className="personal-panels">
                  <div className="personal-panel">
                    <div className="personal-panel-head">
                      <span className="personal-panel-icon">
                        <Users size={17} />
                      </span>
                      <div>
                        <h3 className="personal-panel-title">
                          Role and schedule
                        </h3>
                        <p className="personal-panel-sub">
                          Department, designation, employment type, and shift.
                        </p>
                      </div>
                    </div>
                    <div className="personal-fields">
                      <div className="wizard-field-grid">
                        <div className="add-form-group">
                          <label className="add-label" htmlFor="department">
                            Department <span>*</span>
                          </label>
                          <select
                            id="department"
                            className={`add-select${errors.dept ? " error" : ""}`}
                            value={dept}
                            onChange={(e) => {
                              setDept(e.target.value);
                              setDesig("");
                            }}
                          >
                            <option value="" disabled hidden style={{ display: "none" }}>
                              Please Select
                            </option>
                            {!departments.length && (
                              <option value="" disabled>
                                No departments configured
                              </option>
                            )}
                            {departments.map((d: any) => (
                              <option key={d.id} value={d.id}>
                                {d.name || d.id}
                              </option>
                            ))}
                          </select>
                          {errors.dept && (
                            <div className="add-err">{errors.dept}</div>
                          )}
                        </div>
                        <div className="add-form-group">
                          <label className="add-label" htmlFor="designation">
                            Designation <span>*</span>
                          </label>
                          <select
                            id="designation"
                            className={`add-select${errors.desig ? " error" : ""}`}
                            value={desig}
                            disabled={!dept || designationsLoading}
                            onChange={(e) => setDesig(e.target.value)}
                          >
                            <option value="" disabled hidden style={{ display: "none" }}>
                              Please Select
                            </option>
                            {!filteredDesignations.length && (
                              <option value="" disabled>
                                {dept
                                  ? designationsLoading
                                    ? "Loading designations..."
                                    : "No designations configured"
                                  : "Select department first"}
                              </option>
                            )}
                            {filteredDesignations.map((d: any) => (
                              <option key={d.id} value={d.id}>
                                {d.name || d.id}
                              </option>
                            ))}
                          </select>
                          {errors.desig && (
                            <div className="add-err">{errors.desig}</div>
                          )}
                        </div>
                      </div>
                      <div className="wizard-field-grid-3">
                        <div className="add-form-group">
                          <label className="add-label" htmlFor="employment-type">
                            Employment Type <span>*</span>
                          </label>
                          <select
                            id="employment-type"
                            className={`add-select${errors.empType ? " error" : ""}`}
                            value={empType}
                            onChange={(e) => setEmpType(e.target.value)}
                          >
                            <option value="" disabled hidden style={{ display: "none" }}>
                              Please Select
                            </option>
                            {!employmentTypes.length && (
                              <option value="" disabled>
                                No types configured
                              </option>
                            )}
                            {employmentTypes.map((d: any) => (
                              <option key={d.id} value={d.id}>
                                {d.name || d.id}
                              </option>
                            ))}
                          </select>
                          {errors.empType && (
                            <div className="add-err">{errors.empType}</div>
                          )}
                        </div>
                        <div className="add-form-group">
                          <label className="add-label" htmlFor="job-status">
                            Job Status <span>*</span>
                          </label>
                          <select
                            id="job-status"
                            className={`add-select${errors.jobStat ? " error" : ""}`}
                            value={jobStat}
                            onChange={(e) => setJobStat(e.target.value)}
                          >
                            <option value="" disabled hidden style={{ display: "none" }}>
                              Please Select
                            </option>
                            {!jobStatuses.length && (
                              <option value="" disabled>
                                No statuses configured
                              </option>
                            )}
                            {jobStatuses.map((d: any) => (
                              <option key={d.id} value={d.id}>
                                {d.name || d.id}
                              </option>
                            ))}
                          </select>
                          {errors.jobStat && (
                            <div className="add-err">{errors.jobStat}</div>
                          )}
                        </div>
                        <div className="add-form-group">
                          <label className="add-label" htmlFor="shift">
                            Shift <span>*</span>
                          </label>
                          <select
                            id="shift"
                            className={`add-select${errors.shift ? " error" : ""}`}
                            value={shift}
                            onChange={(e) => setShift(e.target.value)}
                          >
                            <option value="" disabled hidden style={{ display: "none" }}>
                              Please Select
                            </option>
                            {!shifts.length && (
                              <option value="" disabled>
                                No shifts configured
                              </option>
                            )}
                            {shifts.map((s: any) => (
                              <option key={s.id} value={s.id}>
                                {s.name || s.id}
                              </option>
                            ))}
                          </select>
                          {errors.shift && (
                            <div className="add-err">{errors.shift}</div>
                          )}
                        </div>
                      </div>
                      <div className="wizard-note">
                        {shiftTiming
                          ? `Selected shift timing: ${shiftTiming}`
                          : "Shift timing appears here once a configured shift is selected."}
                      </div>
                    </div>
                  </div>

                  <div className="personal-panel">
                    <div className="personal-panel-head">
                      <span className="personal-panel-icon">
                        <MapPin size={17} />
                      </span>
                      <div>
                        <h3 className="personal-panel-title">
                          Location and timeline
                        </h3>
                        <p className="personal-panel-sub">
                          Workplace, mode, joining date, and optional exit date.
                        </p>
                      </div>
                    </div>
                    <div className="personal-fields">
                      <div className="wizard-field-grid">
                        <div className="add-form-group">
                          <label className="add-label" htmlFor="work-location">
                            Work Location <span>*</span>
                          </label>
                          <select
                            id="work-location"
                            className={`add-select${errors.wLoc ? " error" : ""}`}
                            value={wLoc}
                            onChange={(e) => setWLoc(e.target.value)}
                          >
                            <option value="" disabled hidden style={{ display: "none" }}>
                              Please Select
                            </option>
                            {!workLocations.length && (
                              <option value="" disabled>
                                No locations configured
                              </option>
                            )}
                            {workLocations.map((d: any) => (
                              <option key={d.id} value={d.id}>
                                {d.name || d.id}
                              </option>
                            ))}
                          </select>
                          {errors.wLoc && (
                            <div className="add-err">{errors.wLoc}</div>
                          )}
                        </div>
                        <div className="add-form-group">
                          <label className="add-label" htmlFor="work-mode">
                            Work Mode <span>*</span>
                          </label>
                          <select
                            id="work-mode"
                            className={`add-select${errors.wMode ? " error" : ""}`}
                            value={wMode}
                            onChange={(e) => setWMode(e.target.value)}
                          >
                            <option value="" disabled hidden style={{ display: "none" }}>
                              Please Select
                            </option>
                            {!workModes.length && (
                              <option value="" disabled>
                                No work modes configured
                              </option>
                            )}
                            {workModes.map((d: any) => (
                              <option key={d.id} value={d.id}>
                                {d.name || d.id}
                              </option>
                            ))}
                          </select>
                          {errors.wMode && (
                            <div className="add-err">{errors.wMode}</div>
                          )}
                        </div>
                      </div>
                      <div className="wizard-field-grid">
                        <div className="add-form-group">
                          <label className="add-label" htmlFor="date-of-joining">
                            Date of Joining <span>*</span>
                          </label>
                          <input
                            id="date-of-joining"
                            className={`add-input${errors.doj ? " error" : ""}`}
                            type="date"
                            value={doj}
                            onChange={(e) => setDoj(e.target.value)}
                          />
                          {errors.doj && (
                            <div className="add-err">{errors.doj}</div>
                          )}
                        </div>
                        <div className="add-form-group">
                          <label className="add-label" htmlFor="date-of-exit">
                            Date of Exit
                          </label>
                          <input
                            id="date-of-exit"
                            className="add-input"
                            type="date"
                            value={doe}
                            onChange={(e) => setDoe(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="wizard-field-grid">
                        <div className="add-form-group">
                          <label className="add-label" htmlFor="probation-end-date">
                            Probation End Date
                          </label>
                          <input
                            id="probation-end-date"
                            className="add-input"
                            type="date"
                            value={probationEndDate}
                            onChange={(e) => setProbationEndDate(e.target.value)}
                          />
                          <div className="add-hint">Nullable if not applicable.</div>
                        </div>
                        <div className="add-form-group">
                          <label className="add-label" htmlFor="contract-end-date">
                            Contract End Date
                          </label>
                          <input
                            id="contract-end-date"
                            className="add-input"
                            type="date"
                            value={contractEndDate}
                            onChange={(e) => setContractEndDate(e.target.value)}
                          />
                          <div className="add-hint">Nullable for permanent roles.</div>
                        </div>
                      </div>
                      <div className="personal-id-pill">
                        <Clock size={13} />
                        {doj ? `Joining ${doj}` : "Joining date pending"}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        );

      case 6:
        return (
          <div
            className={direction === "right" ? "step-slide-r" : "step-slide-l"}
          >
            <div className="personal-intro" style={{ marginBottom: 16 }}>
              <div>
                <h2>Salary plan</h2>
                <p>
                  Define the current compensation record. Effective date falls
                  back to joining date when left blank.
                </p>
              </div>
              <span className="personal-step-chip">
                <Calculator size={13} />
                Step 7 of 9
              </span>
            </div>
            <div className="salary-studio">
              <section className="salary-panel">
                <div className="salary-panel-head">
                  <div>
                    <h3 className="salary-panel-title">Payroll inputs</h3>
                    <p className="salary-panel-sub">
                      Keep the mandatory salary record precise and easy to audit.
                    </p>
                  </div>
                  <span className="personal-id-pill">
                    <Banknote size={13} />
                    {currency || "PKR"}
                  </span>
                </div>
                <div className="wizard-field-grid">
                  <div className="add-form-group">
                    <label className="add-label" htmlFor="salary-effective-from">
                      Effective From
                    </label>
                    <input
                      id="salary-effective-from"
                      className="add-input"
                      type="date"
                      value={salaryEffectiveFrom}
                      onChange={(e) => setSalaryEffectiveFrom(e.target.value)}
                    />
                    <div className="add-hint">
                      Uses joining date when this is left empty.
                    </div>
                  </div>
                  <div className="add-form-group">
                    <label className="add-label" htmlFor="salary-currency">
                      Currency
                    </label>
                    <input
                      id="salary-currency"
                      className="add-input"
                      maxLength={3}
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                    />
                  </div>
                </div>
                <div className="wizard-field-grid">
                  <div className="add-form-group">
                    <label className="add-label" htmlFor="revision-type">
                      Revision Type <span>*</span>
                    </label>
                    <select
                      id="revision-type"
                      className="add-select"
                      value={revisionType}
                      onChange={(e) =>
                        setRevisionType(
                          e.target.value as
                            | "Initial"
                            | "Promotion"
                            | "Demotion"
                            | "Increment"
                            | "Decrement"
                            | "Correction"
                            | "Market Adjustment",
                        )
                      }
                    >
                      <option value="Initial">Initial</option>
                      <option value="Promotion">Promotion</option>
                      <option value="Demotion">Demotion</option>
                      <option value="Increment">Increment</option>
                      <option value="Decrement">Decrement</option>
                      <option value="Correction">Correction</option>
                      <option value="Market Adjustment">Market Adjustment</option>
                    </select>
                  </div>
                  <div className="add-form-group">
                    <label className="add-label" htmlFor="revision-percent">
                      Revision %
                    </label>
                    <input
                      id="revision-percent"
                      className="add-input"
                      type="number"
                      value={revisionPercent}
                      onChange={(e) => setRevisionPercent(e.target.value)}
                    />
                  </div>
                </div>
                <div className="add-form-group" style={{ marginBottom: 14 }}>
                  <label className="add-label" htmlFor="revision-reason">
                    Revision Reason
                  </label>
                  <input
                    id="revision-reason"
                    className="add-input"
                    maxLength={500}
                    value={revisionReason}
                    onChange={(e) => setRevisionReason(e.target.value)}
                  />
                </div>
                <div className="add-form-group">
                  <label className="add-label" htmlFor="basic-salary">
                    Basic Salary <span>*</span>
                  </label>
                  <input
                    id="basic-salary"
                    className="add-input mono"
                    type="number"
                    value={basicSalary || ""}
                    onChange={(e) => setBasicSalary(+e.target.value)}
                  />
                </div>
              </section>
              <aside className="salary-snapshot">
                <div className="salary-snapshot-head">
                  <span className="salary-snapshot-icon">
                    <Calculator size={18} />
                  </span>
                  <div>
                    <h3 className="salary-snapshot-title">
                      Compensation snapshot
                    </h3>
                    <p className="salary-snapshot-sub">
                      Preview before creating the employee.
                    </p>
                  </div>
                </div>
                <div className="salary-stat-grid">
                  <div className="salary-stat primary">
                    <span>Total Monthly Package</span>
                    <strong>{formatPKR(totalSalary)}</strong>
                  </div>
                  <div className="salary-stat">
                    <span>Monthly base</span>
                    <strong>{formatPKR(basicSalary)}</strong>
                  </div>
                  <div className="salary-stat">
                    <span>Effective date</span>
                    <strong>{salaryEffectiveFrom || doj || "Pending"}</strong>
                  </div>
                  <div className="salary-stat">
                    <span>Currency</span>
                    <strong>{currency || "PKR"}</strong>
                  </div>
                  <div className="salary-stat">
                    <span>Revision</span>
                    <strong>{revisionType}</strong>
                  </div>
                </div>
                <div className="revision-context">
                  <strong>Revision context</strong>
                  <span>
                    {revisionReason.trim()
                      ? revisionReason
                      : revisionPercent
                        ? `${revisionPercent}% ${revisionType.toLowerCase()} recorded.`
                        : "Initial compensation record with optional revision notes."}
                  </span>
                </div>
              </aside>
            </div>
          </div>
        );

      case 7:
        return (
          <div
            className={direction === "right" ? "step-slide-r" : "step-slide-l"}
          >
            <div className="personal-intro" style={{ marginBottom: 16 }}>
              <div>
                <h2>Allowance builder</h2>
                <p>
                  Add optional allowance rows. Each saved row requires a type
                  and non-negative amount.
                </p>
              </div>
              <span className="personal-step-chip">
                <PlusCircle size={13} />
                Step 8 of 9
              </span>
            </div>
            <div className="allowance-workbench">
              <section className="allowance-panel">
                <div className="allowance-panel-head">
                  <div>
                    <h3 className="allowance-panel-title">
                      Allowance package
                    </h3>
                    <p className="allowance-panel-sub">
                      Build optional allowances with one unique type per row.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="add-back-btn"
                    disabled={!allowanceTypes.length}
                    onClick={() =>
                      setAllowances([
                        ...allowances,
                        {
                          allowance_type_id: "",
                          amount: 0,
                          is_percentage: false,
                        },
                      ])
                    }
                  >
                    <PlusCircle size={13} /> Add Allowance Row
                  </button>
                </div>
                <div className="allowance-metrics">
                  <div className="allowance-metric">
                    <span>Configured allowances</span>
                    <strong>{selectedAllowanceRows.length}</strong>
                  </div>
                  <div className="allowance-metric">
                    <span>Remaining types</span>
                    <strong>{remainingAllowanceTypes}</strong>
                  </div>
                  <div className="allowance-metric">
                    <span>Fixed value</span>
                    <strong>{formatPKR(fixedAllowanceTotal)}</strong>
                  </div>
                </div>
                {!allowances.length && (
                  <div className="wizard-note" style={{ marginBottom: 12 }}>
                    No allowance rows yet. Add a row only when the employee has a
                    confirmed allowance to save.
                  </div>
                )}
                {allowances.map((row, idx) => {
                  const allowanceName =
                    allowanceTypes.find(
                      (type: any) => type.id === row.allowance_type_id,
                    )?.name || "";
                  return (
                    <div key={idx} className="add-form-row-allowance">
                      <div className="allowance-card-head">
                        <h4 className="allowance-card-title">
                          Allowance {idx + 1}
                        </h4>
                        <span
                          className={`allowance-status-pill${
                            allowanceName ? " selected" : ""
                          }`}
                        >
                          {allowanceName || "Type pending"}
                        </span>
                      </div>
                      <div className="allowance-card-body">
                        <div className="add-form-group">
                          <label
                            className="add-label"
                            htmlFor={`allowance-type-${idx}`}
                          >
                            Allowance Type {idx + 1}
                          </label>
                          <select
                            id={`allowance-type-${idx}`}
                            className="add-select"
                            value={row.allowance_type_id}
                            onChange={(e) => {
                              const selectedValue = e.target.value;
                              const isDuplicate = allowances.some(
                                (other, otherIdx) =>
                                  otherIdx !== idx &&
                                  other.allowance_type_id === selectedValue,
                              );
                              const next = [...allowances];
                              next[idx] = {
                                ...row,
                                allowance_type_id: selectedValue,
                              };
                              setAllowances(next);
                              setErrors((prev) => {
                                const nextErrors = { ...prev };
                                if (selectedValue && isDuplicate) {
                                  nextErrors[`allowanceType_${idx}`] =
                                    "Allowance type already selected";
                                } else {
                                  delete nextErrors[`allowanceType_${idx}`];
                                }
                                return nextErrors;
                              });
                            }}
                          >
                            <option value="">Select type</option>
                            {allowanceTypes.map((t: any) => (
                              <option
                                key={t.id}
                                value={t.id}
                                disabled={allowances.some(
                                  (other, otherIdx) =>
                                    otherIdx !== idx &&
                                    other.allowance_type_id === t.id,
                                )}
                              >
                                {t.name || t.id}
                              </option>
                            ))}
                          </select>
                          {errors[`allowanceType_${idx}`] && (
                            <div className="add-err">
                              {errors[`allowanceType_${idx}`]}
                            </div>
                          )}
                        </div>
                        <div className="add-form-group">
                          <label
                            className="add-label"
                            htmlFor={`allowance-amount-${idx}`}
                          >
                            Amount {idx + 1}
                          </label>
                          <div className="amount-with-prefix">
                            <span className="amount-prefix">
                              {row.is_percentage ? "%" : "Rs"}
                            </span>
                            <input
                              id={`allowance-amount-${idx}`}
                              className="add-input"
                              type="number"
                              value={row.amount}
                              onChange={(e) => {
                                const next = [...allowances];
                                next[idx] = { ...row, amount: +e.target.value };
                                setAllowances(next);
                              }}
                            />
                          </div>
                          {errors[`allowanceAmount_${idx}`] && (
                            <div className="add-err">
                              {errors[`allowanceAmount_${idx}`]}
                            </div>
                          )}
                        </div>
                        <div className="add-form-group allowance-type-field">
                          <label className="add-label">Amount Type</label>
                          <div className="allowance-toggle">
                            <button
                              type="button"
                              className={row.is_percentage ? "" : "active"}
                              onClick={() => {
                                const next = [...allowances];
                                next[idx] = { ...row, is_percentage: false };
                                setAllowances(next);
                              }}
                            >
                              Rs
                            </button>
                            <button
                              type="button"
                              className={row.is_percentage ? "active" : ""}
                              onClick={() => {
                                const next = [...allowances];
                                next[idx] = { ...row, is_percentage: true };
                                setAllowances(next);
                              }}
                            >
                              %
                            </button>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="allowance-row-action"
                          aria-label={`Remove allowance row ${idx + 1}`}
                          title={`Remove allowance row ${idx + 1}`}
                          onClick={() => {
                            setAllowances(
                              allowances.filter((_, rowIdx) => rowIdx !== idx),
                            );
                            setErrors((prev) =>
                              Object.fromEntries(
                                Object.entries(prev).filter(
                                  ([key]) => !key.startsWith("allowance"),
                                ),
                              ),
                            );
                          }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </section>
              <aside className="allowance-summary">
                <div className="allowance-summary-head">
                  <span className="allowance-summary-icon">
                    <WalletCards size={17} />
                  </span>
                  <div>
                    <h3 className="allowance-summary-title">
                      Allowance summary
                    </h3>
                    <p className="allowance-summary-sub">
                      Only selected rows are sent in the create payload.
                    </p>
                  </div>
                </div>
                <div className="allowance-summary-row">
                  <span>Fixed allowance total</span>
                  <strong>{formatPKR(fixedAllowanceTotal)}</strong>
                </div>
                <div className="allowance-summary-row">
                  <span>Percentage rows</span>
                  <strong>{percentageAllowanceCount}</strong>
                </div>
                <div className="allowance-summary-row">
                  <span>Selected types</span>
                  <strong>{selectedAllowanceRows.length}</strong>
                </div>
                {selectedAllowanceNames.length ? (
                  <div className="allowance-tags">
                    {selectedAllowanceNames.map((name, idx) => (
                      <span key={`${name}-${idx}`} className="allowance-tag">
                        {name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="allowance-empty-mini">
                    No selected allowance types yet.
                  </div>
                )}
              </aside>
            </div>
          </div>
        );

      case 5:
        return (
          <div
            className={direction === "right" ? "step-slide-r" : "step-slide-l"}
          >
            <div className="personal-intro" style={{ marginBottom: 16 }}>
              <div>
                <h2>Account access</h2>
                <p>
                  Create the mandatory user account record. Role is nullable;
                  email is mandatory by the backend schema.
                </p>
              </div>
              <span className="personal-step-chip">
                <WalletCards size={13} />
                Step 9 of 9
              </span>
            </div>

            <div>
              <div className="add-form-row">
                <div className="add-form-group" style={{ marginBottom: 14 }}>
                  <label className="add-label" htmlFor="employee-email-a">
                    Employee Email <span>*</span>
                  </label>
                  <input
                    id="employee-email-a"
                    className="add-input"
                    type="email"
                    value={empEmail}
                    onChange={(e) => {
                      setEmailManuallyEdited(true);
                      setEmpEmail(e.target.value);
                    }}
                    placeholder="employee@company.com"
                  />
                  {errors.empEmail && (
                    <div className="add-err">{errors.empEmail}</div>
                  )}
                </div>
                <div className="add-form-group">
                  <label className="add-label" htmlFor="temporary-password">
                    Temporary Password
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      id="temporary-password"
                      className="add-input mono"
                      type="text"
                      value={tempPassword}
                      onChange={(e) => setTempPassword(e.target.value)}
                      placeholder="Enter or generate"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="add-back-btn"
                      style={{ whiteSpace: "nowrap", height: 38 }}
                      onClick={generatePassword}
                    >
                      Generate
                    </button>
                  </div>
                </div>
              </div>
              {tempPassword && empEmail && (
                <div style={{ marginBottom: 14 }}>
                  <button
                    type="button"
                    className="add-next-btn"
                    style={{
                      background: "linear-gradient(135deg, #25D366, #128C7E)",
                      boxShadow: "0 4px 12px rgba(37, 211, 102, 0.3)",
                    }}
                    onClick={sendWhatsAppInvite}
                  >
                    <Phone size={14} /> Send Credentials via WhatsApp
                  </button>
                  <div className="add-hint" style={{ marginTop: 6 }}>
                    This will open WhatsApp with a pre-filled message for{" "}
                    {empPhone || contact1 || "the employee"}.
                  </div>
                </div>
              )}
            </div>

            <div className="add-form-group" style={{ marginTop: 14 }}>
              <label className="add-label" htmlFor="role">
                Role
              </label>
              <select
                id="role"
                className="add-select"
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
              >
                <option value="">Select a role</option>
                {roles.map((role: any) => (
                  <option key={role.id} value={role.id}>
                    {role.description || role.roleName}
                  </option>
                ))}
              </select>
            </div>


            {fullName && (
              <div className="summary-box">
                <strong style={{ color: "#1e1b4b" }}>{fullName}</strong>
                <span style={{ color: "#6b7280" }}>
                  {" "}
                  · {selectedDept?.name || ""} · {selectedDesig?.name || ""} ·{" "}
                  {selectedShift?.name || ""}
                </span>
                <br />
                <span style={{ color: "#6366f1", fontWeight: 700 }}>
                  Total Package: {formatPKR(totalSalary)}/month
                </span>
                {doj && (
                  <span style={{ color: "#9ca3af" }}> · Joining: {doj}</span>
                )}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{S}</style>
      <div className="add-pg">
        {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
        <div className="add-head">
          <div>
            <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>
              Employees
            </p>
            <h1
              className="add-title"
              style={{ display: "flex", alignItems: "center", gap: 10 }}
            >
              <UserPlus size={24} color="#6366f1" />
              Add Employee
            </h1>
            <p className="add-sub">
              Step {step + 1} of {STEPS.length} — {STEPS[step]}
            </p>
          </div>
        </div>

        {/* ══ STEPPER CARD ════════════════════════════════════════════════════ */}
        <div className="add-card" style={{ marginBottom: 14 }}>
          <div className="step-track">
            {STEPS.map((s, i) => (
              <React.Fragment key={i}>
                <div className="step-node">
                  <div
                    className={`step-circle ${i < step ? "done" : i === step ? "active" : "idle"}`}
                  >
                    {i < step ? <Check size={13} /> : i + 1}
                  </div>
                  <div
                    className={`step-label ${i < step ? "done" : i === step ? "active" : "idle"}`}
                  >
                    {s}
                  </div>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`step-line ${i < step ? "done" : "idle"}`} />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="add-progress-track">
            <div
              className="add-progress-fill"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* ══ STEP CONTENT CARD ═══════════════════════════════════════════════ */}
        <div className="add-card-body">{renderStep()}</div>

        {/* ══ FOOTER NAV ══════════════════════════════════════════════════════ */}
        <div className="add-footer">
          <button
            className="add-cancel-btn"
            onClick={() => navigate("/employees")}
          >
            <X size={13} /> Cancel
          </button>
          <span className="step-info">
            Step {step + 1} of {STEPS.length} — {STEPS[step]}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            {step > 0 && (
              <button className="add-back-btn" onClick={goBack}>
                <ChevronLeft size={13} /> Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button className="add-next-btn" onClick={goNext}>
                Next <ChevronRight size={13} />
              </button>
            ) : (
              <button
                className="add-save-btn"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  "Saving..."
                ) : (
                  <>
                    <Check size={13} /> Save Employee
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
