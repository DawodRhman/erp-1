export class AppError extends Error {
  constructor(statusCode, code, message, details) {
    if (typeof statusCode === 'string' && typeof code === 'string' && typeof message === 'number') {
      const tempCode = statusCode;
      const tempMsg = code;
      statusCode = message;
      code = tempCode;
      message = tempMsg;
    }
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function errorHandler(err, req, res, next) {
  if (req.headers?.origin) {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, x-client-local-ip, x-client-private-ip, x-client-hostname, x-request-id, x-correlation-id'
    );
  }

  let statusCode = 500;
  let code = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected error occurred.';
  let details = undefined;

  if (err instanceof AppError) {
    const statusNum = parseInt(err.statusCode, 10);
    statusCode = !isNaN(statusNum) && statusNum >= 100 && statusNum < 600 ? statusNum : 500;
    code = typeof err.code === 'string' ? err.code : 'ERROR';
    message = err.message || 'Error';
    details = err.details;
  } else if (err.status || err.statusCode) {
    const statusNum = parseInt(err.status || err.statusCode, 10);
    if (!isNaN(statusNum) && statusNum >= 100 && statusNum < 600) {
      statusCode = statusNum;
    }
  }

  if (statusCode === 500) {
    console.error('[UNHANDLED ERROR]', err);
  }

  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  });
}
