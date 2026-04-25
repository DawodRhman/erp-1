import pool from '../config/db.js'

const baseSelect = `
    SELECT
        ce.*,
        cu.email AS created_by_email,
        uu.email AS updated_by_email
    FROM calendar_events ce
    LEFT JOIN users cu ON cu.id = ce.created_by
    LEFT JOIN users uu ON uu.id = ce.updated_by
`

const calendarEventModel = {
    readByRange: async ({ from, to }) => {
        const result = await pool.query(
            `${baseSelect}
             WHERE ce.date BETWEEN $1 AND $2
             ORDER BY ce.date ASC, ce.title ASC`,
            [from, to]
        )
        return result.rows
    },

    create: async ({ type, date, title, visibility, created_by, updated_by }) => {
        const result = await pool.query(
            `INSERT INTO calendar_events (type, date, title, visibility, created_by, updated_by)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id`,
            [type, date, title, visibility, created_by, updated_by]
        )

        return calendarEventModel.readById(result.rows[0].id)
    },

    readById: async (id) => {
        const result = await pool.query(`${baseSelect} WHERE ce.id = $1`, [id])
        return result.rows[0] ?? null
    },

    update: async ({ id, type, date, title, visibility, updated_by }) => {
        const fields = []
        const values = [id]
        let idx = 2

        if (type !== undefined) { fields.push(`type = $${idx++}`); values.push(type) }
        if (date !== undefined) { fields.push(`date = $${idx++}`); values.push(date) }
        if (title !== undefined) { fields.push(`title = $${idx++}`); values.push(title) }
        if (visibility !== undefined) { fields.push(`visibility = $${idx++}`); values.push(visibility) }
        fields.push(`updated_by = $${idx++}`)
        values.push(updated_by)

        const result = await pool.query(
            `UPDATE calendar_events
             SET ${fields.join(', ')}
             WHERE id = $1
             RETURNING id`,
            values
        )

        if (!result.rows[0]) return null
        return calendarEventModel.readById(result.rows[0].id)
    },
}

export default calendarEventModel
