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

// Initialize Express application
const app = express();

// Configure CORS for frontend communication
app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true
}));

// Parse JSON request bodies
app.use(express.json());

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

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ message: 'server is running' });
});

// Global error handler middleware - handles all application errors
app.use((err, req, res, next) => {
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
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
