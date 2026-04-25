// EMS Backend Server - Employee Management System API
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables first before any other imports
dotenv.config();

// Import route handlers
import employeeRoutes from './src/routes/employee-info-routes.js';
import extraEmployeeRoutes from './src/routes/extra-employee-info-routes.js';
import departmentRoutes from './src/routes/department-routes.js';
import designationRoutes from './src/routes/designation-routes.js';
import employmentTypeRoutes from './src/routes/employment-type-routes.js';
import jobStatusRoutes from './src/routes/job-status-routes.js';
import jobInfoRoutes from './src/routes/job-info-routes.js';
import workModeRoutes from './src/routes/work-mode-routes.js';
import workLocationRoutes from './src/routes/work-location-routes.js';
import authRoutes from './src/routes/auth-routes.js';
import userRoutes from './src/routes/user-routes.js';
import shiftRoutes from './src/routes/shift-routes.js';
import leaveTypeRoutes from './src/routes/leave-type-routes.js';
import leavePolicyRoutes from './src/routes/leave-policy-routes.js';
import leaveBalanceRoutes from './src/routes/leave-balance-routes.js';
import attendanceRoutes from './src/routes/attendance-routes.js';
import leaveRequestRoutes from './src/routes/leave-request-routes.js';
import calendarEventRoutes from './src/routes/calendar-event-routes.js';
import notificationRoutes from './src/routes/notification-routes.js';
import dashboardSupportRoutes from './src/routes/dashboard-support-routes.js';
import dashboardMetricsRoutes from './src/routes/dashboard-metrics-routes.js';

// Initialize Express application
const app = express();

// Configure CORS for frontend communication
app.use(cors({
    origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true
}));

// Parse JSON request bodies
app.use(express.json());

// // Optional request logger for debugging noisy startup/API issues.
// // Enable with: DEBUG_HTTP=1 npm start
// if (process.env.DEBUG_HTTP === '1') {
//     app.use((req, res, next) => {
//         const start = Date.now()
//         res.on('finish', () => {
//             const ms = Date.now() - start
//             // Log only non-2xx/3xx to keep noise low in dev.
//             if (res.statusCode >= 400) {
//                 const hasAuth = typeof req.headers.authorization === 'string'
//                 console.log(`[HTTP ${res.statusCode}] ${req.method} ${req.originalUrl} (${ms}ms) auth=${hasAuth ? 'yes' : 'no'}`)
//             }
//         })
//         next()
//     })
// }

// Mount API routes
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

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ message: 'server is running' });
});

// Global error handler middleware - handles all application errors
app.use((err, req, res, next) => {
    // JSON parse errors from express.json()
    // Make this deterministic (avoid leaking parser internals / unstable messages).
    if (
        err &&
        (err.type === 'entity.parse.failed' ||
            (err instanceof SyntaxError && err.status === 400 && 'body' in err))
    ) {
        return res.status(400).json({
            error: 'Invalid request payload',
            details: 'Expected valid JSON object',
        })
    }

    // Map common Postgres errors to stable HTTP codes when controllers/services didn't.
    // This keeps behavior deterministic and prevents "duplicate" noise as 500s.
    if (err?.code === '23505' && !err.status) {
        err.status = 409
    }

    const status = err.status || 500;

    // Security: Only expose specific error messages for non-500 errors
    // Generic message for 500 Internal Server Errors to avoid leaking sensitive info
    const message = status === 500
        ? 'Internal Server Error'
        : (err.message || 'An unexpected error occurred');

    // Log the actual error for server-side debugging
    if (status === 500) {
        console.error('[Error]:', err.stack || err.message || err);
    }

    res.status(status).json({ error: message });
});

// Start server on configured port
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
