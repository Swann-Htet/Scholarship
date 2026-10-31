import React, { useEffect, useState } from 'react';
import { Doodles } from './Decor.jsx';
import HeroScene from './HeroScene.jsx';
import { StageArt } from './StageArt.jsx';
import { sfx } from '../lib/sound.js';
import { saveVisitorTheme } from '../lib/theme.js';

const Ic = ({ id }) => <svg className="ic" aria-hidden="true"><use href={`#${id}`} /></svg>;
const Head = ({ kicker, children }) => (<><p className="kicker" data-reveal>{kicker}</p><h2 className="h2" data-reveal>{children}</h2></>);

/* ---------------- Nav ---------------- */
const NAV = [['why', 'Why'], ['panel', 'Panel'], ['workshop', 'Workshop'], ['rules', 'Rules'], ['schedule', 'Schedule'], ['info', 'Info']];

export function Nav({ settings }) {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(document.documentElement.getAttribute('data-theme') === 'dark');
  const toggleTheme = () => {
    const next = dark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next); saveVisitorTheme(next); setDark(!dark); sfx('toggle');
  };
  useEffect(() => { const k = e => e.key === 'Escape' && setOpen(false); addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, []);
  return (
    <header className="nav" id="nav">
      <a className="logo" href="#top" aria-label="Home">
        <svg viewBox="0 0 40 28" width="40" height="28" aria-hidden="true"><circle className="lg-a" cx="14" cy="14" r="11" /><circle className="lg-b" cx="26" cy="14" r="11" /></svg>
        <span>{settings.hero.line1.split(' ').map((w, i) => <React.Fragment key={i}>{i > 0 && <br />}{w}</React.Fragment>)}</span>
      </a>
      <nav className={`links${open ? ' open' : ''}`} id="links" aria-label="Sections" onClick={e => e.target.closest('a') && setOpen(false)}>
        {NAV.filter(([id]) => settings.sections[id] !== false).map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
      </nav>
      <div className="nav-actions">
        <button className="icon-btn" type="button" aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} onClick={toggleTheme}>
          <svg className="ic"><use href={dark ? '#i-moon' : '#i-sun'} /></svg>
        </button>
        <a className="btn btn-sm mag nav-cta" href="#register" id="navCta">Register</a>
        <button className="icon-btn menu-btn" type="button" aria-expanded={open} aria-controls="links" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => { setOpen(!open); sfx('toggle'); }}>
          <svg className="ic"><use href={open ? '#i-x' : '#i-menu'} /></svg>
        </button>
      </div>
    </header>
  );
}

/* ---------------- Hero ---------------- */
function Split({ text, start, className = '' }) {
  let n = start, k = 0;
  const total = Math.max(1, text.length - 1);
  return (
    <span className={`line ${className}`}>
      {text.split(' ').map((w, wi) => (
        <React.Fragment key={wi}>
          {wi > 0 && ' '}
          <span className="word">{[...w].map((ch, ci) => <span key={ci} className="ch" style={{ '--i': n++, '--p': Math.round((k++ / total) * 100) }}>{ch}</span>)}</span>
        </React.Fragment>
      ))}
    </span>
  );
}

function Greeting({ greetings }) {
  const [i, setI] = useState(0);
  const [out, setOut] = useState(false);
  useEffect(() => {
    if (greetings.length < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => {
      if (document.hidden) return;
      setOut(true);
      setTimeout(() => { setI(x => (x + 1) % greetings.length); setOut(false); }, 420);
    }, 2800);
    return () => clearInterval(id);
  }, [greetings.length]);
  const g = greetings[i % greetings.length] || ['Hello', 'English', ''];
  return (
    <div className="greet" aria-hidden="true">
      <span className={`greet-word ${out ? 'out' : 'in'}`} style={{ fontFamily: g[2] || undefined, color: i % 2 ? 'var(--teal-t)' : 'var(--amber-t)' }}>{g[0]}</span>
      <span className={`greet-lang ${out ? 'out' : 'in'}`}>{g[1]}</span>
    </div>
  );
}

export function Hero({ settings, fx }) {
  const e = settings.event, h = settings.hero;
  return (
    <section className="hero" id="hero">
      <Doodles id="hero" />
      <div className="hero-inner">
        <div className="hero-text">
          <p className="eyebrow">{h.eyebrow}</p>
          <h1 className="display" aria-label={`${h.line1}: ${h.line2}`}>
            <Split text={h.line1} start={0} />
            <Split text={h.line2} start={18} className="accent-grad" />
          </h1>
          <Greeting greetings={settings.content.greetings} />
          <ul className="meta">
            <li><Ic id="i-cal" />{e.dateLabel}</li><li><Ic id="i-clock" />{e.startTime} to {e.endTime}</li><li><Ic id="i-pin" />{e.venue}</li>
          </ul>
          <div className="cta-row">
            <a className="btn mag" href="#register">{h.registerLabel} <Ic id="i-arrow" /></a>
            <a className="btn btn-ghost mag" href="#why">What is this? <Ic id="i-down" /></a>
          </div>
        </div>
        <div className="hero-scene"><HeroScene greetings={settings.content.greetings} fx={fx} /></div>
      </div>
      <a className="scroll-cue" href="#why" aria-label="Scroll down"><i /></a>
    </section>
  );
}

