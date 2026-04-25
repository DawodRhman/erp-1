import pool from '../config/db.js'

const baseSelect = `
    SELECT
        n.*,
        creator.email AS created_by_email
    FROM notifications n
    LEFT JOIN users creator ON creator.id = n.created_by
`

const notificationModel = {
    readForScope: async ({ user_id, role }) => {
        const result = await pool.query(
            `${baseSelect}
             WHERE n.user_id = $1 OR (n.user_id IS NULL AND n.role = $2)
             ORDER BY n.created_at DESC`,
            [user_id, role]
        )
        return result.rows
    },

    countUnreadForScope: async ({ user_id, role }) => {
        const result = await pool.query(
            `SELECT COUNT(*)::int AS unread_count
             FROM notifications
             WHERE is_read = false
               AND (user_id = $1 OR (user_id IS NULL AND role = $2))`,
            [user_id, role]
        )
        return result.rows[0]?.unread_count ?? 0
    },

    readById: async (id) => {
        const result = await pool.query(`${baseSelect} WHERE n.id = $1`, [id])
        return result.rows[0] ?? null
    },

    createOne: async ({ user_id, role, type, message, created_by }) => {
        const result = await pool.query(
            `INSERT INTO notifications (user_id, role, type, message, created_by)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [user_id, role, type, message, created_by]
        )
        return notificationModel.readById(result.rows[0].id)
    },

    readUserIdsByRole: async (role) => {
        const result = await pool.query(
            `SELECT u.id
             FROM users u
             JOIN roles r ON r.id = u.role_id
             WHERE r.role_name = $1
             ORDER BY u.created_at ASC`,
            [role]
        )
        return result.rows.map((row) => row.id)
    },

    markRead: async (id) => {
        const result = await pool.query(
            `UPDATE notifications
             SET is_read = true
             WHERE id = $1
             RETURNING id`,
            [id]
        )

        if (!result.rows[0]) return null
        return notificationModel.readById(result.rows[0].id)
    },
}

export default notificationModel
