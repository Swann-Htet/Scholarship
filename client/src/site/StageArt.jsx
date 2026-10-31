import React from 'react';
import { Figure } from './Figure.jsx';

// Workshop scenes drawn with the same rigged figures as the hero.
export function StageArt({ i, fx }) {
  const F = props => <Figure fx={fx} {...props} />;
  if (i === 0) {
    return (
      <svg className="art" viewBox="0 0 280 280" aria-hidden="true">
        <circle className="ringd" cx="82" cy="150" r="72" style={{ transformOrigin: '82px 150px', stroke: '#FFB020' }} /><circle className="ringd" cx="200" cy="150" r="72" style={{ transformOrigin: '200px 150px', stroke: '#2DD4BF' }} />
        <F x={52} y={118} s={.62} shirt={0} skin={0} hair={0} hairColor={0} ph={0} /><F x={104} y={132} s={.62} shirt={0} skin={2} hair={2} hairColor={1} ph={.7} /><F x={78} y={190} s={.62} shirt={0} skin={1} hair={3} hairColor={3} ph={1.4} />
        <F x={170} y={118} s={.62} shirt={1} skin={3} hair={1} hairColor={2} flip ph={.3} /><F x={222} y={132} s={.62} shirt={1} skin={1} hair={0} hairColor={1} flip ph={1} /><F x={196} y={190} s={.62} shirt={1} skin={0} hair={2} hairColor={0} flip ph={1.7} />
      </svg>
    );
  }
  if (i === 1) {
    return (
      <svg className="art" viewBox="0 0 280 280" aria-hidden="true">
        <line x1="20" y1="150" x2="260" y2="150" stroke="currentColor" strokeOpacity=".18" strokeDasharray="4 8" strokeWidth="2" />
        <g className="swapA"><F x={42} y={110} s={.62} shirt={0} skin={0} hair={0} hairColor={0} ph={0} /><F x={72} y={176} s={.62} shirt={0} skin={2} hair={2} hairColor={1} ph={.8} /><F x={104} y={120} s={.62} shirt={0} skin={1} hair={3} hairColor={3} ph={1.5} /></g>
        <g className="swapB"><F x={160} y={110} s={.62} shirt={1} skin={3} hair={1} hairColor={2} flip ph={.4} /><F x={190} y={176} s={.62} shirt={1} skin={1} hair={0} hairColor={1} flip ph={1.1} /><F x={222} y={120} s={.62} shirt={1} skin={0} hair={2} hairColor={0} flip ph={1.8} /></g>
      </svg>
    );
  }
  if (i === 2) {
    return (
      <svg className="art" viewBox="0 0 280 280" aria-hidden="true">
        <g className="st-bub"><rect x="12" y="24" width="124" height="52" rx="26" fill="#FFB020" /><path d="M58 74l-8 22 28-20z" fill="#FFB020" /><text x="74" y="50" style={{ fontFamily: "'Prompt', sans-serif" }}>สวัสดี</text></g>
        <g className="st-bub b2"><rect x="144" y="86" width="124" height="52" rx="26" fill="#2DD4BF" /><path d="M222 136l8 22-28-20z" fill="#2DD4BF" /><text x="206" y="112" style={{ fontFamily: "'Pyidaungsu','Padauk',sans-serif" }}>မင်္ဂလာပါ</text></g>
        <F x={72} y={188} s={.95} shirt={0} skin={1} hair={1} hairColor={1} mode="wave" delay={0} ph={0} />
        <F x={208} y={196} s={.95} shirt={1} skin={2} hair={2} hairColor={0} mode="wave" delay={6} flip ph={1} />
      </svg>
    );
  }
  return (
    <svg className="art" viewBox="0 0 280 280" aria-hidden="true">
      {[[55, 92], [225, 92], [55, 205], [225, 205]].map((p, n) => <path key={n} className="edge" pathLength="1" d={`M${p[0]} ${p[1]}L140 148`} stroke={n % 2 ? '#2DD4BF' : '#FFB020'} fill="none" strokeWidth="2.4" strokeLinecap="round" style={{ animationDelay: `${n * .4}s` }} />)}
      <circle cx="140" cy="148" r="22" fill="url(#gM)" className="nodeC" />
      <F x={55} y={90} s={.55} shirt={0} skin={0} hair={0} hairColor={0} mode="cheer" ph={0} /><F x={225} y={90} s={.55} shirt={1} skin={3} hair={1} hairColor={2} mode="cheer" ph={.5} flip />
      <F x={55} y={203} s={.55} shirt={2} skin={1} hair={3} hairColor={3} mode="cheer" ph={.9} /><F x={225} y={203} s={.55} shirt={3} skin={2} hair={2} hairColor={1} mode="cheer" ph={.2} flip />
      <defs><linearGradient id="gM" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#FFB020" /><stop offset="1" stopColor="#2DD4BF" /></linearGradient></defs>
    </svg>
  );
}
