// Seat labels like a cinema: rows A, B, C... and seat numbers 1..cols. Used by the API and the 3D seat map.
export const rowLetter = r => {
  let s = '';
  let n = r + 1;
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
};

export const seatLabels = (capacity, cols) =>
  Array.from({ length: Math.max(0, capacity) }, (_, i) => rowLetter(Math.floor(i / cols)) + ((i % cols) + 1));
