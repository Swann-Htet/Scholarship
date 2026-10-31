// Seat layout engine, shared by the API (validation, seat order) and the client (3D map, admin layout editor).
// World units are roughly metres. The stage sits near z = 0 and the audience is at positive z, facing the stage.
// Each seat: { id, label, x, z, r } where r is the rotation in degrees (180 = facing the stage straight on).
import { rowLetter } from './seats.js';

const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

/**
 * Build a set of seats from a pattern.
 * pattern: 'arc' (curved rows), 'straight' (straight rows) or 'blocks' (straight rows split by aisles).
 */
export function generateLayout({ pattern = 'arc', rows = 8, perRow = 10, spacing = 0.64, rowSpacing = 1.25, startDistance = 3.6, aisleEvery = 5, aisleGap = 0.9 } = {}) {
  rows = Math.max(1, Math.min(40, Math.round(rows))); perRow = Math.max(1, Math.min(60, Math.round(perRow)));
  const seats = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < perRow; c++) {
      const label = rowLetter(r) + (c + 1);
      let x, z, rot;
      if (pattern === 'arc') {
        const R = startDistance + r * rowSpacing, th = (c - (perRow - 1) / 2) * (spacing / R);
        x = Math.sin(th) * R; z = Math.cos(th) * R; rot = (th * 180) / Math.PI + 180;
      } else {
        z = startDistance + r * rowSpacing; rot = 180;
        let shift = 0;
        if (pattern === 'blocks' && aisleEvery > 0) { const aisles = Math.floor((perRow - 1) / aisleEvery); shift = (Math.floor(c / aisleEvery) - aisles / 2) * aisleGap; }
        x = (c - (perRow - 1) / 2) * spacing + shift;
      }
      seats.push({ id: 's_' + label, label, x: round(x), z: round(z), r: round(rot, 1) });
    }
  }
  const xs = seats.map(s => s.x), width = Math.max(...xs) - Math.min(...xs);
  return {
    stage: { x: 0, z: -0.4, w: round(Math.max(4, Math.min(16, width * 0.55)), 1), d: 2.2 },
    tier: { on: true, step: 0.3, start: startDistance, pitch: rowSpacing },
    seats
  };
}

export const defaultLayout = () => generateLayout({ pattern: 'arc', rows: 8, perRow: 10 });

/** Floor height of a seat (rows further back are raised when tiers are on). */
export function seatY(layout, s) {
  const t = layout.tier;
  if (!t?.on) return 0;
  return Math.max(0, (Math.hypot(s.x - layout.stage.x, s.z - layout.stage.z) - t.start) / (t.pitch || 1)) * t.step;
}

const natural = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true });

/** Order seats are handed out: closest to the stage first, from the middle outwards. */
export function seatOrder(layout) {
  const st = layout.stage, fx = st.x, fz = st.z + st.d / 2;
  return [...layout.seats]
    .sort((a, b) => Math.hypot(a.x - fx, a.z - fz) - Math.hypot(b.x - fx, b.z - fz) || Math.abs(a.x - fx) - Math.abs(b.x - fx) || natural(a.label, b.label))
    .map(s => s.label);
}

export const layoutLabels = layout => layout.seats.map(s => s.label);

/**
 * Re-label seats as rows A, B, C... (closest to the stage first) with numbers left to right.
 * mode 'arc' groups rows by distance from the stage, 'straight' groups by depth (z).
 */
export function relabel(layout, mode = 'arc', tolerance = 0.55) {
  const st = layout.stage, key = s => (mode === 'arc' ? Math.hypot(s.x - st.x, s.z - st.z) : s.z);
  const sorted = [...layout.seats].sort((a, b) => key(a) - key(b));
  const rows = [];
  sorted.forEach(s => { const last = rows[rows.length - 1]; if (last && Math.abs(key(s) - last.k) <= tolerance) { last.items.push(s); last.k = (last.k * (last.items.length - 1) + key(s)) / last.items.length; } else rows.push({ k: key(s), items: [s] }); });
  const label = new Map();
  rows.forEach((row, ri) => row.items.sort((a, b) => a.x - b.x).forEach((s, i) => label.set(s.id, rowLetter(ri) + (i + 1))));
  return { ...layout, seats: layout.seats.map(s => ({ ...s, label: label.get(s.id) })) };
}

/** Make labels unique (A1, A1 -> A1, A1-2). */
export function uniqueLabels(seats) {
  const seen = new Set();
  return seats.map(s => { let l = s.label || 'S', n = 2; while (seen.has(l)) l = `${s.label || 'S'}-${n++}`; seen.add(l); return l === s.label ? s : { ...s, label: l }; });
}

export function layoutBounds(layout) {
  const xs = layout.seats.map(s => s.x).concat([layout.stage.x - layout.stage.w / 2, layout.stage.x + layout.stage.w / 2]);
  const zs = layout.seats.map(s => s.z).concat([layout.stage.z - layout.stage.d / 2, layout.stage.z + layout.stage.d / 2]);
  return { xMin: Math.min(...xs), xMax: Math.max(...xs), zMin: Math.min(...zs), zMax: Math.max(...zs) };
}
