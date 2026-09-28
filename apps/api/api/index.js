const ALLOWED_ORIGIN = 'https://frontend-2-sable.vercel.app';

let cachedApp = null;

async function getApp() {
  if (!cachedApp) {
    const mod = await import('../src/app.js');
    cachedApp = mod.default;
  }
  return cachedApp;
}

// Vercel serverless handler with explicit CORS to guarantee headers are always present
export default async function handler(req, res) {
  // Always set CORS headers — runs before any Express code
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-client-local-ip, x-client-private-ip, x-client-hostname, x-request-id, x-correlation-id'
  );

  // Short-circuit OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // Delegate everything else to Express (lazy-loaded)
  try {
    const app = await getApp();
    return app(req, res);
  } catch (err) {
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end(JSON.stringify({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: err.message } }));
    }
  }
}

