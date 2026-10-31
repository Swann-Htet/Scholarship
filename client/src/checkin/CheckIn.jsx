import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import ScanPanel from '../lib/ScanPanel.jsx';

// Public page for volunteers: /checkin/<secret-token>. No login: the link itself is the key, and admins can switch it off.
export default function CheckIn() {
  const token = decodeURIComponent(location.pathname.split('/')[2] || '');
  const [info, setInfo] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    document.body.classList.add('checkin-body'); document.title = 'Check-in · Global Dialogues';
    api.checkinInfo(token).then(setInfo).catch(e => setErr(e.message));
    return () => document.body.classList.remove('checkin-body');
  }, [token]);

  return (
    <div className="checkin-page">
      <div className="checkin-brand">
        <svg viewBox="0 0 40 28" width="40" height="28"><circle cx="14" cy="14" r="11" fill="#FFB020" fillOpacity=".85" /><circle cx="26" cy="14" r="11" fill="#2DD4BF" fillOpacity=".75" /></svg>
        <div>Global Dialogues<small>{info ? `Check-in · ${info.label}` : 'Check-in'}</small></div>
      </div>
      {err && <div className="checkin-err"><h2>Link not working</h2><p>{err}</p><p>Ask an organiser for a new check-in link.</p></div>}
      {!err && !info && <div className="checkin-err"><p>Checking link…</p></div>}
      {info && <ScanPanel title="Scan ticket" submit={code => api.checkinScan(token, code)} />}
    </div>
  );
}
