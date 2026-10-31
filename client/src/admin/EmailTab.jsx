import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { DEFAULT_EMAIL, PLACEHOLDERS, SAMPLE_VARS, renderHtml, renderText, stripUnsafe } from '../../../shared/emailTemplate.js';

const NAMES = { otp: 'Verification code email', ticket: 'Ticket email' };
const clone = o => JSON.parse(JSON.stringify(o));

export default function EmailTab({ draft, setDraft, flash, onAuthError }) {
  const [which, setWhich] = useState('otp');
  const [width, setWidth] = useState(600);
  const [to, setTo] = useState('');
  const [sending, setSending] = useState(false);
  const [qr, setQr] = useState('');
  const area = useRef(null);
  const t = draft.email[which];
  const set = patch => setDraft(d => { const n = clone(d); n.email[which] = { ...n.email[which], ...patch }; return n; });

  useEffect(() => { import('qrcode').then(({ default: QR }) => QR.toDataURL(SAMPLE_VARS.ticketCode, { width: 260, margin: 1 }).then(setQr)); }, []);

  const vars = useMemo(() => {
    const e = draft.event, logoId = draft.branding.logoId;
    return {
      ...SAMPLE_VARS, eventTitle: e.title, date: e.dateLabel, time: `${e.startTime} to ${e.endTime}`, venue: e.venue, campus: e.campus, accent1: draft.theme.accent1, accent2: draft.theme.accent2, siteUrl: location.origin,
      logo: logoId ? `<img src="/api/asset/${logoId}" alt="" height="40" style="display:block;height:40px;width:auto;border:0">` : '',
      qr: qr ? `<img src="${qr}" alt="QR" width="170" height="170" style="display:block;width:170px;height:170px;border:0">` : '',
      seatLine: `Seat <b>${SAMPLE_VARS.seat}</b><br>`
    };
  }, [draft.event, draft.branding.logoId, draft.theme.accent1, draft.theme.accent2, qr]);

  const preview = useMemo(() => renderHtml(stripUnsafe(t.html), vars), [t.html, vars]);
  const subject = renderText(t.subject, vars);

  const insert = key => {
    const el = area.current, token = `{{${key}}}`;
    if (!el) { set({ html: t.html + token }); return; }
    const a = el.selectionStart, b = el.selectionEnd;
    set({ html: t.html.slice(0, a) + token + t.html.slice(b) });
    requestAnimationFrame(() => { el.focus(); el.selectionStart = el.selectionEnd = a + token.length; });
  };

  const send = async () => {
    setSending(true);
    try { const r = await api.testEmail({ to, which, subject: t.subject, html: t.html }); flash(`Test email sent: “${r.subject}”`); }
    catch (e) { if (!onAuthError(e)) flash(e.message, true); } finally { setSending(false); }
  };

  return (
    <div className="a-split">
      <div className="a-form">
        <div className="a-card">
          <div className="seg wide">{Object.keys(NAMES).map(k => <button key={k} type="button" className={which === k ? 'on' : ''} onClick={() => setWhich(k)}>{NAMES[k]}</button>)}</div>
          <p className="muted" style={{ marginTop: 12 }}>{which === 'otp' ? 'Sent with the 6-digit code when someone registers.' : 'Sent after the code is confirmed, with the ticket and QR code.'} Changes go live when you press Save changes.</p>
          <div className="a-fields">
            <label className="a-row"><span><b>Subject</b></span><input type="text" value={t.subject} maxLength={200} onChange={e => set({ subject: e.target.value })} /></label>
            <div>
              <p className="lbl-small">Click to insert a placeholder at the cursor</p>
              <div className="ph-chips">{PLACEHOLDERS[which].map(([k, d]) => <button type="button" key={k} title={d} onClick={() => insert(k)}>{`{{${k}}}`}</button>)}</div>
            </div>
            <label className="a-row stack"><span><b>Email design (HTML)</b><small>Normal HTML with inline styles works best in email apps. Scripts and forms are removed.</small></span>
              <textarea ref={area} className="code" rows={18} spellCheck="false" value={t.html} onChange={e => set({ html: e.target.value })} /></label>
            <div className="a-inline" style={{ marginTop: 0 }}>
              <button type="button" className="a-btn" onClick={() => { if (confirm('Replace this email with the original design?')) set(clone(DEFAULT_EMAIL[which])); }}>Reset to default design</button>
            </div>
          </div>
        </div>
        <div className="a-card">
          <h2>Send a test</h2>
          <p className="muted">Sends the email exactly as you see it now (even if not saved yet), with sample data.</p>
          <div className="a-inline">
            <input type="email" value={to} onChange={e => setTo(e.target.value)} placeholder="Your email address" aria-label="Send test to" />
            <button type="button" className="a-btn primary" disabled={sending || !to} onClick={send}>{sending ? 'Sending…' : 'Send test email'}</button>
          </div>
        </div>
      </div>
      <aside className="a-preview email-preview">
        <div className="a-preview-head"><span>Preview</span>
          <span className="seg small"><button type="button" className={width === 600 ? 'on' : ''} onClick={() => setWidth(600)}>Desktop</button><button type="button" className={width === 360 ? 'on' : ''} onClick={() => setWidth(360)}>Phone</button></span></div>
        <p className="subj"><b>Subject:</b> {subject}</p>
        <div className="frame-wrap"><iframe title="Email preview" sandbox="" srcDoc={`<!doctype html><meta charset="utf-8"><body style="margin:0">${preview}`} style={{ width }} /></div>
      </aside>
    </div>
  );
}
