import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import authRoutes from './modules/auth/auth.routes.js';
import attendanceRoutes from './modules/attendance/attendance.routes.js';
import leaveRequestRoutes from './modules/leave/leave.routes.js';
import calendarEventRoutes from './modules/calendar-events/calendar-events.routes.js';
import notificationRoutes from './modules/notifications/notifications.routes.js';
import dashboardMetricsRoutes from './modules/dashboard/dashboard.routes.js';
import { errorHandler } from './utils/errors.js';
import employeesModuleRoutes from './modules/employees/employees.routes.js';
import configModuleRoutes from './modules/config/config.routes.js';
import penaltiesModuleRoutes from './modules/penalties/penalties.routes.js';
import directoryModuleRoutes from './modules/directory/directory.routes.js';
import pool from './config/db.js';

const app = express();

const debugMiddleware = (req, res, next) => {
	console.log('[DEBUG] Request:', req.method, req.url, 'cookies:', Object.keys(req.cookies || {}), 'auth:', req.headers.authorization ? 'present' : 'none');
	next();
};

app.use(debugMiddleware);

app.use(
	cors({
		origin: function (origin, callback) {
			// In development, we allow all origins and echo them back
			// to support 'credentials: true' which doesn't allow wildcards.
			callback(null, true);
		},
		credentials: true,
	})
);
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leave-requests', leaveRequestRoutes);
app.use('/api/calendar-events', calendarEventRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardMetricsRoutes);
app.use('/api/employees', employeesModuleRoutes);
app.use('/api/config', configModuleRoutes);
app.use('/api', penaltiesModuleRoutes);
app.use('/api/directory', directoryModuleRoutes);

app.get('/', (req, res) => {
	res.status(200).json({ success: true, data: { message: 'server is running' } });
});

app.get('/api/health/db', async (req, res, next) => {
	try {
		const result = await pool.query('SELECT current_database() AS name, NOW() AS server_time');
		const row = result.rows[0] || {};
		res.status(200).json({
			success: true,
			data: {
				database: row.name || null,
				server_time: row.server_time || null,
			},
		});
	} catch (error) {
		next(error);
	}
});

app.use(errorHandler);

export default app;