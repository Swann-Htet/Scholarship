import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const fmt = d => new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

export default function Registrations({ onAuthError, flash }) {
  const [rows, setRows] = useState(null);
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1 });
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => { const t = setTimeout(() => { setQ(search); setPage(1); }, 300); return () => clearTimeout(t); }, [search]);

  const load = useCallback(() => {
    setRows(null);
    api.registrations({ search: q, status, page, limit: 20 }).then(r => { setRows(r.items); setMeta({ total: r.total, page: r.page, pages: r.pages }); }).catch(e => { if (!onAuthError(e)) flash(e.message, true); setRows([]); });
  }, [q, status, page, onAuthError, flash]);
  useEffect(load, [load]);

  const patch = async (r, p) => {
    try { const u = await api.updateRegistration(r._id, p); setRows(list => list.map(x => (x._id === r._id ? u : x))); }
    catch (e) { if (!onAuthError(e)) flash(e.message, true); }
  };
  const remove = async r => {
    if (!confirm(`Delete ${r.name} (${r.email})? This cannot be undone.`)) return;
    try { await api.deleteRegistration(r._id); flash('Deleted.'); load(); } catch (e) { if (!onAuthError(e)) flash(e.message, true); }
  };
  const exportCsv = async () => {
    try { const b = await api.exportCsv(); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'registrations.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
    catch (e) { if (!onAuthError(e)) flash(e.message, true); }
  };
  const copyEmails = async () => {
    try { const all = await api.registrations({ search: q, status, page: 1, limit: 100 }); await navigator.clipboard.writeText(all.items.map(i => i.email).join(', ')); flash(`Copied ${all.items.length} email${all.items.length === 1 ? '' : 's'}.`); }
    catch (e) { flash('Could not copy.', true); }
  };

  return (
    <div className="a-card">
      <div className="a-toolbar">
        <input type="search" placeholder="Search name, email, LINE ID or ticket" value={search} onChange={e => setSearch(e.target.value)} />
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option><option value="confirmed">Confirmed</option><option value="waitlist">Waitlist</option>
        </select>
        <button className="a-btn" onClick={copyEmails}>Copy emails</button>
        <button className="a-btn primary" onClick={exportCsv}>Export CSV</button>
      </div>
      <div className="a-table-wrap">
        <table className="a-table">
          <thead><tr><th>Name</th><th>Email</th><th>LINE ID</th><th>Status</th><th>Checked in</th><th>Registered</th><th /></tr></thead>
          <tbody>
            {rows === null && Array.from({ length: 6 }, (_, i) => <tr key={i}>{Array.from({ length: 7 }, (_, j) => <td key={j}><div className="sk" style={{ height: 14, width: j === 6 ? 30 : '80%', borderRadius: 6 }} /></td>)}</tr>)}
            {rows && rows.length === 0 && <tr><td colSpan="7" className="empty">No registrations found.</td></tr>}
            {rows && rows.map(r => (
              <tr key={r._id}>
                <td><strong>{r.name}</strong><small>{r.ticketCode}</small></td>
                <td>{r.email}</td><td>{r.lineId}</td>
                <td><button className={`pill ${r.status} btn-pill`} title="Click to switch" onClick={() => patch(r, { status: r.status === 'confirmed' ? 'waitlist' : 'confirmed' })}>{r.status}</button></td>
                <td><label className="switch"><input type="checkbox" checked={!!r.checkedIn} onChange={e => patch(r, { checkedIn: e.target.checked })} aria-label={`Checked in: ${r.name}`} /><i /></label></td>
                <td>{fmt(r.createdAt)}</td>
                <td><button className="a-icon danger" onClick={() => remove(r)} aria-label={`Delete ${r.name}`}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="a-pager">
        <span>{meta.total} registration{meta.total === 1 ? '' : 's'}</span>
        <div>
          <button className="a-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
          <span>Page {meta.page} of {meta.pages}</span>
          <button className="a-btn" disabled={page >= meta.pages} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      </div>
    </div>
  );
}
