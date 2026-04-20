import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import authTable from '../models/auth-model.js'

const authService = {
    login: async (email, password) => {
        const user = await authTable.findByEmail(email)

        if (!user) {
            const err = new Error('Invalid email or password')
            err.status = 401
            throw err
        }

        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            const err = new Error('Invalid email or password')
            err.status = 401
            throw err
        }

        const is_super_admin = user.department_id === null && user.role_name === 'super_admin'

        const token = jwt.sign(
            {
                user_id: user.id,
                employee_id: user.employee_id,
                role_id: user.role_id,
                is_super_admin
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        )

        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role_name,
                employee_id: user.employee_id
            }
        }
    }
}

export default authService
