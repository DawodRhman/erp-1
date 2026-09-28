export function sendSuccess(res, data, statusCode = 200) {
  if (res.req?.headers?.origin) {
    res.setHeader('Access-Control-Allow-Origin', res.req.headers.origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  return res.status(statusCode).json({
    success: true,
    data,
  });
}

export function sendError(res, code, message, statusCode) {
  if (res.req?.headers?.origin) {
    res.setHeader('Access-Control-Allow-Origin', res.req.headers.origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
    },
  });
}
