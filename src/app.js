import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import employeeRoutes from './routes/employee-info-routes.js';
import extraEmployeeRoutes from './routes/extra-employee-info-routes.js';
import departmentRoutes from './routes/department-routes.js';
import designationRoutes from './routes/designation-routes.js';
import employmentTypeRoutes from './routes/employment-type-routes.js';
import jobStatusRoutes from './routes/job-status-routes.js';
import jobInfoRoutes from './routes/job-info-routes.js';
import workModeRoutes from './routes/work-mode-routes.js';
import workLocationRoutes from './routes/work-location-routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './routes/user-routes.js';
import shiftRoutes from './routes/shift-routes.js';
import leaveTypeRoutes from './routes/leave-type-routes.js';
import leavePolicyRoutes from './routes/leave-policy-routes.js';
import leaveBalanceRoutes from './routes/leave-balance-routes.js';
import attendanceRoutes from './modules/attendance/attendance.routes.js';
import leaveRequestRoutes from './modules/leave/leave.routes.js';
import calendarEventRoutes from './modules/calendar-events/calendar-events.routes.js';
import notificationRoutes from './modules/notifications/notifications.routes.js';
import dashboardSupportRoutes from './routes/dashboard-support-routes.js';
import dashboardMetricsRoutes from './modules/dashboard/dashboard.routes.js';
import { errorHandler } from './utils/errors.js';
import employeesModuleRoutes from './modules/employees/employees.routes.js';
import configModuleRoutes from './modules/config/config.routes.js';
import penaltiesModuleRoutes from './modules/penalties/penalties.routes.js';
import directoryModuleRoutes from './modules/directory/directory.routes.js';

const app = express();

const debugMiddleware = (req, res, next) => {
    console.log('[DEBUG] Request:', req.method, req.url, 'cookies:', Object.keys(req.cookies || {}), 'auth:', req.headers.authorization ? 'present' : 'none');
    next();
};

app.use(debugMiddleware);

app.use(
	cors({
		origin: process.env.CLIENT_URL || 'http://localhost:3000',
		credentials: true,
	})
);
app.use(express.json());
app.use(cookieParser());

app.use('/api', employeeRoutes);
app.use('/api', extraEmployeeRoutes);
app.use('/api', departmentRoutes);
app.use('/api/designations', designationRoutes);
app.use('/api', employmentTypeRoutes);
app.use('/api', jobStatusRoutes);
app.use('/api', jobInfoRoutes);
app.use('/api', workModeRoutes);
app.use('/api', workLocationRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/leave-types', leaveTypeRoutes);
app.use('/api/leave-policies', leavePolicyRoutes);
app.use('/api/leave-balances', leaveBalanceRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leave-requests', leaveRequestRoutes);
app.use('/api/calendar-events', calendarEventRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api', dashboardSupportRoutes);
app.use('/api/dashboard', dashboardMetricsRoutes);
app.use('/api/employees', employeesModuleRoutes);
app.use('/api/config', configModuleRoutes);
app.use('/api', penaltiesModuleRoutes);
app.use('/api/directory', directoryModuleRoutes);

app.get('/', (req, res) => {
	res.status(200).json({ success: true, data: { message: 'server is running' } });
});

app.use(errorHandler);

export default app;