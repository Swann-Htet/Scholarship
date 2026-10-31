// Seat labels like a cinema: rows A, B, C... and seat numbers 1..cols. Used by the API and the 3D seat map.
export const rowLetter = r => {
  let s = '';
  let n = r + 1;
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
};

export const seatLabels = (capacity, cols) =>
  Array.from({ length: Math.max(0, capacity) }, (_, i) => rowLetter(Math.floor(i / cols)) + ((i % cols) + 1));

/** The order seats are handed out: front row first, from the middle of each row outwards. */
export function seatOrder(capacity, cols) {
  const out = [];
  for (let r = 0; r * cols < capacity; r++) {
    const n = Math.min(cols, capacity - r * cols);
    Array.from({ length: n }, (_, c) => c)
      .sort((a, b) => Math.abs(a - (n - 1) / 2) - Math.abs(b - (n - 1) / 2) || a - b)
      .forEach(c => out.push(rowLetter(r) + (c + 1)));
  }
  return out;
}
