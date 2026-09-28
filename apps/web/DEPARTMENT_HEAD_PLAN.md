# Department Head Role Plan

## Goal

Add a department-head role that can supervise employees in their own department and assigned location without receiving HR-only powers such as termination, firing, salary control, account creation, or unrestricted configuration access.

## Enterprise Approach

1. Backend role and permissions
   - Add a `department_head` role.
   - Add permissions for scoped reads: employees, attendance, leave requests, and penalties.
   - Add permission for penalty proposal only, not penalty approval.

2. Scope model
   - Store the department head's `department_id`.
   - Store an optional `work_location_id`.
   - Location should be applied by default. The department head should not be able to switch to another location unless a future permission explicitly allows it.

3. Backend enforcement
   - All department-head endpoints must apply server-side filters.
   - The frontend must never be the only place where department/location scoping is enforced.
   - Employee detail, attendance, leave, and penalty APIs should reject access outside the user's scope.

4. Frontend behavior
   - Sidebar should show department dashboard, employees, attendance, leave, penalty proposal, directory, calendar, announcements, and self-service.
   - Employee detail should show the same HR-grade data but only for employees in scope.
   - Penalty action should open from employee profile and submit to the existing Head Office HR review workflow.

## Standard ERP Assessment

This is standard for enterprise ERP systems. The important rule is separation of duties: department heads supervise and propose actions, while HR owns employment changes, salary, termination, and final policy enforcement.

