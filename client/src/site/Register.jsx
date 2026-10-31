import React, { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { sfx } from '../lib/sound.js';
import { Doodles } from './Decor.jsx';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const RULES = {
  name: v => v.trim().length >= 2 || 'Please enter your full name.',
  email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || 'Enter a valid email address.',
  lineId: v => /^@?[A-Za-z0-9._-]{2,40}$/.test(v.trim()) || 'LINE ID: 2 to 40 letters, numbers, dot, dash or underscore.'
};
const FIELDS = [
  { id: 'name', label: 'Full name', type: 'text', auto: 'name' },
  { id: 'email', label: 'Email', type: 'email', auto: 'email' },
  { id: 'lineId', label: 'LINE ID', type: 'text', auto: 'off' }
];
const TICKET_KEY = 'gd-ticket';
const loadTicket = () => { try { return JSON.parse(localStorage.getItem(TICKET_KEY) || 'null'); } catch { return null; } };

function Field({ f, value, err, ok, shake, onChange, onBlur, onFocus }) {
  return (
    <div className={`fld${ok ? ' valid' : ''}${err ? ' invalid' : ''}${shake ? ' shake' : ''}`}>
      <input id={f.id} name={f.id} type={f.type} value={value} placeholder=" " autoComplete={f.auto} inputMode={f.id === 'email' ? 'email' : undefined} spellCheck="false"
        aria-invalid={!!err} aria-describedby={err ? f.id + '-err' : undefined} onChange={e => onChange(f.id, e.target.value)} onBlur={() => onBlur(f.id)} onFocus={onFocus} />
      <label htmlFor={f.id}>{f.label}</label>
      <svg className="ok" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
      <div className={`err${err ? ' show' : ''}`} role="alert" id={f.id + '-err'}><p>{err}</p></div>
    </div>
  );
}

function confetti() {
  const cv = document.getElementById('confetti'); if (!cv) return;
  const c = cv.getContext('2d'), dpr = Math.min(devicePixelRatio || 1, 2), W = (cv.width = innerWidth * dpr), H = (cv.height = innerHeight * dpr), n = innerWidth < 700 ? 90 : 160;
  const cols = ['#FFB020', '#2DD4BF', '#F4F2EE', '#FFD36B', '#FF6B9A', '#8B7CFF'];
  const ps = Array.from({ length: n }, () => ({ x: W / 2 + (Math.random() - 0.5) * W * 0.2, y: H * 0.55, vx: (Math.random() - 0.5) * 22 * dpr, vy: -(8 + Math.random() * 16) * dpr, r: (4 + Math.random() * 6) * dpr, a: Math.random() * 6, va: (Math.random() - 0.5) * 0.4, col: cols[(Math.random() * cols.length) | 0], round: Math.random() < 0.35 }));
  const t0 = performance.now();
  (function step(now) {
    c.clearRect(0, 0, W, H); const age = now - t0;
    ps.forEach(p => { p.vy += 0.55 * dpr; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.va; c.save(); c.globalAlpha = clamp(1 - (age - 2200) / 1400); c.translate(p.x, p.y); c.rotate(p.a); c.fillStyle = p.col; if (p.round) { c.beginPath(); c.arc(0, 0, p.r / 2, 0, 6.3); c.fill(); } else c.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); c.restore(); });
    if (age < 3600) requestAnimationFrame(step); else c.clearRect(0, 0, W, H);
  })(t0);
}

