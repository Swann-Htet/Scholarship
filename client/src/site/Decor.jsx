import React from 'react';

const BLOB = 'M300 90C410 80 520 190 510 300C500 410 410 520 300 510C190 500 90 410 90 300C90 190 190 100 300 90Z';
const MORPH_A = 'M300 50C450 100 560 200 510 330C460 450 390 570 270 520C150 470 50 400 90 270C130 140 190 20 300 50Z';
const MORPH_B = 'M340 80C440 60 560 230 500 340C440 450 380 530 260 530C140 530 60 370 100 260C140 150 240 100 340 80Z';
const MORPH_C = 'M320 100C420 70 520 220 490 330C460 440 380 500 270 520C160 540 70 380 110 270C150 160 220 130 320 100Z';

function Blob({ cls, drift, t, dur, from, via }) {
  return (
    <g className={`drift ${drift}`}>
      <g transform={t}>
        <path className={`sb ${cls}`} d={from}>
          <animate attributeName="d" dur={`${dur}s`} repeatCount="indefinite" values={`${from};${via};${from}`} />
        </path>
      </g>
    </g>
  );
}

// Soft animated pastel background: five morphing blobs, nothing else.
export function Scene() {
  return (
    <svg className="scene" viewBox="0 0 1000 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <Blob cls="sb1" drift="d1" t="translate(-140 -80) scale(1.5)" dur="19" from={BLOB} via={MORPH_A} />
      <Blob cls="sb2" drift="d2" t="translate(600 40) scale(1.45)" dur="23" from={MORPH_B} via={BLOB} />
      <Blob cls="sb3" drift="d3" t="translate(-40 380) scale(1.2)" dur="27" from={BLOB} via={MORPH_C} />
      <Blob cls="sb4" drift="d4" t="translate(640 380) scale(1.3)" dur="21" from={MORPH_A} via={BLOB} />
      <Blob cls="sb2" drift="d3" t="translate(330 250) scale(1.1)" dur="25" from={BLOB} via={MORPH_C} />
    </svg>
  );
}

const SHAPES = {
  star: <svg viewBox="0 0 24 24"><path className="fl" d="M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z" /></svg>,
  plus: <svg viewBox="0 0 24 24"><path className="st" d="M12 3V21M3 12H21" /></svg>,
  squig: <svg viewBox="0 0 120 20"><path className="st" pathLength="1" d="M2 10q10-14 20 0t20 0t20 0t20 0t20 0t20 0" /></svg>,
  loop: <svg viewBox="0 0 120 80"><path className="st" pathLength="1" d="M5 62C30 8 72 8 62 42S20 72 72 56 108 22 114 10M104 8l10 2-2 10" /></svg>,
  dots: <svg viewBox="0 0 48 48">{[0, 1, 2].map(r => [0, 1, 2].map(c => <circle key={r + '' + c} className="fl" cx={8 + c * 16} cy={8 + r * 16} r="2.6" />))}</svg>,
  tri: <svg viewBox="0 0 24 24"><path className="st" d="M12 3L22 21H2Z" /></svg>,
  ring: <svg viewBox="0 0 48 48"><circle className="st" cx="24" cy="24" r="20" strokeDasharray="3 7" /></svg>
};

