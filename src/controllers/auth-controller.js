import authService from '../services/auth-service.js'

const authController = {
    login: async (req, res, next) => {
        try {
            const { email, password } = req.body

            if (!email || !password) {
                return res.status(400).json({ error: 'Email and password are required.' })
            }

            const data = await authService.login(email, password)
            return res.status(200).json({ token: data.token, user: data.user })
        } catch (err) {
            return next(err)
        }
    }
}

export default authController
