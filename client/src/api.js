// Small fetch wrapper for the Nabta REST API.
// The website and the Android app both use it; the app is built with VITE_API_URL set to the live API.
export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');

const TOKEN_KEY = 'nabta.token';

export const tokenStore = {
  get() {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set(token) {
    try { token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
  },
};

/** Error from the API. `code` and `params` let the interface show the message in Arabic or English. */
export class ApiError extends Error {
  constructor(status, message, details, code, params) {
    super(message);
    this.status = status;
    this.details = details || {};
    this.code = code || (status === 0 ? 'offline' : 'server_error');
    this.params = params || {};
  }
}

export async function api(path, { method = 'GET', body, form, signal } = {}) {
  const headers = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      method,
      headers,
      body: form || (body !== undefined ? JSON.stringify(body) : undefined),
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(0, 'Cannot reach the Nabta server. Check your connection and try again.');
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = data?.error || {};
    if (res.status === 401 && token) window.dispatchEvent(new Event('nabta:unauthorized'));
    throw new ApiError(res.status, e.message || 'Something went wrong.', e.details, e.code, e.params);
  }
  return data;
}

/** Turns "/api/images/123" from the API into a full URL; leaves http(s) links unchanged. */
export function imageSrc(url) {
  if (!url) return '';
  return url.startsWith('/') ? `${API_URL}${url}` : url;
}
