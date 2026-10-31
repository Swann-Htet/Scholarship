import React from 'react';

// A rigged vector person. Joints (shoulders, elbows, neck) are separate groups that rotate around a pivot,
// like a bone skeleton, using SMIL <animateTransform> so every pivot is exact.

export const SKINS = ['#F6D2B0', '#DDA67E', '#B5794F', '#80502F'];
export const HAIRS = ['#2A2230', '#4B2E22', '#1D1A21', '#8A5A2B'];
const SHIRTS = [['#FFC95C', '#E08A00'], ['#5EEAD4', '#0F9E8C'], ['#A99BFF', '#5A47E0'], ['#FF8FB4', '#E0457A']];

export function FigureDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        {SHIRTS.map(([a, b], i) => (
          <linearGradient key={i} id={`sh${i}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient>
        ))}
      </defs>
    </svg>
  );
}

function hairParts(style, c) {
  switch (style % 4) {
    case 1: return [<path key="b" d="M-22 -16C-28 -52 28 -52 22 -16L25 16C16 9 -16 9 -25 16Z" fill={c} />, <path key="f" d="M-19 -18C-14 -34 12 -36 19 -18C10 -24 -8 -24 -19 -18Z" fill={c} />];
    case 2: return [null, <g key="f" fill={c}><circle cx="0" cy="-47" r="10" /><path d="M-19 -14C-24 -50 24 -50 19 -14C13 -30 -13 -30 -19 -14Z" /></g>];
    case 3: return [null, <g key="f" fill={c}><circle cx="-14" cy="-32" r="10" /><circle cx="0" cy="-38" r="11" /><circle cx="14" cy="-32" r="10" /><circle cx="-19" cy="-20" r="8" /><circle cx="19" cy="-20" r="8" /></g>];
    default: return [null, <path key="f" d="M-19 -14C-24 -50 24 -50 19 -14C13 -30 -13 -30 -19 -14Z" fill={c} />];
  }
}

const Rot = ({ values, kt, dur, begin = 0, fx, spline }) => !fx.on ? null : (
  <animateTransform attributeName="transform" type="rotate" values={values} keyTimes={kt} dur={`${(dur / fx.speed).toFixed(2)}s`} begin={`${(begin / fx.speed).toFixed(2)}s`}
    repeatCount="indefinite" calcMode={spline ? 'spline' : 'linear'} keySplines={spline} />
);

// pose: how a raised arm moves over time
const IDLE = (side, ph, fx) => <Rot values={`${side * -2} 0 0;${side * 5} 0 0;${side * -2} 0 0`} kt="0;.5;1" dur={3.4} begin={-ph} fx={fx} />;

function Arm({ side, mode, delay, fx, skin, shirt, ph }) {
  const x = side * 25;
  const waving = mode === 'wave' && side === 1;
  const cheering = mode === 'cheer';
  let upper, fore;
  if (waving) {
    upper = <Rot values="0 0 0;-150 0 0;-150 0 0;0 0 0;0 0 0" kt="0;.04;.22;.27;1" dur={12} begin={delay} fx={fx} spline=".4 0 .2 1;0 0 1 1;.4 0 .2 1;0 0 1 1" />;
    fore = <Rot values="0 0 0;28 0 0;-18 0 0;28 0 0;-18 0 0;28 0 0;-18 0 0;28 0 0;0 0 0;0 0 0" kt="0;.06;.08;.1;.12;.14;.16;.18;.21;1" dur={12} begin={delay} fx={fx} />;
  } else if (cheering) {
    upper = <Rot values={`${side * -140} 0 0;${side * -165} 0 0;${side * -140} 0 0`} kt="0;.5;1" dur={1.3} begin={-ph} fx={fx} />;
    fore = <Rot values={`0 0 0;${side * -18} 0 0;0 0 0`} kt="0;.5;1" dur={1.3} begin={-ph} fx={fx} />;
  } else {
    upper = IDLE(side, ph, fx);
    fore = null;
  }
  return (
    <g transform={`translate(${x} 12)`}>
      <g>
        {upper}
        <rect x="-5.5" y="-3" width="11" height="25" rx="5.5" fill={shirt} />
        <g transform="translate(0 20)">
          <g>
            {fore}
            <rect x="-4.5" y="-2" width="9" height="23" rx="4.5" fill={skin} />
            <circle cy="22" r="5.5" fill={skin} />
          </g>
        </g>
      </g>
    </g>
  );
}

/**
 * x, y, s: placement and scale. shirt/skin/hair/hairColor: palette indexes. mode: 'idle' | 'wave' | 'cheer'.
 * delay: seconds before the first wave (syncs with speech bubbles). flip: mirror the figure. fx: { on, speed }.
 */
export function Figure({ x = 0, y = 0, s = 1, shirt = 0, skin = 0, hair = 0, hairColor = 0, mode = 'idle', delay = 0, flip = false, ph = 0, fx }) {
  const sk = SKINS[skin % 4], hc = HAIRS[hairColor % 4], [back, front] = hairParts(hair, hc), g = `url(#sh${shirt % 4})`, shirtSolid = SHIRTS[shirt % 4][1];
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <g>
        {fx.on && <animateTransform attributeName="transform" type="translate" values="0 0;0 -3;0 0" keyTimes="0;.5;1" dur={`${(3 / fx.speed).toFixed(2)}s`} begin={`${(-ph / fx.speed).toFixed(2)}s`} repeatCount="indefinite" />}
        <ellipse cx="0" cy="52" rx="30" ry="5" fill="#000" opacity=".12" />
        {back}
        <path d="M-30 48C-30 16 -17 6 0 6C17 6 30 16 30 48Z" fill={g} />
        <path d="M-9 6L0 21L9 6Z" fill={sk} /><path d="M-9 6L0 21L9 6" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="2.5" strokeLinejoin="round" />
        <Arm side={-1} mode={mode} delay={delay} fx={fx} skin={sk} shirt={shirtSolid} ph={ph} />
        <Arm side={1} mode={mode} delay={delay} fx={fx} skin={sk} shirt={shirtSolid} ph={ph + 1.1} />
        <g>
          {fx.on && <Rot values="-3 0 -4;3 0 -4;-3 0 -4" kt="0;.5;1" dur={3.6} begin={-ph * 1.3} fx={fx} />}
          <rect x="-6" y="-8" width="12" height="15" rx="5" fill={sk} /><rect x="-6" y="-3" width="12" height="5" fill="#000" opacity=".1" />
          <circle cx="-17" cy="-14" r="4" fill={sk} /><circle cx="17" cy="-14" r="4" fill={sk} />
          <ellipse cx="0" cy="-16" rx="17" ry="19" fill={sk} /><ellipse cx="-6" cy="-23" rx="5" ry="8" fill="#fff" opacity=".2" />
          {front}
        </g>
      </g>
    </g>
  );
}
