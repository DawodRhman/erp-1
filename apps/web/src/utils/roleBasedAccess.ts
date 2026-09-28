import { User } from '../context/AuthContext';

export interface RoleAccessConfig {
  canViewAllBranches: boolean;
  canViewAllDepartments: boolean;
  canViewAllEmployees: boolean;
  canEditApprovals: boolean;
  dashboardType: 'superadmin' | 'head_hr' | 'branch' | 'department' | 'employee';
}

export function getRoleAccessConfig(user: User | null): RoleAccessConfig {
  if (!user) {
    return {
      canViewAllBranches: false,
      canViewAllDepartments: false,
      canViewAllEmployees: false,
      canEditApprovals: false,
      dashboardType: 'employee',
    };
  }

  if (user.role === 'super_admin') {
    return {
      canViewAllBranches: true,
      canViewAllDepartments: true,
      canViewAllEmployees: true,
      canEditApprovals: true,
      dashboardType: 'superadmin',
    };
  }

  if (user.role === 'head_hr' || user.role === 'hr_manager') {
    return {
      canViewAllBranches: true,
      canViewAllDepartments: true,
      canViewAllEmployees: true,
      canEditApprovals: true,
      dashboardType: 'head_hr',
    };
  }

  if (user.role === 'hr_executive') {
    return {
      canViewAllBranches: false,
      canViewAllDepartments: true,
      canViewAllEmployees: true,
      canEditApprovals: false,
      dashboardType: 'department',
    };
  }

  if (user.role === 'branch_hr') {
    return {
      canViewAllBranches: false,
      canViewAllDepartments: true, // Can see all departments in their branch
      canViewAllEmployees: true,   // Can see all employees in their branch
      canEditApprovals: true,
      dashboardType: 'branch',
    };
  }

  if (user.role === 'department_hr') {
    return {
      canViewAllBranches: false,
      canViewAllDepartments: false, // Only their department
      canViewAllEmployees: true,    // Can see all employees in their department
      canEditApprovals: true,
      dashboardType: 'department',
    };
  }

  // Employee
  return {
    canViewAllBranches: false,
    canViewAllDepartments: false,
    canViewAllEmployees: false,
    canEditApprovals: false,
    dashboardType: 'employee',
  };
}

// Filter employees based on user's role and branch/department
export function filterEmployeesByRole(employees: any[], user: User | null): any[] {
  if (!user) return [];

  if (user.role === 'super_admin' || user.role === 'head_hr' || user.role === 'hr_manager') {
    return employees;
  }

  if (user.role === 'hr_executive') {
    return employees;
  }

  if (user.role === 'branch_hr') {
    return employees.filter((emp) => emp.workLocation === user.branch);
  }

  if (user.role === 'department_hr') {
    return employees.filter(
      (emp) => emp.department === user.departments?.[0] && emp.workLocation === user.branch
    );
  }

  // Employee - only their own data
  if (user.role === 'employee') {
    return employees.filter((emp) => emp.id === user.employeeId);
  }

  return employees;
}

// Filter attendance data based on user's role
export function filterAttendanceByRole(attendance: any[], user: User | null): any[] {
  if (!user) return [];

  if (user.role === 'super_admin' || user.role === 'head_hr' || user.role === 'hr_manager') {
    return attendance;
  }

  if (user.role === 'hr_executive') {
    return attendance;
  }

  if (user.role === 'branch_hr') {
    return attendance.filter((record) => record.branch === user.branch);
  }

  if (user.role === 'department_hr') {
    return attendance.filter(
      (record) => record.dept === user.departments?.[0] && record.branch === user.branch
    );
  }

  // Employee - only their own attendance
  if (user.role === 'employee') {
    return attendance.filter((record) => record.empId === user.employeeId);
  }

  return attendance;
}

// Filter leave requests based on user's role
export function filterLeaveByRole(leaves: any[], user: User | null): any[] {
  if (!user) return [];

  if (user.role === 'super_admin' || user.role === 'head_hr' || user.role === 'hr_manager') {
    return leaves;
  }

  if (user.role === 'hr_executive') {
    return leaves;
  }

  if (user.role === 'branch_hr') {
    return leaves.filter((leave) => leave.branch === user.branch);
  }

  if (user.role === 'department_hr') {
    return leaves.filter(
      (leave) => leave.department === user.departments?.[0] && leave.branch === user.branch
    );
  }

  // Employee
  if (user.role === 'employee') {
    return leaves.filter((leave) => leave.empId === user.employeeId);
  }

  return leaves;
}

// Filter penalties based on user's role
export function filterPenaltiesByRole(penalties: any[], user: User | null): any[] {
  if (!user) return [];

  if (user.role === 'super_admin' || user.role === 'head_hr' || user.role === 'hr_manager') {
    return penalties;
  }

  if (user.role === 'hr_executive') {
    return penalties;
  }

  if (user.role === 'branch_hr') {
    return penalties.filter((penalty) => penalty.branch === user.branch);
  }

  if (user.role === 'department_hr') {
    return penalties.filter(
      (penalty) => penalty.branch === user.branch && penalties.some((p: any) => p.empId === penalty.empId)
    );
  }

  // Employee
  if (user.role === 'employee') {
    return penalties.filter((penalty) => penalty.empId === user.employeeId);
  }

  return penalties;
}

// Get branches visible to user
export function getBranchesForUser(user: User | null, allBranches: string[]): string[] {
  if (!user) return [];

  if (user.role === 'super_admin' || user.role === 'head_hr' || user.role === 'hr_manager') {
    return allBranches;
  }

  if (user.role === 'branch_hr' || user.role === 'department_hr') {
    return user.branch ? [user.branch] : [];
  }

  // Employee
  return user.branch ? [user.branch] : [];
}

// Get departments visible to user
export function getDepartmentsForUser(user: User | null, allDepartments: string[]): string[] {
  if (!user) return [];

  if (user.role === 'super_admin' || user.role === 'head_hr' || user.role === 'hr_manager' || user.role === 'hr_executive') {
    return allDepartments;
  }

  if (user.role === 'branch_hr') {
    return allDepartments;
  }

  if (user.role === 'department_hr') {
    return user.departments || [];
  }

  // Employee
  return user.departments || [];
}
