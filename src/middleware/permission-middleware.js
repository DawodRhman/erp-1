import pool from '../config/db.js'

export const requirePermission = (key) => async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required.' })
    }

    if (req.user.is_super_admin) return next()

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

    if (!req.permissions.has(key)) {
        return res.status(403).json({ error: 'Insufficient permissions.' })
    }

    next()
}
