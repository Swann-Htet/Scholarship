import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import ScanPanel from '../lib/ScanPanel.jsx';

const fmt = d => new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
const Sk = ({ w = '100%', h = 14 }) => <div className="sk" style={{ width: w, height: h, borderRadius: 8, margin: '6px 0' }} />;

/* ---------------- Check-in: scanner + shareable volunteer links ---------------- */
function LinkQr({ url }) {
  const ref = useRef(null);
  useEffect(() => { import('qrcode').then(({ default: QR }) => ref.current && QR.toCanvas(ref.current, url, { width: 150, margin: 1 })); }, [url]);
  return <canvas ref={ref} width="150" height="150" />;
}

export function CheckinTab({ onAuthError, flash }) {
  const [links, setLinks] = useState(null);
  const [label, setLabel] = useState('Gate 1');
  const [hours, setHours] = useState(12);
  const [fresh, setFresh] = useState(null); // the newly created link (the secret is shown only once)
  const load = useCallback(() => api.checkinLinks().then(r => setLinks(r.items)).catch(e => { if (!onAuthError(e)) flash(e.message, true); }), [onAuthError, flash]);
  useEffect(() => { load(); }, [load]);

  const create = async e => {
    e.preventDefault();
    try { const r = await api.createCheckinLink(label, hours); setFresh({ ...r, url: `${location.origin}/checkin/${r.token}` }); load(); }
    catch (err) { if (!onAuthError(err)) flash(err.message, true); }
  };
  const revoke = async l => { if (!confirm(`Switch off the link “${l.label}”? Anyone using it will stop working.`)) return; try { await api.revokeCheckinLink(l._id); flash('Link switched off.'); load(); } catch (err) { if (!onAuthError(err)) flash(err.message, true); } };
  const copy = async text => { try { await navigator.clipboard.writeText(text); flash('Link copied.'); } catch { flash('Could not copy. Select and copy it by hand.', true); } };
  const state = l => (l.revoked ? 'off' : new Date(l.expiresAt) < new Date() ? 'expired' : 'active');

  return (
    <div className="a-split2">
      <div className="a-card"><ScanPanel title="Scan a ticket here" submit={code => api.adminCheckin(code)} /></div>
      <div>
        <div className="a-card">
          <h2>New check-in link</h2>
          <p className="muted">Give volunteers a link instead of an admin login. It opens a scanner on their phone, expires automatically and can be switched off any time.</p>
          <form className="a-inline" onSubmit={create}>
            <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Label, e.g. Gate 1" maxLength={60} aria-label="Label" />
            <select value={hours} onChange={e => setHours(Number(e.target.value))} aria-label="Valid for">
              <option value={4}>Valid 4 hours</option><option value={12}>Valid 12 hours</option><option value={24}>Valid 24 hours</option><option value={72}>Valid 3 days</option><option value={168}>Valid 7 days</option>
            </select>
            <button className="a-btn primary">Create link</button>
          </form>
          {fresh && (
            <div className="a-fresh">
              <div><b>Copy it now.</b> For safety the secret is shown only once.<code>{fresh.url}</code>
                <button className="a-btn" onClick={() => copy(fresh.url)}>Copy link</button></div>
              <LinkQr url={fresh.url} />
            </div>
          )}
        </div>
        <div className="a-card">
          <h2>Links</h2>
          {links === null && <><Sk /><Sk w="70%" /></>}
          {links && links.length === 0 && <p className="muted">No links yet.</p>}
          {links && links.map(l => (
            <div className="a-link-row" key={l._id}>
              <div><strong>{l.label}</strong><span>{state(l) === 'active' ? `Expires ${fmt(l.expiresAt)}` : state(l) === 'off' ? 'Switched off' : 'Expired'} · {l.uses} check-ins{l.createdBy ? ` · by ${l.createdBy}` : ''}</span></div>
              <em className={`pill ${state(l)}`}>{state(l)}</em>
              {state(l) === 'active' && <button className="a-btn" onClick={() => revoke(l)}>Switch off</button>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Admins ---------------- */
const strongPassword = () => { const a = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'; return Array.from(crypto.getRandomValues(new Uint8Array(14)), b => a[b % a.length]).join('') + '#7'; };

export function AdminsTab({ onAuthError, flash }) {
  const [data, setData] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [shown, setShown] = useState(null);
  const load = useCallback(() => api.admins().then(setData).catch(e => { if (!onAuthError(e)) flash(e.message, true); }), [onAuthError, flash]);
  useEffect(() => { load(); }, [load]);

  const add = async e => {
    e.preventDefault(); setBusy(true);
    try { await api.addAdmin(email, password); setShown({ email, password }); setEmail(''); setPassword(''); flash('Admin added.'); load(); }
    catch (err) { if (!onAuthError(err)) flash(err.message, true); } finally { setBusy(false); }
  };
  const reset = async a => {
    const pw = prompt(`New password for ${a.email} (at least 10 characters):`, strongPassword());
    if (!pw) return;
    try { await api.setAdminPassword(a._id, pw); setShown({ email: a.email, password: pw }); flash('Password changed.'); } catch (err) { if (!onAuthError(err)) flash(err.message, true); }
  };
  const remove = async a => { if (!confirm(`Remove ${a.email}? They will no longer be able to sign in.`)) return; try { await api.removeAdmin(a._id); flash('Admin removed.'); load(); } catch (err) { if (!onAuthError(err)) flash(err.message, true); } };

  return (
    <>
      <div className="a-card">
        <h2>Add an admin</h2>
        <p className="muted">Admins can do everything here except change the owner. Share the password privately, and ask them to keep it safe.</p>
        <form className="a-inline" onSubmit={add}>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required aria-label="Email" />
          <input type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (10+ characters)" minLength={10} required aria-label="Password" />
          <button type="button" className="a-btn" onClick={() => setPassword(strongPassword())}>Generate</button>
          <button className="a-btn primary" disabled={busy}>Add admin</button>
        </form>
        {shown && <p className="a-fresh-pw">Give this to <b>{shown.email}</b>: <code>{shown.password}</code> (shown only now)</p>}
      </div>
      <div className="a-card">
        <h2>Admins</h2>
        {!data && <><Sk /><Sk w="70%" /></>}
        {data && (
          <ul className="a-list">
            <li><div><strong>{data.owner.email}</strong><span>Owner (set in the server settings)</span></div><em className="pill confirmed">owner</em></li>
            {data.admins.map(a => (
              <li key={a._id}>
                <div><strong>{a.email}</strong><span>Added {fmt(a.createdAt)}{a.createdBy ? ` by ${a.createdBy}` : ''}</span></div>
                <span className="a-rowtools"><button className="a-btn" onClick={() => reset(a)}>New password</button>{a.email !== data.me && <button className="a-btn danger" onClick={() => remove(a)}>Remove</button>}</span>
              </li>
            ))}
            {data.admins.length === 0 && <li><span className="muted">No other admins yet.</span></li>}
          </ul>
        )}
      </div>
    </>
  );
}

/* ---------------- Frozen visitors ---------------- */
export function SecurityTab({ onAuthError, flash }) {
  const [items, setItems] = useState(null);
  const load = useCallback(() => api.blocks().then(r => setItems(r.items)).catch(e => { if (!onAuthError(e)) flash(e.message, true); }), [onAuthError, flash]);
  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, [load]);
  const free = async b => { try { await api.unblock(b._id); flash('Unfrozen.'); load(); } catch (err) { if (!onAuthError(err)) flash(err.message, true); } };
  return (
    <>
      <div className="a-card">
        <h2>How protection works</h2>
        <ul className="a-rules">
          <li>A filled hidden field, spam links in the form, or a form sent without a valid timed token freezes that IP address for <b>15 minutes</b>.</li>
          <li>5 wrong email codes, too many codes requested, or too many login attempts freeze it too.</li>
          <li>Wrong email domains only add warnings. Many students share campus Wi-Fi, so these need many attempts before a freeze.</li>
          <li>The visitor sees a warning that their IP address and browser details were logged. We do <b>not</b> collect GPS location.</li>
        </ul>
      </div>
      <div className="a-card">
        <h2>Frozen right now</h2>
        {items === null && <><Sk /><Sk w="70%" /></>}
        {items && items.length === 0 && <p className="muted">Nobody is frozen.</p>}
        {items && items.length > 0 && (
          <div className="a-table-wrap"><table className="a-table">
            <thead><tr><th>IP address</th><th>Reason</th><th>Until</th><th>Times</th><th>Browser</th><th /></tr></thead>
            <tbody>{items.map(b => (
              <tr key={b._id}><td><code>{b.ip}</code></td><td>{b.reason}</td><td>{fmt(b.until)}</td><td>{b.strikes}</td><td className="ua">{b.userAgent}</td><td><button className="a-btn" onClick={() => free(b)}>Unfreeze</button></td></tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </>
  );
}