function Ticket({ ticket, settings, onReset }) {
  const canvas = useRef(null);
  const e = settings.event, wait = ticket.status === 'waitlist';
  useEffect(() => {
    let live = true;
    import('qrcode').then(({ default: QR }) => { if (live && canvas.current) QR.toCanvas(canvas.current, ticket.code, { width: 132, margin: 1, color: { dark: '#0B0B0F', light: '#F4F2EE' } }); });
    return () => { live = false; };
  }, [ticket.code]);

  const download = (blob, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
  const ics = () => {
    const d = e.dateISO.replace(/-/g, ''), t = s => s.replace(':', '') + '00';
    const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Global Dialogues//EN', 'BEGIN:VEVENT', `UID:${ticket.code}@global-dialogues`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART;TZID=Asia/Bangkok:${d}T${t(e.startTime)}`, `DTEND;TZID=Asia/Bangkok:${d}T${t(e.endTime)}`, `SUMMARY:${e.title}`, `LOCATION:${e.venue}\\, ${e.campus}`, 'DESCRIPTION:Dress code: black and white\\, with jeans. Show your ticket QR code at registration.', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    download(new Blob([body], { type: 'text/calendar' }), 'global-dialogues.ics'); sfx('click');
  };
  const png = () => {
    const cv = document.createElement('canvas'); cv.width = 1000; cv.height = 460; const c = cv.getContext('2d');
    c.fillStyle = '#F4F2EE'; c.fillRect(0, 0, 1000, 460);
    const g = c.createLinearGradient(0, 0, 1000, 460); g.addColorStop(0, 'rgba(255,176,32,.3)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(45,212,191,.3)'); c.fillStyle = g; c.fillRect(0, 0, 1000, 460);
    c.fillStyle = '#0B0B0F'; c.font = '500 18px monospace'; c.fillText(e.title.toUpperCase(), 48, 64);
    c.font = '800 54px sans-serif'; c.fillText(ticket.name.slice(0, 26), 48, 140);
    c.font = '600 24px sans-serif'; c.fillText(`${e.dateLabel}, ${e.startTime} to ${e.endTime}`, 48, 220); c.fillText(e.venue, 48, 258); c.fillText('Dress code: black and white, with jeans', 48, 296);
    c.font = '500 18px monospace'; c.fillText(wait ? 'WAITLIST' : 'CONFIRMED', 48, 400);
    c.setLineDash([10, 10]); c.strokeStyle = 'rgba(11,11,15,.4)'; c.lineWidth = 2; c.beginPath(); c.moveTo(740, 24); c.lineTo(740, 436); c.stroke();
    if (canvas.current) c.drawImage(canvas.current, 780, 90, 180, 180);
    c.font = '500 24px monospace'; c.textAlign = 'center'; c.fillText(ticket.code, 870, 320);
    cv.toBlob(b => download(b, `ticket-${ticket.code}.png`)); sfx('click');
  };
  const share = async () => {
    const data = { title: e.title, text: `I am joining ${e.title} on ${e.dateLabel}. Come along!`, url: location.origin };
    try { if (navigator.share) await navigator.share(data); else { await navigator.clipboard.writeText(data.url); alert('Link copied'); } } catch { /* cancelled */ }
  };

  return (
    <div className="success">
      <h3 className="success-title">{wait ? 'You are on the waitlist.' : 'You are in.'}</h3>
      <p className="success-sub">{wait ? 'The event is full for now. We will message you on LINE if a place opens. Keep this code.' : `Show this QR code at registration from ${e.startTime}.`}</p>
      <div className="ticket-scene">
        <div className="ticket">
          <div className="t-main">
            <p className="t-brand">{e.title}</p>
            <p className="t-name">{ticket.name}</p>
            <dl className="t-meta">
              <div><dt>Date</dt><dd>{e.dateLabel}</dd></div><div><dt>Time</dt><dd>{e.startTime} to {e.endTime}</dd></div>
              <div className="wide"><dt>Venue</dt><dd>{e.venue}, {e.campus}</dd></div><div className="wide"><dt>Dress code</dt><dd>Black and white, with jeans</dd></div>
            </dl>
            <p className="t-status">{wait ? 'Waitlist' : 'Confirmed'}</p>
          </div>
          <div className="t-stub"><i className="notch n1" /><i className="notch n2" /><div className="qr"><canvas ref={canvas} width="132" height="132" /></div><p className="t-code">{ticket.code}</p></div>
        </div>
      </div>
      <div className="success-actions">
        <button className="btn mag" type="button" onClick={ics}><svg className="ic"><use href="#i-cal" /></svg> Add to calendar</button>
        <button className="btn btn-ghost mag" type="button" onClick={png}><svg className="ic"><use href="#i-dl" /></svg> Download ticket</button>
        <button className="btn btn-ghost mag" type="button" onClick={share}><svg className="ic"><use href="#i-share" /></svg> Share</button>
      </div>
      <p className="again"><button type="button" onClick={onReset}>Register someone else</button></p>
    </div>
  );
}

export default function Register({ settings }) {
  const e = settings.event;
  const [vals, setVals] = useState({ name: '', email: '', lineId: '' });
  const [errs, setErrs] = useState({});
  const [touched, setTouched] = useState({});
  const [shake, setShake] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState('');
  const [cap, setCap] = useState(null); // null = still loading (skeleton)
  const [ticket, setTicket] = useState(loadTicket);
  const started = useRef(0);
  const hp = useRef(null);

  useEffect(() => {
    let live = true;
    api.capacity().then(c => live && setCap(c)).catch(() => live && setCap({ confirmed: 0, capacity: e.capacity, failed: true }));
    return () => { live = false; };
  }, [e.capacity]);

  const shakeIt = id => { setShake(id); setTimeout(() => setShake(''), 320); };
  const validate = id => { const r = RULES[id](vals[id]); setErrs(x => ({ ...x, [id]: r === true ? '' : r })); return r === true; };
  const change = (id, v) => { setVals(x => ({ ...x, [id]: v })); if (touched[id]) { const r = RULES[id](v); setErrs(x => ({ ...x, [id]: r === true ? '' : r })); } };
  const blur = id => { setTouched(t => ({ ...t, [id]: true })); const ok = validate(id); if (ok && vals[id]) sfx('valid'); else if (!ok && vals[id]) sfx('invalid'); };

  const taken = cap?.confirmed ?? 0, total = cap?.capacity ?? e.capacity, left = Math.max(0, total - taken), full = cap && left === 0, low = cap && !full && left <= e.lowSpotsThreshold;

  const submit = async ev => {
    ev.preventDefault(); if (busy) return; setMsg('');
    const bad = FIELDS.map(f => f.id).filter(id => RULES[id](vals[id]) !== true);
    setTouched({ name: true, email: true, lineId: true });
    setErrs(Object.fromEntries(FIELDS.map(f => [f.id, RULES[f.id](vals[f.id]) === true ? '' : RULES[f.id](vals[f.id])])));
    if (bad.length) { shakeIt(bad[0]); sfx('invalid'); document.getElementById(bad[0])?.focus(); return; }
    if (hp.current?.value || (started.current && performance.now() - started.current < 2500)) { setMsg('That was very fast. Please check your answers and try again.'); sfx('error'); return; }
    setBusy(true);
    try {
      const res = await api.register({ name: vals.name, email: vals.email, lineId: vals.lineId, website: hp.current?.value || '' });
      setDone(true); await new Promise(r => setTimeout(r, 900));
      const t = { name: res.name, code: res.ticketCode, status: res.status };
      try { localStorage.setItem(TICKET_KEY, JSON.stringify(t)); } catch { /* ignore */ }
      setTicket(t); sfx('success'); if (!matchMedia('(prefers-reduced-motion: reduce)').matches) confetti();
      api.capacity().then(setCap).catch(() => {});
    } catch (err) {
      setMsg(err.message); sfx('error'); shakeIt('btn');
    } finally { setBusy(false); setDone(false); }
  };

  const reset = () => { try { localStorage.removeItem(TICKET_KEY); } catch { /* ignore */ } setTicket(null); setVals({ name: '', email: '', lineId: '' }); setErrs({}); setTouched({}); };

  return (
    <section className="sec" id="register"><Doodles id="register" />
      <div className="wrap narrow">
        <p className="kicker" data-reveal>Register</p>
        <h2 className="h2" data-reveal>{ticket ? 'Your ticket.' : 'Save your place.'}</h2>

        {!ticket && (
          <>
            <div className={`cap${low ? ' low' : ''}${full ? ' full' : ''}`} data-reveal>
              {cap === null ? (
                <><div className="sk sk-line" style={{ width: '45%' }} /><div className="sk sk-bar" /></>
              ) : (
                <>
                  <div className="cap-top"><span>{cap.failed ? 'Availability unavailable right now' : full ? 'All places taken. Join the waitlist.' : `${left} of ${total} places left`}</span><span className="cap-note">{full ? 'Waitlist open' : low ? 'Almost full' : ''}</span></div>
                  <div className="cap-bar"><i style={{ transform: `scaleX(${clamp(taken / total)})` }} /></div>
                </>
              )}
            </div>

            <div className="card form-card" data-reveal>
              <form onSubmit={submit} noValidate>
                <input ref={hp} className="hp" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
                {FIELDS.map(f => (
                  <Field key={f.id} f={f} value={vals[f.id]} err={errs[f.id]} ok={touched[f.id] && !errs[f.id] && vals[f.id]} shake={shake === f.id} onChange={change} onBlur={blur} onFocus={() => { if (!started.current) started.current = performance.now(); sfx('focus', null, 200); }} />
                ))}
                <p className="hint">Your name, email and LINE ID are used only to organise this event and are deleted after the post-event report.</p>
                <div className="form-foot">
                  <button type="submit" className={`btn mag morph${busy ? ' loading' : ''}${done ? ' ok' : ''}${shake === 'btn' ? ' shake' : ''}`} disabled={busy}>
                    <span className="lab">{full ? 'Join waitlist' : 'Register'}</span>
                    <svg className="spin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" pathLength="1" /></svg>
                    <svg className="done" viewBox="0 0 24 24"><path d="M5 12.500l4.500 4.500L19 7.500" pathLength="1" /></svg>
                  </button>
                </div>
                <p className="form-msg" role="alert">{msg}</p>
              </form>
            </div>
          </>
        )}
        {ticket && <Ticket ticket={ticket} settings={settings} onReset={reset} />}
      </div>
    </section>
  );
}
