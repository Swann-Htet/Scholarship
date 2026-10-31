import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const Sk = ({ w = '100%', h = 14 }) => <div className="sk" style={{ width: w, height: h, borderRadius: 8 }} />;

export default function Dashboard({ onAuthError }) {
  const [s, setS] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api.stats().then(setS).catch(e => { if (!onAuthError(e)) setErr(e.message); }); }, [onAuthError]);

  if (err) return <div className="a-card a-err">{err}</div>;
  const cards = s ? [['Registered', s.total], ['Confirmed', s.confirmed], ['Waitlist', s.waitlist], ['Checked in', s.checkedIn]] : [1, 2, 3, 4];
  const max = s ? Math.max(1, ...s.daily.map(d => d.count)) : 1;
  return (
    <>
      <div className="a-stats">
        {cards.map((c, i) => (
          <div className="a-card stat" key={i}>{s ? <><span>{c[0]}</span><strong>{c[1]}</strong></> : <><Sk w="50%" /><Sk w="35%" h={34} /></>}</div>
        ))}
      </div>
      <div className="a-grid2">
        <div className="a-card">
          <h2>Capacity</h2>
          {s ? (
            <>
              <p className="muted">{s.confirmed} of {s.capacity} places taken</p>
              <div className="a-bar"><i style={{ width: `${Math.min(100, (s.confirmed / s.capacity) * 100)}%` }} /></div>
            </>
          ) : <><Sk w="40%" /><Sk h={10} /></>}
          <h2 style={{ marginTop: 26 }}>Last 14 days</h2>
          {s ? (
            s.daily.length ? <div className="a-chart">{s.daily.map(d => <div key={d.date} title={`${d.date}: ${d.count}`}><i style={{ height: `${(d.count / max) * 100}%` }} /><span>{d.date.slice(8)}</span></div>)}</div> : <p className="muted">No registrations yet.</p>
          ) : <Sk h={110} />}
        </div>
        <div className="a-card">
          <h2>Latest registrations</h2>
          {s ? (
            s.recent.length ? <ul className="a-list">{s.recent.map(r => <li key={r._id}><div><strong>{r.name}</strong><span>{r.email}</span></div><em className={`pill ${r.status}`}>{r.status}</em></li>)}</ul> : <p className="muted">Nothing yet. Share your website link.</p>
          ) : <>{[0, 1, 2, 3].map(i => <div key={i} style={{ margin: '14px 0' }}><Sk w="60%" /><Sk w="40%" h={10} /></div>)}</>}
        </div>
      </div>
    </>
  );
}
