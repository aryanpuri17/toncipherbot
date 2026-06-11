// Wrapper around fetch for admin API calls.
// Attaches the X-Admin-Key header when a key is stored (tc_admin_key),
// so the backend ADMIN_SECRET check passes once configured.

export function getAdminKey(): string {
  try { return localStorage.getItem('tc_admin_key') ?? ''; } catch { return ''; }
}

export function setAdminKey(key: string): void {
  try {
    if (key) localStorage.setItem('tc_admin_key', key);
    else localStorage.removeItem('tc_admin_key');
  } catch { /* noop */ }
}

export function adminFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const key = getAdminKey();
  const headers = new Headers(init.headers);
  if (key) headers.set('X-Admin-Key', key);
  return fetch(url, { ...init, headers });
}
