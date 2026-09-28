import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useAuthStore } from '../store/useAuthStore';
import { apiClient } from '../services/apiClient';
import {
  employees as defaultEmployees, Employee,
  attendanceData as defaultAttendance,
  allAttendanceToday as defaultAttToday,
  leaveRequests as defaultLeaveReqs,
  payrollData as defaultPayroll,
  promotions as defaultPromotions,
  penalties as defaultPenalties,
  auditLog as defaultAuditLog,
  hrAccounts as defaultHrAccounts,
  departments as defaultDepts,
  designations as defaultDesigs,
  workModes as defaultWorkModes,
  workLocations as defaultWorkLocs,
  employmentTypes as defaultEmpTypes,
  jobStatuses as defaultJobStatuses,
  shifts as defaultShifts,
  dutyRosterData as defaultDutyRosterData,
  dutyRosterTemplates as defaultDutyRosterTemplates,
  leaveTypes as defaultLeaveTypes,
  leavePolicies as defaultLeavePolicies,
  payrollComponents as defaultPayrollComps,
  penaltiesConfig as defaultPenaltiesConfig,
  reportingManagers as defaultReportingMgrs,
  customFields as defaultCustomFields,
  taxConfig as defaultTaxConfig,
  globalDays as defaultGlobalDays,
} from '../services/api';

function load<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem('ems_' + key);
    return stored ? JSON.parse(stored) : fallback;
  } catch { return fallback; }
}

function save(key: string, value: any) {
  localStorage.setItem('ems_' + key, JSON.stringify(value));
}

export type AttendanceLockStatus =
  | 'unlocked'
  | 'locked'
  | 'branch_locked'
  | 'head_locked'
  | 'finalized';

export interface AttendanceLock {
  status: AttendanceLockStatus;
  lockedBy: string;
  lockedAt: string;
  branch?: string;
  date?: string;
}

interface DataContextType {
  employees: Employee[];
  setEmployees: (fn: (prev: Employee[]) => Employee[]) => void;
  addEmployee: (emp: Employee) => void;
  deleteEmployee: (id: string) => void;
  leaveRequests: any[];
  setLeaveRequests: (fn: (prev: any[]) => any[]) => void;
  payrollData: any[];
  setPayrollData: (fn: (prev: any[]) => any[]) => void;
  promotions: any[];
  setPromotions: (fn: (prev: any[]) => any[]) => void;
  penalties: any[];
  setPenalties: (fn: (prev: any[]) => any[]) => void;
  auditLog: any[];
  setAuditLog: (fn: (prev: any[]) => any[]) => void;
  hrAccounts: any[];
  setHrAccounts: (fn: (prev: any[]) => any[]) => void;
  attendanceData: any[];
  setAttendanceData: (fn: (prev: any[]) => any[]) => void;
  allAttendanceToday: any[];
  setAllAttendanceToday: (fn: (prev: any[]) => any[]) => void;
  attendanceLocks: Record<string, AttendanceLock>;
  setAttendanceLocks: (fn: (prev: Record<string, AttendanceLock>) => Record<string, AttendanceLock>) => void;
  departments: string[];
  setDepartments: (fn: (prev: string[]) => string[]) => void;
  designations: string[];
  setDesignations: (fn: (prev: string[]) => string[]) => void;
  workModes: string[];
  setWorkModes: (fn: (prev: string[]) => string[]) => void;
  workLocations: string[];
  setWorkLocations: (fn: (prev: string[]) => string[]) => void;
  employmentTypes: string[];
  setEmploymentTypes: (fn: (prev: string[]) => string[]) => void;
  jobStatuses: string[];
  setJobStatuses: (fn: (prev: string[]) => string[]) => void;
  reportingManagers: string[];
  setReportingManagers: (fn: (prev: string[]) => string[]) => void;
  shifts: typeof defaultShifts;
  setShifts: (fn: (prev: typeof defaultShifts) => typeof defaultShifts) => void;
  dutyRosterData: any[];
  setDutyRosterData: (fn: (prev: any[]) => any[]) => void;
  dutyRosterTemplates: any[];
  setDutyRosterTemplates: (fn: (prev: any[]) => any[]) => void;
  leaveTypes: typeof defaultLeaveTypes;
  setLeaveTypes: (fn: (prev: typeof defaultLeaveTypes) => typeof defaultLeaveTypes) => void;
  leavePolicies: typeof defaultLeavePolicies;
  setLeavePolicies: (fn: (prev: typeof defaultLeavePolicies) => typeof defaultLeavePolicies) => void;
  payrollComponents: typeof defaultPayrollComps;
  setPayrollComponents: (fn: (prev: typeof defaultPayrollComps) => typeof defaultPayrollComps) => void;
  penaltiesConfig: typeof defaultPenaltiesConfig;
  setPenaltiesConfig: (fn: (prev: typeof defaultPenaltiesConfig) => typeof defaultPenaltiesConfig) => void;
  customFields: typeof defaultCustomFields;
  setCustomFields: (fn: (prev: typeof defaultCustomFields) => typeof defaultCustomFields) => void;
  taxConfig: typeof defaultTaxConfig;
  setTaxConfig: (fn: (prev: typeof defaultTaxConfig) => typeof defaultTaxConfig) => void;
  globalDays: typeof defaultGlobalDays;
  setGlobalDays: (fn: (prev: typeof defaultGlobalDays) => typeof defaultGlobalDays) => void;
}

