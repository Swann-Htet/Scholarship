import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';

const SeatMap3D = lazy(() => import('../site/SeatMap3D.jsx'));

const TONES = ['#FFB020', '#2DD4BF', '#8B7CFF', '#FF6B9A', '#5EA8FF', '#7BD88F', '#FF8A5C', '#C58AFF'];
const tone = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return TONES[h % TONES.length]; };
const initials = n => n.split(/\s+/).filter(Boolean).slice(0, 2).map(w => [...w][0]).join('').toUpperCase() || '?';

const Avatar = ({ name }) => <span className="sp-av" style={{ background: tone(name) }}>{initials(name)}</span>;

function Stat({ label, value, tint }) {
  return <div className="sp-stat" style={{ '--t': tint }}><b>{value}</b><span>{label}</span></div>;
}

function Empty({ title, text }) {
  return (
    <div className="sp-empty">
      <svg viewBox="0 0 120 60" aria-hidden="true">
        {[0, 1, 2, 3, 4].map(i => <g key={i} transform={`translate(${6 + i * 22} 22)`}><rect y="8" width="16" height="12" rx="4" fill="#2DD4BF" opacity=".35" /><rect width="16" height="12" rx="4" fill="#2DD4BF" opacity=".6" /></g>)}
        <circle cx="60" cy="10" r="5" fill="#FFB020" /><path d="M60 3v-3M60 20v3M50 10h-3M70 10h3" stroke="#FFB020" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <h4>{title}</h4><p>{text}</p>
    </div>
  );
}

/**
 * Admin seat editor. Pick a person (on the map or in a list), then click a free seat to move them,
 * or another person's seat to swap places. Changes save instantly and animate on the map.
 */
