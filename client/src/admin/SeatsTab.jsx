import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';

const SeatMap3D = lazy(() => import('../site/SeatMap3D.jsx'));

/**
 * Admin seat editor. Click a person (on the map or in the lists) to select them, then click a free seat to move them,
 * or another person's seat to swap places. Changes are saved immediately and animate on the map.
 */
export default function SeatsTab({ onAuthError, flash }) {
  const [data, setData] = useState(null);
  const [sel, setSel] = useState(null); // selected registration _id
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api.seatmap().then(setData).catch(e => { if (!onAuthError(e)) flash(e.message, true); }), [onAuthError, flash]);
  useEffect(() => { load(); }, [load]);

  const byId = useMemo(() => { const m = {}; if (data) [...data.seated, ...data.unseated].forEach(p => { m[p._id] = p; }); return m; }, [data]);
  const bySeat = useMemo(() => { const m = {}; if (data) data.seated.forEach(p => { m[p.seat] = p; }); return m; }, [data]);
  const occupants = useMemo(() => Object.fromEntries(Object.entries(bySeat).map(([k, p]) => [k, p.name])), [bySeat]);
  const person = sel ? byId[sel] : null;

  const act = async fn => { setBusy(true); try { await fn(); await load(); } catch (e) { if (!onAuthError(e)) flash(e.message, true); } finally { setBusy(false); } };

  const onSeat = label => {
    if (busy || !data) return;
    const occ = bySeat[label];
    if (!person) { if (occ) setSel(occ._id); else flash('Select a person first, then click a free seat.', true); return; }
    if (occ && occ._id === person._id) { setSel(null); return; }
    act(async () => {
      const r = await api.moveSeat(person._id, label);
      flash(r.swappedWith ? `Swapped ${person.name} with ${r.swappedWith}.` : `${person.name} is now in seat ${label}.`);
      setSel(null);
    });
  };

  const unseat = () => act(async () => { await api.moveSeat(person._id, ''); flash(`${person.name} removed from their seat.`); setSel(null); });
  const auto = () => act(async () => { const r = await api.autoAssign(); flash(r.assigned ? `Seated ${r.assigned} ${r.assigned === 1 ? 'person' : 'people'}.${r.left ? ` ${r.left} could not fit.` : ''}` : 'Nobody to seat.'); });

  const match = p => !q || (p.name + ' ' + p.email + ' ' + (p.seat || '')).toLowerCase().includes(q.toLowerCase());
  if (!data) return <div className="a-card"><div className="sk sk-line" style={{ width: '40%' }} /><div className="sk" style={{ height: 300, borderRadius: 16, marginTop: 16 }} /></div>;

  return (
    <div className="a-split2 seats-layout">
      <div className="a-card">
        <h2>Seating plan</h2>
        <p className="muted">{data.seated.length} seated · {data.unseated.length} confirmed without a seat · {data.waitlist} on the waitlist. Click a person, then a free seat to move them, or another person to swap.</p>
        <Suspense fallback={<div className="sk" style={{ height: 320, borderRadius: 16, marginTop: 12 }} />}>
          <SeatMap3D admin layout={data.layout} taken={Object.keys(bySeat)} occupants={occupants} selected={person?.seat || ''} onSelect={onSeat} />
        </Suspense>
        {person && (
          <div className="seat-sel">
            <div><b>{person.name}</b><span>{person.email}</span><span>{person.seat ? `Seat ${person.seat}` : 'No seat yet'} · {person.ticketCode}</span></div>
            <p className="muted" style={{ margin: 0 }}>Now click a seat on the map.</p>
            <div className="a-rowtools">{person.seat && <button className="a-btn danger" disabled={busy} onClick={unseat}>Remove from seat</button>}<button className="a-btn" onClick={() => setSel(null)}>Cancel</button></div>
          </div>
        )}
      </div>

      <div className="a-card seat-lists">
        <div className="a-inline" style={{ marginTop: 0 }}>
          <input type="search" placeholder="Find a person or seat" value={q} onChange={e => setQ(e.target.value)} aria-label="Search" />
          <button className="a-btn primary" disabled={busy || !data.unseated.length} onClick={auto}>Seat everyone</button>
        </div>
        <h3>Without a seat ({data.unseated.length})</h3>
        {data.unseated.filter(match).map(p => <button key={p._id} className={`seat-person${sel === p._id ? ' on' : ''}`} onClick={() => setSel(sel === p._id ? null : p._id)}><b>{p.name}</b><span>{p.email}</span></button>)}
        {data.unseated.length === 0 && <p className="muted">Everyone confirmed has a seat.</p>}
        <h3>Seated ({data.seated.length})</h3>
        <div className="seat-scroll">
          {[...data.seated].sort((a, b) => a.seat.localeCompare(b.seat, undefined, { numeric: true })).filter(match).map(p => (
            <button key={p._id} className={`seat-person${sel === p._id ? ' on' : ''}`} onClick={() => setSel(sel === p._id ? null : p._id)}><b>{p.name}</b><span>{p.email}</span><em>{p.seat}</em></button>
          ))}
        </div>
      </div>
    </div>
  );
}