const DataContext = createContext<DataContextType | null>(null);

function usePersisted<T>(key: string, fallback: T): [T, (fn: (prev: T) => T) => void] {
  const [state, setState] = useState<T>(() => load(key, fallback));
  const update = useCallback((fn: (prev: T) => T) => {
    setState(prev => {
      const next = fn(prev);
      save(key, next);
      return next;
    });
  }, [key]);
  return [state, update];
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = usePersisted('employees', defaultEmployees);
  const [leaveRequests, setLeaveRequests] = usePersisted('leaveRequests', defaultLeaveReqs);
  const [payrollData, setPayrollData] = usePersisted('payrollData', defaultPayroll);
  const [promotions, setPromotions] = usePersisted('promotions', defaultPromotions);
  const [penalties, setPenalties] = usePersisted('penalties', defaultPenalties);
  const [auditLog, setAuditLog] = usePersisted('auditLog', defaultAuditLog);
  const [hrAccounts, setHrAccounts] = usePersisted('hrAccounts', defaultHrAccounts);
  const [attendanceData, setAttendanceData] = usePersisted('attendanceData', defaultAttendance);
  const [allAttendanceToday, setAllAttendanceToday] = usePersisted('allAttendanceToday', defaultAttToday);
  const [attendanceLocks, setAttendanceLocks] = usePersisted<Record<string, AttendanceLock>>('attendanceLocks', {});
  const [departments, setDepartments] = usePersisted('departments', defaultDepts);
  const [designations, setDesignations] = usePersisted('designations', defaultDesigs);
  const [workModes, setWorkModes] = usePersisted('workModes', defaultWorkModes);
  const [workLocations, setWorkLocations] = usePersisted('workLocations', defaultWorkLocs);
  const [employmentTypes, setEmploymentTypes] = usePersisted('employmentTypes', defaultEmpTypes);
  const [jobStatuses, setJobStatuses] = usePersisted('jobStatuses', defaultJobStatuses);
  const [reportingManagers, setReportingManagers] = usePersisted('reportingManagers', defaultReportingMgrs);
  const [shifts, setShifts] = usePersisted('shifts', defaultShifts);
  const [dutyRosterData, setDutyRosterData] = usePersisted('dutyRosterData', defaultDutyRosterData);
  const [dutyRosterTemplates, setDutyRosterTemplates] = usePersisted('dutyRosterTemplates', defaultDutyRosterTemplates);
  const [leaveTypes, setLeaveTypes] = usePersisted('leaveTypes', defaultLeaveTypes);
  const [leavePolicies, setLeavePolicies] = usePersisted('leavePolicies', defaultLeavePolicies);
  const [payrollComponents, setPayrollComponents] = usePersisted('payrollComponents', defaultPayrollComps);
  const [penaltiesConfig, setPenaltiesConfig] = usePersisted('penaltiesConfig', defaultPenaltiesConfig);
  const [customFields, setCustomFields] = usePersisted('customFields', defaultCustomFields);
  const [taxConfig, setTaxConfig] = usePersisted('taxConfig', defaultTaxConfig);
  const [globalDays, setGlobalDays] = usePersisted('globalDays', defaultGlobalDays);
  const { user, activeRole } = useAuth();

  // Fetch live employees from backend after user logs in.
  // ONLY admin/HR roles are allowed to call the /employees list endpoint.
  // Plain employees get a 403, so we skip it for them entirely.
  useEffect(() => {
    if (!user) return;
    // Only admins and HR roles can fetch the full employee list
    const canFetchAll =
      activeRole === 'super_admin' ||
      activeRole === 'head_hr' ||
      activeRole === 'branch_hr' ||
      activeRole === 'department_hr' ||
      activeRole === 'department_head' ||
      activeRole === 'hr_manager' ||
      activeRole === 'hr_executive';
    if (!canFetchAll) return;
    let cancelled = false;
    async function loadFromBackend() {
      try {
        const { data: body } = await apiClient.get('/employees?page=1&limit=1000');
        const list = body?.data?.employees || body?.data || [];
        if (!Array.isArray(list)) return;
        const mapped = list.map((it: any) => ({
          id: it.employee_id || it.id,
          name: it.name || (it.personalInfo && it.personalInfo.name) || '',
          fatherName: (it.personalInfo && it.personalInfo.father_name) || it.fatherName || '',
          dob: (it.personalInfo && it.personalInfo.date_of_birth) || it.dob || '',
          cnic: it.cnic || '',
          gender: (it.personalInfo && it.personalInfo.gender) || it.gender || '',
          department: it.department_name || (it.jobInfo && it.jobInfo.department_name) || it.department || '',
          designation: it.designation_name || (it.jobInfo && it.jobInfo.designation_name) || it.designation || '',
          employmentType: it.employment_type_name || it.employmentType || '',
          jobStatus: it.job_status_name || it.jobStatus || (it.jobInfo && it.jobInfo.job_status) || 'Active',
          workMode: it.work_mode_name || it.workMode || '',
          workLocation: it.work_location_name || it.workLocation || '',
          shift: it.shift_name || it.shift || '',
          reportingManager: it.manager_emp_id || it.reportingManager || '',
          dateOfJoining: (it.jobInfo && it.jobInfo.date_of_joining) || it.date_of_joining || it.dateOfJoining || '',
          dateOfExit: (it.jobInfo && it.jobInfo.date_of_exit) || it.dateOfExit || '',
          contact1: (it.employeeContact && it.employeeContact.primary_phone) || (it.accountInfo && it.accountInfo.phone) || it.contact1 || it.phone || '',
          contact2: (it.employeeContact && it.employeeContact.alternate_phone) || '',
          emergency1: (it.emergencyContacts && it.emergencyContacts.e_contact_1_phone) || it.emergency1 || '',
          emergency2: '',
          permanentAddress: (it.employeeContact && it.employeeContact.perment_address) || (it.emergencyContacts && it.emergencyContacts.perment_address) || it.permanentAddress || '',
          postalAddress: (it.employeeContact && it.employeeContact.postal_address) || (it.emergencyContacts && it.emergencyContacts.postal_address) || it.postalAddress || '',
          bankName: (it.bankInfo && it.bankInfo.bank_name) || it.bankName || '',
          bankAccount: (it.bankInfo && it.bankInfo.account_number) || it.bankAccount || '',
          paymentMode: it.paymentMode || '',
          bloodGroup: (it.medicalInfo && it.medicalInfo.blood_group) || it.bloodGroup || '',
          allergies: (it.medicalInfo && it.medicalInfo.allergy_notes) || it.allergies || '',
          chronicConditions: (it.medicalInfo && it.medicalInfo.chronic_condition_notes) || it.chronicConditions || '',
          medications: (it.medicalInfo && it.medicalInfo.emergency_medication) || it.medications || '',
          avatar: (it.accountInfo && it.accountInfo.email && it.accountInfo.email.split('@')[0].slice(0,2).toUpperCase()) || (it.avatar || ''),
          commissionEligible: !!it.commissionEligible,
          salary: {
            basic: (it.salaryInfo && it.salaryInfo.base_salary) || (it.salary && it.salary.basic) || 0,
            houseRent: (it.salary && it.salary.houseRent) || 0,
            medical: (it.salary && it.salary.medical) || 0,
            conveyance: (it.salary && it.salary.conveyance) || 0,
            commission: (it.salary && it.salary.commission) || 0,
          },
        }));
        if (!cancelled) setEmployees(() => mapped as any);
      } catch (e) {
        // ignore — keep demo/local data
      }
    }
    loadFromBackend();
    return () => { cancelled = true; };
  }, [user, setEmployees]);

  const addEmployee = useCallback((emp: Employee) => {
    setEmployees(prev => [...prev, emp]);
  }, [setEmployees]);

  const deleteEmployee = useCallback((id: string) => {
    setEmployees(prev => prev.filter(e => e.id !== id));
  }, [setEmployees]);

  return (
    <DataContext.Provider value={{
      employees, setEmployees, addEmployee, deleteEmployee,
      leaveRequests, setLeaveRequests,
      payrollData, setPayrollData,
      promotions, setPromotions,
      penalties, setPenalties,
      auditLog, setAuditLog,
      hrAccounts, setHrAccounts,
      attendanceData, setAttendanceData,
      allAttendanceToday, setAllAttendanceToday,
      attendanceLocks, setAttendanceLocks,
      departments, setDepartments,
      designations, setDesignations,
      workModes, setWorkModes,
      workLocations, setWorkLocations,
      employmentTypes, setEmploymentTypes,
      jobStatuses, setJobStatuses,
      reportingManagers, setReportingManagers,
      shifts, setShifts,
      dutyRosterData, setDutyRosterData,
      dutyRosterTemplates, setDutyRosterTemplates,
      leaveTypes, setLeaveTypes,
      leavePolicies, setLeavePolicies,
      payrollComponents, setPayrollComponents,
      penaltiesConfig, setPenaltiesConfig,
      customFields, setCustomFields,
      taxConfig, setTaxConfig,
      globalDays, setGlobalDays,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}




















