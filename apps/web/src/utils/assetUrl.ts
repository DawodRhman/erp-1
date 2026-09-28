import { getApiBaseUrl } from '../config/apiConfig';

export function resolveApiAssetUrl(value?: string | null): string {
  const path = String(value || '').trim();
  if (!path || /^(?:https?:|data:|blob:)/i.test(path)) return path;

  const apiBase = getApiBaseUrl().replace(/\/$/, '');
  if (path.startsWith('/api/')) return `${apiBase}${path.slice(4)}`;
  if (path.startsWith('/')) {
    try {
      return `${new URL(apiBase).origin}${path}`;
    } catch {
      return path;
    }
  }
  return `${apiBase}/${path}`;
}
