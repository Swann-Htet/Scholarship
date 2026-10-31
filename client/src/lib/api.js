const TOKEN_KEY = 'gd-admin-token';

export const getToken = () => { try { return sessionStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } };
export const setToken = t => { try { t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY); } catch { /* private mode */ } };

export class ApiError extends Error {
  constructor(message, status, data) { super(message); this.status = status; this.data = data || {}; }
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
  if (!res.ok) throw new ApiError(data?.error || `Request failed (${res.status})`, res.status, data);
  return data;
}

export const api = {
  settings: () => request('/settings'),
  capacity: () => request('/capacity'),
  seats: () => request('/seats'),
  formToken: () => request('/register/token'),
  registerStart: data => request('/register/start', { method: 'POST', body: data }),
  registerVerify: data => request('/register/verify', { method: 'POST', body: data }),
  checkinInfo: token => request('/checkin/info', { method: 'POST', body: { token } }),
  checkinScan: (token, code) => request('/checkin/scan', { method: 'POST', body: { token, code } }),
  login: (email, password) => request('/admin/login', { method: 'POST', body: { email, password } }),
  stats: () => request('/admin/stats', { auth: true }),
  registrations: params => request('/admin/registrations?' + new URLSearchParams(params), { auth: true }),
  updateRegistration: (id, patch) => request('/admin/registrations/' + id, { method: 'PATCH', body: patch, auth: true }),
  deleteRegistration: id => request('/admin/registrations/' + id, { method: 'DELETE', auth: true }),
  adminCheckin: code => request('/admin/checkin', { method: 'POST', body: { code }, auth: true }),
  checkinLinks: () => request('/admin/checkin-links', { auth: true }),
  createCheckinLink: (label, hours) => request('/admin/checkin-links', { method: 'POST', body: { label, hours }, auth: true }),
  revokeCheckinLink: id => request('/admin/checkin-links/' + id, { method: 'DELETE', auth: true }),
  admins: () => request('/admin/admins', { auth: true }),
  addAdmin: (email, password) => request('/admin/admins', { method: 'POST', body: { email, password }, auth: true }),
  setAdminPassword: (id, password) => request('/admin/admins/' + id, { method: 'PATCH', body: { password }, auth: true }),
  removeAdmin: id => request('/admin/admins/' + id, { method: 'DELETE', auth: true }),
  blocks: () => request('/admin/blocks', { auth: true }),
  unblock: id => request('/admin/blocks/' + id, { method: 'DELETE', auth: true }),
  exportCsv: () => request('/admin/registrations.csv', { auth: true, blob: true }),
  adminSettings: () => request('/admin/settings', { auth: true }),
  saveSettings: s => request('/admin/settings', { method: 'PUT', body: s, auth: true })
};
