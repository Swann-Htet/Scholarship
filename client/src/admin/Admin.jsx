import React, { useCallback, useEffect, useState } from 'react';
import '../styles/admin.css';
import { api, getToken, setToken } from '../lib/api.js';
import Dashboard from './Dashboard.jsx';
import Registrations from './Registrations.jsx';
import { CheckinTab, AdminsTab, SecurityTab } from './ExtraTabs.jsx';
import { DesignTab, AnimationTab, ContentTab } from './SettingsTabs.jsx';
import { defaultSettings } from '../../../shared/defaultSettings.js';

const TABS = [
  ['dashboard', 'Dashboard', 'M4 13h6V4H4zM14 20h6V4h-6zM4 20h6v-3H4z'],
  ['registrations', 'Registrations', 'M16 11a4 4 0 1 0-8 0M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6'],
  ['checkin', 'Check-in', 'M4 7V4h3M20 7V4h-3M4 17v3h3M20 17v3h-3M8 12h8'],
  ['admins', 'Admins', 'M12 3l8 3v6c0 4.500-3.400 8-8 9-4.600-1-8-4.500-8-9V6zM9 12l2 2 4-4'],
  ['security', 'Security', 'M12 3l9 16H3zM12 10v4M12 17v.500'],
  ['design', 'Design', 'M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.4-2.2-.6-1.2.2-2.3 1.5-2.3H17a4 4 0 0 0 4-4c0-5-4-9.5-9-9.5z'],
  ['animation', 'Animation', 'M5 3l14 9-14 9z'],
  ['content', 'Content', 'M5 4h14M5 9h14M5 14h9M5 19h6']
];

function Login({ onDone }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async e => {
    e.preventDefault(); setBusy(true); setErr('');
    try { const { token } = await api.login(email, password); setToken(token); onDone(); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <div className="login-wrap">
      <form className="login" onSubmit={submit}>
        <div className="brand"><svg viewBox="0 0 40 28" width="40" height="28"><circle cx="14" cy="14" r="11" fill="#FFB020" fillOpacity=".8" /><circle cx="26" cy="14" r="11" fill="#2DD4BF" fillOpacity=".7" /></svg><span>Global Dialogues</span></div>
        <h1>Admin sign in</h1>
        <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" required autoFocus /></label>
        <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required /></label>
        {err && <p className="a-err" role="alert">{err}</p>}
        <button className="a-btn primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <a className="a-link" href="/">Back to the website</a>
      </form>
    </div>
  );
}

export default function Admin() {
  const [authed, setAuthed] = useState(!!getToken());
  const [tab, setTab] = useState('dashboard');
  const [settings, setSettings] = useState(null); // last saved
  const [draft, setDraft] = useState(null); // being edited
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => { document.body.classList.add('admin-body'); document.title = 'Admin · Global Dialogues'; return () => document.body.classList.remove('admin-body'); }, []);

  const flash = useCallback((text, bad) => { setToast({ text, bad }); setTimeout(() => setToast(null), 3200); }, []);
  const logout = useCallback(() => { setToken(''); setAuthed(false); setSettings(null); setDraft(null); }, []);
  const onAuthError = useCallback(e => { if (e.status === 401) { logout(); flash('Please sign in again.', true); return true; } return false; }, [logout, flash]);

  useEffect(() => {
    if (!authed) return;
    api.adminSettings().then(s => { setSettings(s); setDraft(s); }).catch(e => { if (!onAuthError(e)) flash(e.message, true); });
  }, [authed, onAuthError, flash]);

  const dirty = draft && JSON.stringify(draft) !== JSON.stringify(settings);
  const save = async () => {
    setSaving(true);
    try { const s = await api.saveSettings(draft); setSettings(s); setDraft(s); setPreviewKey(k => k + 1); flash('Saved. Your website is updated.'); }
    catch (e) { if (!onAuthError(e)) flash(e.message, true); } finally { setSaving(false); }
  };

  if (!authed) return <Login onDone={() => setAuthed(true)} />;

  const settingsTab = tab === 'design' || tab === 'animation' || tab === 'content';
  return (
    <div className="admin">
      <aside className="a-side">
        <div className="brand"><svg viewBox="0 0 40 28" width="36" height="26"><circle cx="14" cy="14" r="11" fill="#FFB020" fillOpacity=".85" /><circle cx="26" cy="14" r="11" fill="#2DD4BF" fillOpacity=".75" /></svg><span>Admin</span></div>
        <nav>
          {TABS.map(([id, label, d]) => (
            <button key={id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="a-side-foot"><a href="/" target="_blank" rel="noreferrer">View website ↗</a><button onClick={logout}>Sign out</button></div>
      </aside>

      <main className="a-main">
        <header className="a-top">
          <h1>{TABS.find(t => t[0] === tab)[1]}</h1>
          {settingsTab && (
            <div className="a-actions">
              <button className="a-btn" onClick={() => { if (confirm('Reset every design and content setting to the defaults? (Not saved until you press Save.)')) setDraft(JSON.parse(JSON.stringify(defaultSettings))); }}>Reset to defaults</button>
              <button className="a-btn primary" onClick={save} disabled={!dirty || saving}>{saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}</button>
            </div>
          )}
        </header>

        {tab === 'dashboard' && <Dashboard onAuthError={onAuthError} />}
        {tab === 'registrations' && <Registrations onAuthError={onAuthError} flash={flash} />}
        {tab === 'checkin' && <CheckinTab onAuthError={onAuthError} flash={flash} />}
        {tab === 'admins' && <AdminsTab onAuthError={onAuthError} flash={flash} />}
        {tab === 'security' && <SecurityTab onAuthError={onAuthError} flash={flash} />}
        {settingsTab && !draft && <div className="a-card"><div className="sk sk-line" style={{ width: '30%' }} /><div className="sk sk-line" style={{ width: '80%', marginTop: 14 }} /><div className="sk sk-line" style={{ width: '65%', marginTop: 14 }} /></div>}
        {settingsTab && draft && (
          <div className="a-split">
            <div className="a-form">
              {tab === 'design' && <DesignTab draft={draft} setDraft={setDraft} />}
              {tab === 'animation' && <AnimationTab draft={draft} setDraft={setDraft} />}
              {tab === 'content' && <ContentTab draft={draft} setDraft={setDraft} />}
            </div>
            <aside className="a-preview">
              <div className="a-preview-head"><span>Live website</span><a href="/" target="_blank" rel="noreferrer">Open ↗</a></div>
              <iframe key={previewKey} title="Website preview" src="/" />
              <p>The preview shows the last saved version. Press Save changes to publish edits.</p>
            </aside>
          </div>
        )}
      </main>
      {toast && <div className={`a-toast${toast.bad ? ' bad' : ''}`} role="status">{toast.text}</div>}
    </div>
  );
}
