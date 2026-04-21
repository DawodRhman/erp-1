// Permission checking middleware - validates user has required permission
import pool from '../config/db.js'

// Factory function that creates middleware for specific permission key
export const requirePermission = (key) => async (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required.' })
    }

    // Super admin bypass - has all permissions
    if (req.user.is_super_admin) return next()

    // Fetch permissions from database if not cached on request
    if (!req.permissions) {
        const result = await pool.query(
            `SELECT p.permission_key
             FROM permissions p
             JOIN role_permissions rp ON rp.permission_id = p.id
             WHERE rp.role_id = $1`,
            [req.user.role_id]
        )
        req.permissions = new Set(result.rows.map(r => r.permission_key))
    }

    // Check if user has required permission
    if (!req.permissions.has(key)) {
        return res.status(403).json({ error: 'Insufficient permissions.' })
    }

    next()
}
