import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { generateLayout, relabel, uniqueLabels, layoutBounds } from '../../../shared/layout.js';

const SeatMap3D = lazy(() => import('../site/SeatMap3D.jsx'));
const clone = o => JSON.parse(JSON.stringify(o));
const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const rid = () => 'n' + Math.random().toString(36).slice(2, 8);
const SEAT = 0.5;

function fitView(layout) {
  const b = layoutBounds(layout), spanX = b.xMax - b.xMin + 5, spanZ = b.zMax - b.zMin + 5, w = Math.max(spanX, spanZ * 1.6), h = w / 1.6;
  return { x: (b.xMin + b.xMax) / 2 - w / 2, y: (b.zMin + b.zMax) / 2 - h / 2, w, h };
}

/**
 * Top-down seat layout editor. Every seat is a free object: drag it, rotate it, rename it, or generate a whole pattern.
 * Edits update the settings draft (undo/redo supported). They go live when the admin presses "Save changes".
 */
export default function LayoutTab({ draft, setDraft, flash }) {
  const layout = draft.seating.layout;
  const svgRef = useRef(null);
  const wrapRef = useRef(null);
  const [sel, setSel] = useState([]); // seat ids
  const [stageSel, setStageSel] = useState(false);
  const [tool, setTool] = useState('select');
  const [snap, setSnap] = useState(true);
  const [grid, setGrid] = useState(0.32);
  const [view, setView] = useState(() => fitView(layout));
  const [box, setBox] = useState(null);
  const [preview, setPreview] = useState(false);
  const [gen, setGen] = useState({ pattern: 'arc', rows: 8, perRow: 10, spacing: 0.64, rowSpacing: 1.25, startDistance: 3.6, aisleEvery: 5, aisleGap: 0.9 });
  const [relMode, setRelMode] = useState('arc');
  const past = useRef([]), future = useRef([]);
  const [, bump] = useState(0);
  const drag = useRef(null);
  const selSet = useMemo(() => new Set(sel), [sel]);
  const layoutRef = useRef(layout); layoutRef.current = layout;

  const put = useCallback(next => setDraft(d => ({ ...d, seating: { ...d.seating, layout: next } })), [setDraft]);
  const commit = useCallback(next => { past.current.push(clone(layoutRef.current)); if (past.current.length > 60) past.current.shift(); future.current = []; put(next); bump(n => n + 1); }, [put]);
  const undo = () => { const p = past.current.pop(); if (!p) return; future.current.push(clone(layoutRef.current)); put(p); setSel([]); bump(n => n + 1); };
  const redo = () => { const f = future.current.pop(); if (!f) return; past.current.push(clone(layoutRef.current)); put(f); setSel([]); bump(n => n + 1); };

  const dupLabels = useMemo(() => { const c = {}; layout.seats.forEach(s => { c[s.label] = (c[s.label] || 0) + 1; }); return new Set(Object.keys(c).filter(k => c[k] > 1)); }, [layout.seats]);
  const labelsLive = view.w < 28;

  // ---- coordinates
  const toWorld = e => { const svg = svgRef.current, p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const w = p.matrixTransform(svg.getScreenCTM().inverse()); return { x: w.x, z: w.y }; };
  const sn = v => (snap ? Math.round(v / grid) * grid : v);

  // wheel zoom (needs a non-passive listener)
  useEffect(() => {
    const svg = svgRef.current; if (!svg) return undefined;
    const onWheel = e => {
      e.preventDefault();
      const k = e.deltaY > 0 ? 1.12 : 1 / 1.12, p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const w = p.matrixTransform(svg.getScreenCTM().inverse());
      setView(v => { const nw = Math.min(120, Math.max(5, v.w * k)), nh = nw / 1.6; return { x: w.x - ((w.x - v.x) / v.w) * nw, y: w.y - ((w.y - v.y) / v.h) * nh, w: nw, h: nh }; });
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, []);

  // ---- pointer handling
  const onDownSeat = (e, s) => {
    if (e.button === 1 || e.altKey || tool === 'add') return;
    e.stopPropagation(); wrapRef.current.focus();
    let ids = selSet.has(s.id) ? sel : e.shiftKey ? [...sel, s.id] : [s.id];
    if (e.shiftKey && selSet.has(s.id)) { setSel(sel.filter(i => i !== s.id)); return; }
    setSel(ids); setStageSel(false);
    const w = toWorld(e);
    drag.current = { kind: 'seats', start: w, orig: Object.fromEntries(layoutRef.current.seats.filter(q => ids.includes(q.id)).map(q => [q.id, { x: q.x, z: q.z }])), moved: false, snapshot: clone(layoutRef.current) };
    svgRef.current.setPointerCapture(e.pointerId);
  };
  const onDownStage = e => {
    if (e.button === 1 || e.altKey || tool === 'add') return;
    e.stopPropagation(); wrapRef.current.focus(); setStageSel(true); setSel([]);
    drag.current = { kind: 'stage', start: toWorld(e), orig: { ...layoutRef.current.stage }, moved: false, snapshot: clone(layoutRef.current) };
    svgRef.current.setPointerCapture(e.pointerId);
  };
  const onDownBg = e => {
    wrapRef.current.focus();
    const w = toWorld(e);
    if (e.button === 1 || e.altKey || e.getModifierState?.('Space')) { drag.current = { kind: 'pan', cx: e.clientX, cy: e.clientY, v: view }; svgRef.current.setPointerCapture(e.pointerId); return; }
    if (tool === 'add') {
      const x = round(sn(w.x)), z = round(sn(w.z)), last = layoutRef.current.seats.find(s => s.id === sel[sel.length - 1]);
      const m = last && /^(.*?)(\d+)$/.exec(last.label); let label = m ? m[1] + (Number(m[2]) + 1) : 'N' + (layoutRef.current.seats.length + 1);
      const st = layoutRef.current.stage, seat = { id: rid(), label, x, z, r: round((Math.atan2(x - st.x, z - st.z) * 180) / Math.PI + 180, 1) };
      const seats = uniqueLabels([...layoutRef.current.seats, seat]); commit({ ...layoutRef.current, seats }); setSel([seat.id]); return;
    }
    if (!e.shiftKey) { setSel([]); setStageSel(false); }
    drag.current = { kind: 'box', start: w, shift: e.shiftKey, base: e.shiftKey ? sel : [] };
    setBox({ x0: w.x, z0: w.z, x1: w.x, z1: w.z });
    svgRef.current.setPointerCapture(e.pointerId);
  };
  const onMove = e => {
    const d = drag.current; if (!d) return;
    if (d.kind === 'pan') { const svg = svgRef.current, r = svg.getBoundingClientRect(), k = d.v.w / r.width; setView({ ...d.v, x: d.v.x - (e.clientX - d.cx) * k, y: d.v.y - (e.clientY - d.cy) * k }); return; }
    const w = toWorld(e);
    if (d.kind === 'box') { setBox({ x0: d.start.x, z0: d.start.z, x1: w.x, z1: w.z }); return; }
    let dx = w.x - d.start.x, dz = w.z - d.start.z;
    if (!d.moved && Math.hypot(dx, dz) < 0.05) return;
    if (!d.moved) { d.moved = true; past.current.push(d.snapshot); if (past.current.length > 60) past.current.shift(); future.current = []; }
    if (d.kind === 'seats') {
      const first = Object.values(d.orig)[0]; if (snap) { dx = sn(first.x + dx) - first.x; dz = sn(first.z + dz) - first.z; }
      put({ ...layoutRef.current, seats: layoutRef.current.seats.map(s => (d.orig[s.id] ? { ...s, x: round(d.orig[s.id].x + dx), z: round(d.orig[s.id].z + dz) } : s)) });
    } else if (d.kind === 'stage') {
      put({ ...layoutRef.current, stage: { ...layoutRef.current.stage, x: round(snap ? sn(d.orig.x + dx) : d.orig.x + dx), z: round(snap ? sn(d.orig.z + dz) : d.orig.z + dz) } });
    }
  };
  const onUp = e => {
    const d = drag.current; drag.current = null;
    try { svgRef.current.releasePointerCapture(e.pointerId); } catch { /* not captured */ }
    if (!d) return;
    if (d.kind === 'box') {
      const b = box; setBox(null); if (!b) return;
      const x0 = Math.min(b.x0, b.x1), x1 = Math.max(b.x0, b.x1), z0 = Math.min(b.z0, b.z1), z1 = Math.max(b.z0, b.z1);
      if (x1 - x0 < 0.1 && z1 - z0 < 0.1) return;
      const inside = layoutRef.current.seats.filter(s => s.x >= x0 && s.x <= x1 && s.z >= z0 && s.z <= z1).map(s => s.id);
      setSel([...new Set([...(d.base || []), ...inside])]);
    }
    if (d.moved) bump(n => n + 1);
  };

  // ---- actions on the selection
  const edit = fn => { if (!sel.length) return; commit({ ...layout, seats: uniqueLabels(fn(layout.seats.map(s => ({ ...s })), new Set(sel))) }); };
  const del = () => { if (!sel.length) return; commit({ ...layout, seats: layout.seats.filter(s => !selSet.has(s.id)) }); setSel([]); };
  const dup = () => {
    if (!sel.length) return;
    let n = layout.seats.length; const copies = layout.seats.filter(s => selSet.has(s.id)).map(s => ({ ...s, id: rid(), label: 'N' + (++n), x: round(s.x + 0.8), z: round(s.z + 0.8) }));
    commit({ ...layout, seats: uniqueLabels([...layout.seats, ...copies]) }); setSel(copies.map(c => c.id));
  };
  const align = axis => edit((seats, S) => { const list = seats.filter(s => S.has(s.id)), vals = list.map(s => s[axis[0]]), t = axis[1] === 'min' ? Math.min(...vals) : axis[1] === 'max' ? Math.max(...vals) : vals.reduce((a, b) => a + b, 0) / vals.length; list.forEach(s => { s[axis[0]] = round(t); }); return seats; });
  const distribute = key => edit((seats, S) => { const list = seats.filter(s => S.has(s.id)).sort((a, b) => a[key] - b[key]); if (list.length < 3) return seats; const a = list[0][key], b = list[list.length - 1][key]; list.forEach((s, i) => { s[key] = round(a + ((b - a) * i) / (list.length - 1)); }); return seats; });
  const rotate = deg => edit((seats, S) => { seats.forEach(s => { if (S.has(s.id)) s.r = round(s.r + deg, 1); }); return seats; });
  const face = () => edit((seats, S) => { const st = layout.stage; seats.forEach(s => { if (S.has(s.id)) s.r = round((Math.atan2(s.x - st.x, s.z - st.z) * 180) / Math.PI + 180, 1); }); return seats; });
  const nudge = (dx, dz) => edit((seats, S) => { seats.forEach(s => { if (S.has(s.id)) { s.x = round(s.x + dx); s.z = round(s.z + dz); } }); return seats; });

  const onKey = e => {
    const k = e.key, mod = e.ctrlKey || e.metaKey;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (mod && k.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    else if (mod && k.toLowerCase() === 'y') { e.preventDefault(); redo(); }
    else if (mod && k.toLowerCase() === 'd') { e.preventDefault(); dup(); }
    else if (mod && k.toLowerCase() === 'a') { e.preventDefault(); setSel(layout.seats.map(s => s.id)); }
    else if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); del(); }
    else if (k === 'Escape') { setSel([]); setStageSel(false); setTool('select'); }
    else if (k.startsWith('Arrow') && sel.length) { e.preventDefault(); const s = e.shiftKey ? 5 : 1, g = grid * s; nudge(k === 'ArrowLeft' ? -g : k === 'ArrowRight' ? g : 0, k === 'ArrowUp' ? -g : k === 'ArrowDown' ? g : 0); }
  };

  const one = sel.length === 1 ? layout.seats.find(s => s.id === sel[0]) : null;
  const setOne = patch => edit((seats, S) => { seats.forEach(s => { if (S.has(s.id)) Object.assign(s, patch); }); return seats; });
  const stagePatch = p => commit({ ...layout, stage: { ...layout.stage, ...p } });
  const tierPatch = p => commit({ ...layout, tier: { ...layout.tier, ...p } });
  const generate = () => { if (!confirm(`Replace all ${layout.seats.length} seats with a new ${gen.rows} × ${gen.perRow} layout? People keep their seat when the same label exists.`)) return; const g = generateLayout(gen); commit({ ...g, stage: { ...g.stage, x: layout.stage.x } }); setSel([]); setView(fitView(g)); flash(`Generated ${g.seats.length} seats.`); };
  const doRelabel = () => { commit(relabel(layout, relMode)); flash('Rows and seat numbers renamed. People stay on the same physical seats.'); };

  const num = (label, value, onChange, step = 0.1) => <label className="lay-num"><small>{label}</small><input type="number" step={step} value={value} onChange={e => { const v = Number(e.target.value); if (Number.isFinite(v)) onChange(v); }} /></label>;
  const B = ({ onClick, children, title, disabled, on }) => <button type="button" className={`a-btn tiny${on ? ' on' : ''}`} onClick={onClick} title={title} disabled={disabled}>{children}</button>;
  const gridStr = String(grid);

  return (
    <div className="lay">
      <div className="a-card lay-main">
        <div className="lay-bar">
          <B on={tool === 'select'} onClick={() => setTool('select')} title="Select and drag seats">Select</B>
          <B on={tool === 'add'} onClick={() => setTool('add')} title="Click the floor to add a seat">Add seat</B>
          <span className="lay-sep" />
          <B onClick={undo} disabled={!past.current.length} title="Undo (Ctrl+Z)">Undo</B><B onClick={redo} disabled={!future.current.length} title="Redo (Ctrl+Y)">Redo</B>
          <span className="lay-sep" />
          <B onClick={del} disabled={!sel.length} title="Delete (Del)">Delete</B><B onClick={dup} disabled={!sel.length} title="Duplicate (Ctrl+D)">Duplicate</B>
          <span className="lay-sep" />
          <B onClick={() => align(['x', 'min'])} disabled={sel.length < 2} title="Align left">⇤</B><B onClick={() => align(['x', 'mid'])} disabled={sel.length < 2} title="Align centres (vertical line)">⇔</B><B onClick={() => align(['x', 'max'])} disabled={sel.length < 2} title="Align right">⇥</B>
          <B onClick={() => align(['z', 'min'])} disabled={sel.length < 2} title="Align top">⤒</B><B onClick={() => align(['z', 'mid'])} disabled={sel.length < 2} title="Align middles (straight row)">⇕</B><B onClick={() => align(['z', 'max'])} disabled={sel.length < 2} title="Align bottom">⤓</B>
          <B onClick={() => distribute('x')} disabled={sel.length < 3} title="Spread evenly left to right">Space ↔</B><B onClick={() => distribute('z')} disabled={sel.length < 3} title="Spread evenly top to bottom">Space ↕</B>
          <span className="lay-sep" />
          <B onClick={() => rotate(-15)} disabled={!sel.length} title="Rotate left 15°">⟲</B><B onClick={() => rotate(15)} disabled={!sel.length} title="Rotate right 15°">⟳</B><B onClick={face} disabled={!sel.length} title="Turn towards the stage">Face stage</B>
          <span className="lay-sep" />
          <label className="lay-chk"><input type="checkbox" checked={snap} onChange={e => setSnap(e.target.checked)} /> Snap</label>
          <select value={gridStr} onChange={e => setGrid(Number(e.target.value))} aria-label="Grid size"><option value="0.1">0.1 m</option><option value="0.16">0.16 m</option><option value="0.32">0.32 m</option><option value="0.5">0.5 m</option></select>
          <B onClick={() => setView(fitView(layout))} title="Fit everything">Fit</B>
        </div>

        <div className="lay-wrap" ref={wrapRef} tabIndex={0} onKeyDown={onKey}>
          <svg ref={svgRef} className={`lay-svg tool-${tool}`} viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} onPointerDown={onDownBg} onPointerMove={onMove} onPointerUp={onUp} role="application" aria-label="Seat layout editor">
            <defs><pattern id="lay-grid" width={grid * 2.5} height={grid * 2.5} patternUnits="userSpaceOnUse"><path d={`M ${grid * 2.5} 0 H 0 V ${grid * 2.5}`} fill="none" stroke="rgba(120,110,90,.18)" strokeWidth={view.w / 1500} /></pattern>
              <linearGradient id="lay-stage" x1="0" x2="1"><stop offset="0" stopColor="#FFB020" /><stop offset="1" stopColor="#2DD4BF" /></linearGradient></defs>
            <rect x={view.x - 50} y={view.y - 50} width={view.w + 100} height={view.h + 100} fill="url(#lay-grid)" />
            <line x1={view.x - 50} x2={view.x + view.w + 50} y1="0" y2="0" stroke="rgba(120,110,90,.25)" strokeWidth={view.w / 1200} /><line y1={view.y - 50} y2={view.y + view.h + 50} x1="0" x2="0" stroke="rgba(120,110,90,.25)" strokeWidth={view.w / 1200} />
            <g onPointerDown={onDownStage} className={`lay-stage${stageSel ? ' sel' : ''}`}>
              <rect x={layout.stage.x - layout.stage.w / 2} y={layout.stage.z - layout.stage.d / 2} width={layout.stage.w} height={layout.stage.d} rx="0.15" fill="url(#lay-stage)" />
              <text x={layout.stage.x} y={layout.stage.z} fontSize={Math.min(0.9, layout.stage.d * 0.45)} textAnchor="middle" dominantBaseline="central" fill="#fff" fontWeight="700">STAGE</text>
            </g>
            {layout.seats.map(s => {
              const on = selSet.has(s.id), dup_ = dupLabels.has(s.label);
              return (
                <g key={s.id} transform={`translate(${s.x} ${s.z}) rotate(${-s.r})`} onPointerDown={e => onDownSeat(e, s)} className={`lay-seat${on ? ' sel' : ''}${dup_ ? ' dup' : ''}`}>
                  <rect x={-SEAT / 2} y={-SEAT / 2 + 0.1} width={SEAT} height={SEAT - 0.1} rx="0.1" />
                  <rect className="back" x={-SEAT / 2} y={-SEAT / 2 - 0.08} width={SEAT} height="0.16" rx="0.06" />
                  {labelsLive && <text transform={`rotate(${s.r})`} y="0.08" fontSize="0.2" textAnchor="middle" dominantBaseline="central">{s.label}</text>}
                </g>
              );
            })}
            {box && <rect className="lay-box" x={Math.min(box.x0, box.x1)} y={Math.min(box.z0, box.z1)} width={Math.abs(box.x1 - box.x0)} height={Math.abs(box.z1 - box.z0)} />}
          </svg>
          <p className="lay-help">Drag seats to move them. Drag on the floor to select many (Shift adds). Mouse wheel zooms, hold Alt or the middle button to pan. Arrow keys nudge, Del deletes, Ctrl+Z undoes. The audience faces the stage at the top.</p>
        </div>

        <div className="lay-sum">
          <span><b>{layout.seats.length}</b> seats</span><span>Capacity setting: <b>{draft.event.capacity}</b></span>
          {draft.event.capacity !== layout.seats.length && <button type="button" className="a-btn tiny" onClick={() => setDraft(d => ({ ...d, event: { ...d.event, capacity: layout.seats.length } }))}>Set capacity to {layout.seats.length}</button>}
          {dupLabels.size > 0 && <span className="lay-warn">Duplicate labels: {[...dupLabels].join(', ')} (they are renamed when you save)</span>}
          <button type="button" className="a-btn tiny" onClick={() => setPreview(p => !p)}>{preview ? 'Hide 3D preview' : 'Show 3D preview'}</button>
        </div>
        {preview && <Suspense fallback={<div className="sk" style={{ height: 300, borderRadius: 16 }} />}><SeatMap3D layout={layout} taken={[]} /></Suspense>}
      </div>

      <div className="lay-side">
        <div className="a-card">
          <h2>Selection</h2>
          {!sel.length && !stageSel && <p className="muted">Click a seat to edit it. Hold Shift or drag a box to pick several.</p>}
          {stageSel && (
            <div className="lay-fields">
              {num('Stage width', layout.stage.w, v => stagePatch({ w: Math.max(1, v) }))}{num('Stage depth', layout.stage.d, v => stagePatch({ d: Math.max(0.5, v) }))}
              {num('Stage x', layout.stage.x, v => stagePatch({ x: v }))}{num('Stage z', layout.stage.z, v => stagePatch({ z: v }))}
            </div>
          )}
          {one && (
            <div className="lay-fields">
              <label className="lay-num wide"><small>Label (what visitors see)</small><input value={one.label} maxLength={8} onChange={e => setOne({ label: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '') })} /></label>
              {num('x', one.x, v => setOne({ x: round(v) }))}{num('z', one.z, v => setOne({ z: round(v) }))}{num('Rotation °', one.r, v => setOne({ r: round(v, 1) }), 5)}
            </div>
          )}
          {sel.length > 1 && <p className="muted">{sel.length} seats selected. Use the toolbar to align, space, rotate or delete them.</p>}
        </div>

        <div className="a-card">
          <h2>Auto-label rows</h2>
          <p className="muted">Names rows A, B, C… from the stage backwards and numbers seats left to right. People stay on the same physical seat.</p>
          <div className="a-inline" style={{ marginTop: 10 }}>
            <select value={relMode} onChange={e => setRelMode(e.target.value)} aria-label="Row shape"><option value="arc">Curved rows</option><option value="straight">Straight rows</option></select>
            <button type="button" className="a-btn" onClick={doRelabel}>Rename seats</button>
          </div>
        </div>

        <div className="a-card">
          <h2>Generate a layout</h2>
          <p className="muted">Starts a new arrangement. You can still move every seat afterwards.</p>
          <div className="lay-fields">
            <label className="lay-num wide"><small>Pattern</small><select value={gen.pattern} onChange={e => setGen({ ...gen, pattern: e.target.value })}><option value="arc">Curved rows (arc)</option><option value="straight">Straight rows</option><option value="blocks">Straight rows with aisles</option></select></label>
            {num('Rows', gen.rows, v => setGen({ ...gen, rows: v }), 1)}{num('Seats per row', gen.perRow, v => setGen({ ...gen, perRow: v }), 1)}
            {num('Seat spacing (m)', gen.spacing, v => setGen({ ...gen, spacing: v }), 0.05)}{num('Row spacing (m)', gen.rowSpacing, v => setGen({ ...gen, rowSpacing: v }), 0.05)}
            {num('First row distance (m)', gen.startDistance, v => setGen({ ...gen, startDistance: v }), 0.2)}
            {gen.pattern === 'blocks' && <>{num('Aisle every N seats', gen.aisleEvery, v => setGen({ ...gen, aisleEvery: v }), 1)}{num('Aisle width (m)', gen.aisleGap, v => setGen({ ...gen, aisleGap: v }), 0.1)}</>}
          </div>
          <button type="button" className="a-btn primary" style={{ marginTop: 12 }} onClick={generate}>Generate {Math.max(0, Math.round(gen.rows) * Math.round(gen.perRow))} seats</button>
        </div>

        <div className="a-card">
          <h2>Raised floor</h2>
          <label className="lay-chk"><input type="checkbox" checked={layout.tier.on} onChange={e => tierPatch({ on: e.target.checked })} /> Rows further back are higher (like a cinema)</label>
          {layout.tier.on && <div className="lay-fields">{num('Step per row (m)', layout.tier.step, v => tierPatch({ step: Math.max(0, v) }), 0.05)}{num('Starts at distance', layout.tier.start, v => tierPatch({ start: Math.max(0, v) }), 0.2)}{num('Row depth', layout.tier.pitch, v => tierPatch({ pitch: Math.max(0.2, v) }), 0.05)}</div>}
          <p className="muted" style={{ marginTop: 12 }}>Changes go live when you press <b>Save changes</b>. Renaming a seat moves the person with it; deleting a seat removes its person's seat (they appear in the Seats tab as "without a seat").</p>
        </div>
      </div>
    </div>
  );
}
