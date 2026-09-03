const AUTH_COOKIE = "authToken";
const AUTH_LOCAL_KEY = "authToken";
const AUTH_SESSION_KEY = "authToken";
const MAX_AGE_SEC = 7 * 24 * 60 * 60;

/** Persist token with a per-tab fallback so separate portal tabs do not overwrite each other. */
export function setAuthToken(token: string) {
  document.cookie = `${AUTH_COOKIE}=${encodeURIComponent(token)}; path=/; SameSite=Lax; Max-Age=${MAX_AGE_SEC}`;
  sessionStorage.setItem(AUTH_SESSION_KEY, token);
  localStorage.removeItem(AUTH_LOCAL_KEY);
}

export function clearAuthToken() {
  document.cookie = `${AUTH_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  sessionStorage.removeItem(AUTH_SESSION_KEY);
  localStorage.removeItem(AUTH_LOCAL_KEY);
}

export function getAuthTokenFromFallback(): string | null {
  const tabToken = sessionStorage.getItem(AUTH_SESSION_KEY);
  if (tabToken) return tabToken;

  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${AUTH_COOKIE}=([^;]*)`),
  );
  if (match?.[1]) return decodeURIComponent(match[1]);
  return null;
}
