const TOKEN_KEY = 'gd-admin-token';

export const getToken = () => { try { return sessionStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } };
export const setToken = t => { try { t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY); } catch { /* private mode */ } };

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

async function request(path, { method = 'GET', body, auth = false, blob = false } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) headers.Authorization = 'Bearer ' + getToken();
  let res;
  try {
    res = await fetch('/api' + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError('Could not reach the server. Check your connection.', 0);
  }
  if (blob && res.ok) return res.blob();
  let data = null;
  try { data = await res.json(); } catch { /* not json */ }
  if (!res.ok) throw new ApiError(data?.error || `Request failed (${res.status})`, res.status);
  return data;
}

export const api = {
  settings: () => request('/settings'),
  capacity: () => request('/capacity'),
  register: data => request('/register', { method: 'POST', body: data }),
  login: (email, password) => request('/admin/login', { method: 'POST', body: { email, password } }),
  stats: () => request('/admin/stats', { auth: true }),
  registrations: params => request('/admin/registrations?' + new URLSearchParams(params), { auth: true }),
  updateRegistration: (id, patch) => request('/admin/registrations/' + id, { method: 'PATCH', body: patch, auth: true }),
  deleteRegistration: id => request('/admin/registrations/' + id, { method: 'DELETE', auth: true }),
  exportCsv: () => request('/admin/registrations.csv', { auth: true, blob: true }),
  adminSettings: () => request('/admin/settings', { auth: true }),
  saveSettings: s => request('/admin/settings', { method: 'PUT', body: s, auth: true })
};
