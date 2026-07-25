import { randomUUID } from 'node:crypto';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';

import authRoutes from './modules/auth/auth.routes.js';
import attendanceRoutes from './modules/attendance/attendance.routes.js';
import leaveRequestRoutes from './modules/leave/leave.routes.js';
import calendarEventRoutes from './modules/calendar-events/calendar-events.routes.js';
import announcementRoutes from './modules/announcements/announcements.routes.js';
import notificationRoutes from './modules/notifications/notifications.routes.js';
import dashboardMetricsRoutes from './modules/dashboard/dashboard.routes.js';
import auditRoutes from './modules/audit/audit.routes.js';
import accountsRoutes from './modules/accounts/accounts.routes.js';
import { errorHandler } from './utils/errors.js';
import employeesModuleRoutes from './modules/employees/employees.routes.js';
import configModuleRoutes from './modules/config/config.routes.js';
import penaltiesModuleRoutes from './modules/penalties/penalties.routes.js';
import directoryModuleRoutes from './modules/directory/directory.routes.js';
import inventoryRoutes from './modules/inventory/inventory.routes.js';
import matrixRoutes from './modules/matrix/matrix.routes.js';
import pool from './config/db.js';
import { logger } from './utils/logger.js';

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : null;

const app = express();

app.set('trust proxy', 1);

// 1. CORS MUST BE FIRST SO ALL PREFLIGHT OPTIONS & ROUTE RESPONSES GAIN CORS HEADERS
const corsOptions = {
  origin: true, // Mirror incoming origin (allows credentials to work with any Vercel domain or localhost)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-client-local-ip',
    'x-client-private-ip',
    'x-client-hostname',
    'x-request-id',
    'x-correlation-id',
  ],
  exposedHeaders: ['x-request-id'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// Explicit preflight handler — runs BEFORE anything else
// Express 5 requires named wildcard: {*path} instead of bare *
app.options('/{*path}', cors(corsOptions));
app.use(cors(corsOptions));

// Security & Audit headers — disable cross-origin blocking that conflicts with CORS
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());

// Request ID + structured logging
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || req.headers['x-correlation-id'] || randomUUID();
  res.setHeader('x-request-id', req.id);
  logger.info({ requestId: req.id, method: req.method, url: req.url }, 'incoming request');
  next();
});

app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

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

app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leave-requests', leaveRequestRoutes);
app.use('/api/calendar-events', calendarEventRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardMetricsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/accounts', accountsRoutes);
app.use('/api/employees', employeesModuleRoutes);
app.use('/api/config', configModuleRoutes);
app.use('/api', penaltiesModuleRoutes);
app.use('/api/directory', directoryModuleRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/matrix', matrixRoutes);

app.use(errorHandler);

export default app;