// [section id, shape, left %, top %, size px, colour, animation classes]
const DOODLES = [
  ['hero', 'star', 52, 14, 54, 'a', 'dd-pulse'], ['hero', 'plus', 94, 18, 40, 't', 'dd-spin'], ['hero', 'dots', 90, 70, 80, 'p', 'dd-float'], ['hero', 'squig', 56, 84, 140, 't', 'dd-draw'],
  ['hero', 'loop', 74, 6, 130, 'a', 'dd-draw dm'], ['hero', 'tri', 48, 60, 40, 'p', 'dd-float dm'], ['hero', 'ring', 62, 66, 90, 'a', 'dd-spin dm'], ['hero', 'star', 95, 48, 36, 't', 'dd-float'],
  ['why', 'star', 88, 8, 56, 't', 'dd-pulse'], ['why', 'squig', 4, 78, 130, 'a', 'dd-draw dm'], ['why', 'ring', 78, 70, 70, 'p', 'dd-spin dm'],
  ['objectives', 'plus', 91, 6, 36, 'a', 'dd-spin'], ['objectives', 'star', 3, 42, 40, 't', 'dd-float dm'], ['objectives', 'dots', 90, 88, 64, 'p', 'dd-float dm'],
  ['panel', 'loop', 86, 6, 120, 't', 'dd-draw dm'], ['panel', 'dots', 2, 78, 70, 'a', 'dd-float'], ['panel', 'star', 52, 92, 34, 'p', 'dd-pulse dm'],
  ['rules', 'star', 92, 8, 46, 'a', 'dd-pulse'], ['rules', 'tri', 3, 62, 36, 't', 'dd-float dm'],
  ['schedule', 'squig', 3, 10, 120, 't', 'dd-draw dm'], ['schedule', 'star', 91, 58, 52, 'a', 'dd-float'], ['schedule', 'ring', 4, 84, 64, 'p', 'dd-spin dm'],
  ['team', 'plus', 5, 14, 34, 't', 'dd-spin'], ['team', 'tri', 91, 78, 38, 'a', 'dd-float dm'], ['team', 'star', 90, 8, 40, 'p', 'dd-pulse dm'],
  ['register', 'star', 90, 5, 56, 'a', 'dd-pulse'], ['register', 'squig', 3, 46, 120, 't', 'dd-draw dm'], ['register', 'loop', 84, 86, 110, 'a', 'dd-draw dm'],
  ['info', 'dots', 92, 6, 70, 't', 'dd-float'], ['info', 'star', 3, 80, 44, 'a', 'dd-pulse']
];

export function Doodles({ id }) {
  return DOODLES.map((d, i) => d[0] === id && (
    <div key={i} className={`doodle c-${d[5]} ${d[6]}`} aria-hidden="true" style={{ left: `${d[2]}%`, top: `${d[3]}%`, width: d[4], animationDelay: `${(-i * 0.7).toFixed(1)}s` }}>{SHAPES[d[1]]}</div>
  ));
}

export const Icons = () => (
  <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
    <defs>
      <symbol id="i-lang" viewBox="0 0 24 24"><path d="M4 5h9M8.5 3v2M6 5c0 4 2.5 7 6 8.5M11 5c0 4-2.5 7-6.5 9M13 21l4-10 4 10M14.4 18h5.2" /></symbol>
      <symbol id="i-culture" viewBox="0 0 24 24"><path d="M3 20h18M5 20V10l7-6 7 6v10M9 20v-6h6v6M12 4V2" /></symbol>
      <symbol id="i-incl" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.4" /><path d="M3 19c0-3.3 2.7-6 6-6s6 2.7 6 6M15.5 14.2c3 .1 5.5 2 5.5 4.8" /></symbol>
      <symbol id="i-prac" viewBox="0 0 24 24"><path d="M4 12l5 5L20 6M4 6h6M4 18h2" /></symbol>
      <symbol id="i-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></symbol>
      <symbol id="i-moon" viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /></symbol>
      <symbol id="i-cal" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></symbol>
      <symbol id="i-pin" viewBox="0 0 24 24"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></symbol>
      <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></symbol>
      <symbol id="i-arrow" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></symbol>
      <symbol id="i-down" viewBox="0 0 24 24"><path d="M12 4v14M6 12l6 6 6-6" /></symbol>
      <symbol id="i-dl" viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M4 20h16" /></symbol>
      <symbol id="i-share" viewBox="0 0 24 24"><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6" /></symbol>
      <symbol id="i-shirt" viewBox="0 0 24 24"><path d="M8 3L3 6l2 4 2-1v12h10V9l2 1 2-4-5-3a4 4 0 0 1-8 0z" /></symbol>
      <symbol id="i-food" viewBox="0 0 24 24"><path d="M6 3v8a2 2 0 0 0 2 2v8M10 3v8a2 2 0 0 1-2 2M18 21V3c-2.5 1.5-3.5 4.5-3.5 8H18" /></symbol>
      <symbol id="i-star" viewBox="0 0 24 24"><path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8 6.6 19.7l1.1-6.1L3.2 9.4l6.1-.8z" /></symbol>
      <symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16" /></symbol>
      <symbol id="i-x" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></symbol>
    </defs>
  </svg>
);
