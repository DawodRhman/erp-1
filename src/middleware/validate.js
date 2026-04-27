import { sendError } from '../utils/respond.js';

export function validate(zodSchema) {
  return (req, res, next) => {
    const result = zodSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed.',
          details: result.error.issues,
        },
      });
    }

    req.body = result.data;
    return next();
  };
}