export default function SeatsTab({ onAuthError, flash }) {
  const [data, setData] = useState(null);
  const [sel, setSel] = useState(null);
  const [q, setQ] = useState('');
  const [list, setList] = useState('without');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api.seatmap().then(setData).catch(e => { if (!onAuthError(e)) flash(e.message, true); }), [onAuthError, flash]);
  useEffect(() => { load(); }, [load]);

  const byId = useMemo(() => { const m = {}; if (data) [...data.seated, ...data.unseated].forEach(p => { m[p._id] = p; }); return m; }, [data]);
  const bySeat = useMemo(() => { const m = {}; if (data) data.seated.forEach(p => { m[p.seat] = p; }); return m; }, [data]);
  const occupants = useMemo(() => Object.fromEntries(Object.entries(bySeat).map(([k, p]) => [k, p.name])), [bySeat]);
  const person = sel ? byId[sel] : null;
  const total = data?.layout.seats.length || 0;

  useEffect(() => { if (data && data.unseated.length === 0 && list === 'without') setList('seated'); }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async fn => { setBusy(true); try { await fn(); await load(); } catch (e) { if (!onAuthError(e)) flash(e.message, true); } finally { setBusy(false); } };

  const onSeat = label => {
    if (busy || !data) return;
    const occ = bySeat[label];
    if (!person) { if (occ) setSel(occ._id); else flash('Pick a person first (on the map or in the list), then click a free seat.', true); return; }
    if (occ && occ._id === person._id) { setSel(null); return; }
    act(async () => {
      const r = await api.moveSeat(person._id, label);
      flash(r.swappedWith ? `Swapped ${person.name} with ${r.swappedWith}.` : `${person.name} is now in seat ${label}.`);
      setSel(null);
    });
  };
  const unseat = () => act(async () => { await api.moveSeat(person._id, ''); flash(`${person.name} removed from their seat.`); setSel(null); });
  const auto = () => act(async () => { const r = await api.autoAssign(); flash(r.assigned ? `Seated ${r.assigned} ${r.assigned === 1 ? 'person' : 'people'}.${r.left ? ` ${r.left} did not fit.` : ''}` : 'Nobody to seat.'); });

  const match = p => !q || (p.name + ' ' + p.email + ' ' + (p.seat || '')).toLowerCase().includes(q.toLowerCase());
  if (!data) return <div className="a-card"><div className="sk sk-line" style={{ width: '40%' }} /><div className="sk" style={{ height: 360, borderRadius: 18, marginTop: 16 }} /></div>;

  const seated = [...data.seated].sort((a, b) => a.seat.localeCompare(b.seat, undefined, { numeric: true })).filter(match);
  const without = data.unseated.filter(match);
  const free = Math.max(0, total - data.seated.length);
  const step = person ? 2 : 1;

  return (
    <div className="sp">
      <div className="sp-stats">
        <Stat label="Seated" value={data.seated.length} tint="#2DD4BF" />
        <Stat label="Without a seat" value={data.unseated.length} tint="#FFB020" />
        <Stat label="Free seats" value={free} tint="#5EA8FF" />
        <Stat label="On the waitlist" value={data.waitlist} tint="#FF6B9A" />
      </div>

      <div className="sp-grid">
        <div className="a-card sp-plan">
          <div className="sp-head">
            <div><h2>Seating plan</h2><p className="muted">Pick a person, then click a free seat to move them, or another person to swap.</p></div>
            <ol className="sp-steps" aria-label="How it works">
              <li className={step === 1 ? 'on' : 'done'}><i>1</i>Pick a person</li>
              <li className={step === 2 ? 'on' : ''}><i>2</i>Click a seat</li>
            </ol>
          </div>

          <div className="sp-stage">
            <Suspense fallback={<div className="sk" style={{ height: 380, borderRadius: 18 }} />}>
              <SeatMap3D admin layout={data.layout} taken={Object.keys(bySeat)} occupants={occupants} selected={person?.seat || ''} onSelect={onSeat} />
            </Suspense>
            <div className="sp-legend" aria-hidden="true"><span><i style={{ background: '#2DD4BF' }} />Free</span><span><i style={{ background: '#8d889a' }} />Taken</span><span><i style={{ background: '#6ea8ff' }} />Selected</span></div>
            {data.seated.length === 0 && data.unseated.length === 0 && (
              <div className="sp-overlay"><b>No registrations yet</b><span>When people register they get a seat automatically and appear here.</span></div>
            )}
          </div>

          {person && (
            <div className="sp-pick">
              <Avatar name={person.name} />
              <div className="sp-pick-info"><b>{person.name}</b><span>{person.email}</span></div>
              <em className={`sp-seat${person.seat ? '' : ' none'}`}>{person.seat || 'No seat'}</em>
              <div className="sp-pick-act">
                <span className="muted">Now click a seat on the map</span>
                {person.seat && <button className="a-btn danger" disabled={busy} onClick={unseat}>Remove from seat</button>}
                <button className="a-btn" onClick={() => setSel(null)}>Cancel</button>
              </div>
            </div>
          )}
        </div>

        <div className="a-card sp-side">
          <div className="sp-tools">
            <div className="sp-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg><input type="search" placeholder="Find a person or seat" value={q} onChange={e => setQ(e.target.value)} aria-label="Search people" /></div>
            <button className="a-btn primary" disabled={busy || !data.unseated.length} onClick={auto} title="Give every confirmed person without a seat the next free seat">Seat everyone</button>
          </div>
          <div className="sp-tabs" role="tablist">
            <button role="tab" aria-selected={list === 'without'} className={list === 'without' ? 'on' : ''} onClick={() => setList('without')}>Without a seat <b>{data.unseated.length}</b></button>
            <button role="tab" aria-selected={list === 'seated'} className={list === 'seated' ? 'on' : ''} onClick={() => setList('seated')}>Seated <b>{data.seated.length}</b></button>
          </div>

          <div className="sp-list">
            {list === 'without' && without.map(p => (
              <button key={p._id} className={`sp-row${sel === p._id ? ' on' : ''}`} onClick={() => setSel(sel === p._id ? null : p._id)}><Avatar name={p.name} /><span><b>{p.name}</b><small>{p.email}</small></span><em className="sp-seat none">No seat</em></button>
            ))}
            {list === 'without' && without.length === 0 && (data.unseated.length === 0 ? <Empty title="Everyone has a seat" text="New registrations are seated automatically, closest to the stage first." /> : <Empty title="No match" text="Try a different name." />)}
            {list === 'seated' && seated.map(p => (
              <button key={p._id} className={`sp-row${sel === p._id ? ' on' : ''}`} onClick={() => setSel(sel === p._id ? null : p._id)}><Avatar name={p.name} /><span><b>{p.name}</b><small>{p.email}</small></span><em className="sp-seat">{p.seat}</em></button>
            ))}
            {list === 'seated' && seated.length === 0 && (data.seated.length === 0 ? <Empty title="Nobody is seated yet" text="Registered people appear here with their seat. You can move them on the map." /> : <Empty title="No match" text="Try a different name or seat." />)}
          </div>
        </div>
      </div>
    </div>
  );
}
