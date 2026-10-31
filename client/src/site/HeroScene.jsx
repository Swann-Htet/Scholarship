import React from 'react';
import { Figure } from './Figure.jsx';

const cx = 300, cy = 300, R = 168, Rb = 242;
const seats = Array.from({ length: 8 }, (_, k) => {
  const a = ((k * 45) - 90) * Math.PI / 180;
  return { k, x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R, bx: cx + Math.cos(a) * Rb, by: cy + Math.sin(a) * Rb };
});

export default function HeroScene({ greetings, fx }) {
  return (
    <svg className="hs" viewBox="-20 -10 640 620" role="img" aria-label="Eight students around a table greeting each other in different languages">
      <defs>
        <radialGradient id="tbG"><stop offset="0" stopColor="#FFB020" stopOpacity=".35" /><stop offset="1" stopColor="#2DD4BF" stopOpacity=".18" /></radialGradient>
      </defs>
      <circle className="ringd" cx={cx} cy={cy} r="215" /><circle className="ringd2" cx={cx} cy={cy} r="118" />
      {seats.map(s => <line key={s.k} className="link" x1={cx} y1={cy} x2={s.x} y2={s.y} />)}
      <circle className="table" cx={cx} cy={cy} r="92" />
      <g className="logo-c"><circle cx={cx - 16} cy={cy} r="30" fill="#FFB020" fillOpacity=".85" /><circle cx={cx + 16} cy={cy} r="30" fill="#2DD4BF" fillOpacity=".75" /></g>
      {seats.map(s => (
        <Figure key={s.k} x={s.x} y={s.y - 8} s={1.12} shirt={s.k} skin={(s.k * 3 + 1) % 4} hair={s.k} hairColor={s.k * 2 + 1}
          mode={s.k % 2 === 0 ? 'wave' : 'idle'} delay={(s.k / 2) * 3} ph={s.k * 0.45} flip={s.x < cx - 5} fx={fx} />
      ))}
      {[0, 2, 4, 6].map((k, i) => {
        const s = seats[k], g = greetings[i] || ['Hello', '', "'Fraunces', serif"];
        return (
          <g key={k} className="bub" style={{ animationDelay: `${i * 3}s` }}>
            <rect x={s.bx - 62} y={s.by - 24} width="124" height="48" rx="24" />
            <text x={s.bx} y={s.by} style={{ fontFamily: g[2] }}>{g[0]}</text>
          </g>
        );
      })}
    </svg>
  );
}
