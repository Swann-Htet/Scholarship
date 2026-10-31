import React from 'react';
import { Figure } from './Figure.jsx';

// Workshop scenes drawn with the same rigged figures as the hero.
export function StageArt({ i, fx }) {
  const F = props => <Figure fx={fx} {...props} />;
  const defs = (
    <defs>
      <radialGradient id="zA"><stop offset="0" stopColor="#FFC95C" stopOpacity=".55" /><stop offset="1" stopColor="#FFC95C" stopOpacity=".12" /></radialGradient>
      <radialGradient id="zB"><stop offset="0" stopColor="#5EEAD4" stopOpacity=".55" /><stop offset="1" stopColor="#5EEAD4" stopOpacity=".12" /></radialGradient>
    </defs>
  );
  if (i === 0) {
    return (
      <svg className="art" viewBox="0 0 280 280" aria-hidden="true">
        {defs}
        <circle cx="84" cy="150" r="76" fill="url(#zA)" /><circle cx="196" cy="150" r="76" fill="url(#zB)" />
        <circle className="ringd" cx="84" cy="150" r="76" fill="none" stroke="#E08A00" strokeWidth="1.8" style={{ transformOrigin: '84px 150px' }} />
        <circle className="ringd" cx="196" cy="150" r="76" fill="none" stroke="#0F9E8C" strokeWidth="1.8" style={{ transformOrigin: '196px 150px' }} />
        <F x={56} y={140} s={.74} shirt={0} skin={0} hair={0} hairColor={0} ph={0} /><F x={112} y={132} s={.74} shirt={0} skin={2} hair={2} hairColor={1} ph={.7} /><F x={84} y={194} s={.74} shirt={0} skin={1} hair={3} hairColor={3} ph={1.4} />
        <F x={168} y={132} s={.74} shirt={1} skin={3} hair={1} hairColor={2} flip ph={.3} /><F x={224} y={140} s={.74} shirt={1} skin={1} hair={0} hairColor={1} flip ph={1} /><F x={196} y={194} s={.74} shirt={1} skin={0} hair={2} hairColor={0} flip ph={1.7} />
      </svg>
    );
  }
  if (i === 1) {
    return (
      <svg className="art" viewBox="0 0 280 280" aria-hidden="true">
        {defs}
        <line x1="20" y1="150" x2="260" y2="150" stroke="currentColor" strokeOpacity=".18" strokeDasharray="4 8" strokeWidth="2" />
        <g className="swapA"><circle cx="72" cy="150" r="64" fill="url(#zA)" /><F x={44} y={128} s={.66} shirt={0} skin={0} hair={0} hairColor={0} ph={0} /><F x={100} y={124} s={.66} shirt={0} skin={2} hair={2} hairColor={1} ph={.8} /><F x={72} y={184} s={.66} shirt={0} skin={1} hair={3} hairColor={3} ph={1.5} /></g>
        <g className="swapB"><circle cx="198" cy="150" r="64" fill="url(#zB)" /><F x={170} y={124} s={.66} shirt={1} skin={3} hair={1} hairColor={2} flip ph={.4} /><F x={226} y={128} s={.66} shirt={1} skin={1} hair={0} hairColor={1} flip ph={1.1} /><F x={198} y={184} s={.66} shirt={1} skin={0} hair={2} hairColor={0} flip ph={1.8} /></g>
      </svg>
    );
  }
  if (i === 2) {
    return (
      <svg className="art" viewBox="0 0 280 280" aria-hidden="true">
        <ellipse cx="140" cy="236" rx="118" ry="16" fill="#000" opacity=".07" />
        <g className="st-bub"><rect x="12" y="24" width="124" height="52" rx="26" fill="#FFB020" /><path d="M58 74l-8 22 28-20z" fill="#FFB020" /><text x="74" y="50" style={{ fontFamily: "'Prompt', sans-serif" }}>สวัสดี</text></g>
        <g className="st-bub b2"><rect x="144" y="86" width="124" height="52" rx="26" fill="#2DD4BF" /><path d="M222 136l8 22-28-20z" fill="#2DD4BF" /><text x="206" y="112" style={{ fontFamily: "'Noto Serif Myanmar','Padauk',serif" }}>မင်္ဂလာပါ</text></g>
        <F x={72} y={188} s={.95} shirt={0} skin={1} hair={1} hairColor={1} mode="wave" delay={0} ph={0} />
        <F x={208} y={196} s={.95} shirt={1} skin={2} hair={2} hairColor={0} mode="wave" delay={6} flip ph={1} />
      </svg>
    );
  }
  return (
    <svg className="art" viewBox="0 0 280 280" aria-hidden="true">
      <defs><linearGradient id="gM" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#FFB020" /><stop offset="1" stopColor="#2DD4BF" /></linearGradient></defs>
      <circle cx="140" cy="148" r="86" fill="url(#zB)" opacity=".5" />
      <circle className="ringd" cx="140" cy="148" r="86" fill="none" stroke="url(#gM)" strokeWidth="1.6" style={{ transformOrigin: '140px 148px', opacity: .55 }} />
      <circle className="pulse-ring" cx="140" cy="148" r="22" fill="none" stroke="url(#gM)" strokeWidth="2" />
      <circle cx="140" cy="148" r="18" fill="url(#gM)" className="nodeC" />
      <path d="M131 148l6 6 12-13" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <F x={55} y={90} s={.55} shirt={0} skin={0} hair={0} hairColor={0} mode="cheer" ph={0} /><F x={225} y={90} s={.55} shirt={1} skin={3} hair={1} hairColor={2} mode="cheer" ph={.5} flip />
      <F x={55} y={203} s={.55} shirt={2} skin={1} hair={3} hairColor={3} mode="cheer" ph={.9} /><F x={225} y={203} s={.55} shirt={3} skin={2} hair={2} hairColor={1} mode="cheer" ph={.2} flip />
    </svg>
  );
}
