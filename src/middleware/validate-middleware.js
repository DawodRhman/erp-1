export const validate = (schema) => {
    const middleware = (req, res, next) => {
        const result = schema.safeParse(req.body)
        if (!result.success) {
            return res.status(422).json({
                error: 'Validation failed',
                issues: result.error.issues.map(i => ({
                    field: i.path.join('.'),
                    message: i.message
                }))
            })
        }
        req.body = result.data
        next()
    }

    // Expose metadata so security/audit scripts can verify middleware order.
    middleware.__validate = true
    return middleware
}