export function Marquee({ settings }) {
  const items = [...settings.content.greetings.map(g => ({ t: g[0], f: g[2] })), ...settings.content.rules.map(r => ({ t: r[0] }))];
  const row = items.map((it, i) => <span key={i} style={it.f ? { fontFamily: it.f } : undefined}>{it.t}</span>);
  return <div className="marquee" aria-hidden="true"><div className="marquee-track">{row}{row}</div></div>;
}

/* ---------------- Content sections ---------------- */
const WHY_ART = [
  <><circle className="ring draw" cx="30" cy="40" r="20" pathLength="1" stroke="#FFB020" /><circle className="ring draw" cx="52" cy="40" r="20" pathLength="1" stroke="#2DD4BF" /></>,
  <><path className="ring draw" d="M10 44c10-18 20-18 30 0s20 18 30 0" pathLength="1" stroke="#FFB020" /><path className="ring draw" d="M10 54c10-18 20-18 30 0s20 18 30 0" pathLength="1" stroke="#2DD4BF" /></>,
  <><path className="ring draw" d="M12 60V20h20M68 20v40H48" pathLength="1" stroke="#FFB020" /><path className="ring draw" d="M28 60h24M40 20v40" pathLength="1" stroke="#2DD4BF" /></>
];

export function Why({ settings }) {
  const c = settings.content;
  return (
    <section className="sec" id="why"><Doodles id="why" />
      <div className="wrap">
        <Head kicker="Why this matters">{c.whyTitle}</Head>
        <div className="why-grid">
          {c.why.map((w, i) => (
            <article key={i} className="why-card" data-reveal style={{ '--i': i }}>
              <svg className="why-art" viewBox="0 0 80 80" aria-hidden="true">{WHY_ART[i % 3]}</svg>
              <h3>{w[0]}</h3><p>{w[1]}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Objectives({ settings }) {
  return (
    <section className="sec veil" id="objectives"><Doodles id="objectives" />
      <div className="wrap">
        <Head kicker="Objectives">Five things we will practise together.</Head>
        <div className="obj-grid">
          {settings.content.objectives.map((o, i) => <article key={i} className="obj tilt" data-reveal style={{ '--i': i }}><span className="no">0{i + 1}</span><h3>{o[0]}</h3><p>{o[1]}</p></article>)}
        </div>
      </div>
    </section>
  );
}

export function Panel({ settings }) {
  const list = settings.content.panel;
  const [a, setA] = useState(0);
  const p = list[a] || list[0];
  const key = e => {
    let n = a;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (a + 1) % list.length; else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (a - 1 + list.length) % list.length; else return;
    e.preventDefault(); setA(n); document.getElementById('tab' + n)?.focus(); sfx('click');
  };
  if (!p) return null;
  return (
    <section className="sec" id="panel"><Doodles id="panel" />
      <div className="wrap">
        <Head kicker="Panel discussion">Four conversations to open the day.</Head>
        <div className="tabs" data-reveal>
          <div className="tablist" role="tablist" aria-label="Discussion areas" onKeyDown={key}>
            {list.map((t, i) => (
              <button key={i} id={'tab' + i} className="tab" role="tab" aria-selected={i === a} aria-controls="tabpanel" tabIndex={i === a ? 0 : -1} onClick={() => setA(i)}><Ic id={t.icon} /><span>{t.k}</span></button>
            ))}
          </div>
          <div className="tabpanel" id="tabpanel" role="tabpanel" tabIndex={0} aria-labelledby={'tab' + a}>
            <div className="tp-in" key={a}><h3>{p.t}</h3><p>{p.d}</p></div>
            <svg className="tp-art" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><use href={`#${p.icon}`} /></svg>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Workshop({ settings, fx }) {
  return (
    <section className="workshop" id="workshop">
      <div className="ws-sticky">
        <div className="ws-head wrap">
          <p className="kicker">Workshop</p><h2 className="h2">From familiar circles to one table.</h2>
          <div className="ws-prog" aria-hidden="true"><i id="wsBar" /></div>
        </div>
        <div className="ws-track" id="wsTrack">
          {settings.content.stages.map((s, i) => (
            <article key={i} className="stage" data-reveal>
              <StageArt i={i} fx={fx} />
              <div><span className="n">STAGE {s.n}</span><h3>{s.t}</h3><p>{s.d}</p></div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const RULE_COLORS = ['var(--amber)', 'var(--teal)', 'var(--amber)', 'var(--teal)', 'var(--amber)'];
const RULE_DECO = [
  <path className="ring draw" d="M20 90h160M20 60h160M20 120h160" stroke="currentColor" pathLength="1" />,
  <><path className="ring draw" d="M30 100c0-40 40-70 70-40s40 40 70 0" pathLength="1" stroke="currentColor" /><circle className="ring draw" cx="100" cy="100" r="40" pathLength="1" stroke="currentColor" /></>,
  <path className="ring draw" d="M20 100h60l20-40 20 80 20-40h40" pathLength="1" stroke="currentColor" />,
  <><circle className="ring draw" cx="70" cy="100" r="40" pathLength="1" stroke="currentColor" /><circle className="ring draw" cx="130" cy="100" r="40" pathLength="1" stroke="currentColor" /></>,
  <><path className="ring draw" d="M30 150L100 40l70 110z" pathLength="1" stroke="currentColor" /><path className="ring draw" d="M60 150l40-70 40 70" pathLength="1" stroke="currentColor" /></>
];

export function Rules({ settings }) {
  return (
    <section className="sec veil" id="rules"><Doodles id="rules" />
      <div className="wrap">
        <Head kicker="Five Rules for Co-existing">The backbone of the day.</Head>
        <div className="rule-stack">
          {settings.content.rules.map((r, i) => (
            <article key={i} className="rule" style={{ '--k': i, '--c': RULE_COLORS[i % 5], color: 'var(--fg)' }}>
              <span className="rn">0{i + 1}</span><h3>{r[0]}</h3><p>{r[1]}</p>
              <svg className="deco" viewBox="0 0 200 200" style={{ color: RULE_COLORS[i % 5] }} aria-hidden="true">{RULE_DECO[i % 5]}</svg>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Schedule({ settings }) {
  return (
    <section className="sec" id="schedule"><Doodles id="schedule" />
      <div className="wrap">
        <Head kicker="Schedule">{settings.event.startTime} to {settings.event.endTime}, one day.</Head>
        <ol className="tl" id="tl">
          <li className="tl-line" aria-hidden="true"><i id="tlFill" /></li>
          {settings.content.schedule.map((s, i) => (
            <li key={i} className="tl-item" data-i={i} data-reveal>
              <svg className="tl-node" viewBox="0 0 24 24" aria-hidden="true"><circle className="pulse-c" cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="8" /></svg>
              <span className="tl-time">{s[0]}</span><h3>{s[1]}</h3><p>{s[2]}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Team({ settings }) {
  return (
    <section className="sec veil" id="team"><Doodles id="team" />
      <div className="wrap">
        <Head kicker="The team">Students organising for students.</Head>
        <div className="team-grid">
          {settings.content.team.map((m, i) => (
            <article key={i} className="member" tabIndex={0} data-reveal style={{ '--i': i }}>
              <svg className="av" viewBox="0 0 46 46" aria-hidden="true"><circle cx="18" cy="23" r="13" fill="#FFB020" fillOpacity=".6" /><circle cx="28" cy="23" r="13" fill="#2DD4BF" fillOpacity=".5" /></svg>
              <h3>{m[0]}</h3><p>{m[1]}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Info({ settings }) {
  const e = settings.event;
  return (
    <section className="sec veil" id="info"><Doodles id="info" />
      <div className="wrap">
        <Head kicker="Practical information">What to expect.</Head>
        <div className="info-grid">
          <div className="card info" data-reveal style={{ '--i': 0 }}><Ic id="i-shirt" /><h3>Dress code</h3><p>Black and white, with jeans.</p></div>
          <div className="card info" data-reveal style={{ '--i': 1 }}><Ic id="i-food" /><h3>Lunch</h3><p>A lunch box is provided.</p></div>
          <div className="card info" data-reveal style={{ '--i': 2 }}><Ic id="i-star" /><h3>MFU 333</h3><p>Recognition is pending approval from GRD and the university.</p></div>
          <div className="card info" data-reveal style={{ '--i': 3 }}><Ic id="i-clock" /><h3>Registration closes</h3><p>{e.registrationCloses}.</p></div>
        </div>
        <div className="faq" data-reveal>
          {settings.content.faq.map((f, i) => <details key={i}><summary>{f[0]}<i /></summary><div className="ans"><p>{f[1]}</p></div></details>)}
        </div>
      </div>
    </section>
  );
}

export function Footer({ settings }) {
  const e = settings.event;
  return (
    <footer className="foot">
      <div className="wrap foot-in">
        <div>
          <p className="foot-title">{e.title}</p>
          <p className="foot-sub">Organised by the Myanmar Students' Association with GRD, {e.campus}.</p>
          {e.contactEmail && <p className="foot-sub">Contact: <a href={`mailto:${e.contactEmail}`} style={{ textDecoration: 'underline' }}>{e.contactEmail}</a></p>}
        </div>
        <a className="btn btn-ghost btn-sm" href="#top">Back to top</a>
      </div>
    </footer>
  );
}
