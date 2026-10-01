export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  const isLocal =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  if (isLocal && envUrl) {
    return envUrl;
  }

  if (isLocal) {
    // Keep local requests on the current origin so Vite can route them to the
    // backend selected by VITE_DEV_API_PROXY. This prevents a stale service on
    // port 3001 from silently serving a different API build.
    return '/api';
  }

  // When deployed on Vercel / Cloud Host: Fallback to deployed production API
  if (!envUrl || envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
    return 'https://ems-backend-api-hazel.vercel.app/api';
  }

  return envUrl;
}
