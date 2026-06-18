// Wrapper around fetch for admin API calls.
// Attaches the X-Admin-Key header when a key is stored (tc_admin_key),
// so the backend ADMIN_SECRET check passes once configured.
//
// Key is stored in BOTH localStorage and a long-lived cookie so it survives
// Telegram WebView clearing localStorage after ~15 min idle.

export function getAdminKey(): string {
  try {
    const local = localStorage.getItem('tc_admin_key');
    if (local) return local;
    const match = document.cookie.match(/(?:^|;\s*)tc_admin_key=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : '';
  } catch { return ''; }
}

export function setAdminKey(key: string): void {
  try {
    if (key) {
      localStorage.setItem('tc_admin_key', key);
      document.cookie = `tc_admin_key=${encodeURIComponent(key)};max-age=31536000;path=/;SameSite=Strict`;
    } else {
      localStorage.removeItem('tc_admin_key');
      document.cookie = 'tc_admin_key=;max-age=0;path=/';
    }
  } catch { /* noop */ }
}

export function adminFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const key = getAdminKey();
  const headers = new Headers(init.headers);
  if (key) headers.set('X-Admin-Key', key);
  return fetch(url, { ...init, headers });
}
