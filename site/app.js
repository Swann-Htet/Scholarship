(function () {
  'use strict';
  const E = window.EVENT;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => 1 - Math.pow(1 - t, 3);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  const DESK = matchMedia('(min-width: 861px)');
  const HOVER = matchMedia('(hover: hover) and (pointer: fine)');
  const root = document.documentElement;

  /* ================= Sound: only click and hover effects, synthesised, no toggle, no autoplay ================= */
  const Sound = {
    ctx: null, vol: 0.3, last: {},
    ensure() {
      if (!this.ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return false; this.ctx = new C(); }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return true;
    },
    tone(f, at, d, o = {}) {
      const c = this.ctx, t = c.currentTime + at, osc = c.createOscillator(), g = c.createGain();
      osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(f, t);
      if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + d);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime((o.g || 0.4) * this.vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      osc.connect(g).connect(c.destination); osc.start(t); osc.stop(t + d + 0.05);
    },
    noise(at, d, f0, f1, gain = 0.5) {
      const c = this.ctx, len = Math.floor(c.sampleRate * d), buf = c.createBuffer(1, len, c.sampleRate), data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const s = c.createBufferSource(); s.buffer = buf;
      const flt = c.createBiquadFilter(); flt.type = 'bandpass'; flt.Q.value = 1.2;
      const t = c.currentTime + at; flt.frequency.setValueAtTime(f0, t); flt.frequency.exponentialRampToValueAtTime(f1, t + d);
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain * this.vol, t + d * 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      s.connect(flt).connect(g).connect(c.destination); s.start(t);
    },
    cues: {
      hover: s => s.tone(1800 * (0.97 + Math.random() * 0.06), 0, .05, { g: .08 }),
      click: s => s.tone(420 * (0.97 + Math.random() * 0.06), 0, .12, { to: 220, g: .5 }),
      focus: s => s.tone(1400, 0, .04, { g: .1 }),
      chipOn: s => s.tone(620, 0, .14, { to: 900, g: .4 }),
      chipOff: s => s.tone(520, 0, .14, { to: 330, g: .35 }),
      valid: s => { s.tone(1320, 0, .14, { g: .3 }); s.tone(1760, .05, .2, { g: .22 }); },
      invalid: s => s.tone(150, 0, .22, { to: 90, g: .55 }),
      step: s => s.noise(0, .32, 500, 3200, .5),
      back: s => s.noise(0, .32, 3200, 500, .5),
      card: s => s.noise(0, .22, 900, 2600, .3),
      section: s => s.noise(0, .45, 1200, 4200, .22),
      node: (s, o) => s.tone([392, 440, 494, 523, 587, 659, 698, 784, 880][(o.i || 0) % 9], 0, .28, { type: 'triangle', g: .45 }),
      toggle: s => { s.tone(700, 0, .08, { g: .35 }); s.tone(1050, .07, .12, { g: .3 }); },
      success: s => { [523, 659, 784].forEach((f, i) => s.tone(f, i * .13, .5, { g: .4 })); s.tone(1568, .42, .8, { g: .18 }); s.tone(2093, .52, .8, { g: .12 }); },
      error: s => { s.tone(392, 0, .22, { g: .4 }); s.tone(262, .16, .35, { g: .4 }); },
      alert: s => s.tone(660, 0, .25, { g: .3 })
    },
    play(name, o = {}) {
      if (!this.cues[name] || document.hidden || !this.ctx || this.ctx.state !== 'running') return;
      const gap = o.gap == null ? 120 : o.gap, now = performance.now();
      if (now - (this.last[name] || 0) < gap) return;
      this.last[name] = now;
      try { this.cues[name](this, o); } catch (e) {}
    }
  };
  const sfx = (n, o) => Sound.play(n, o);
  // the browser only allows audio after a gesture, so the first tap/click/key quietly prepares it
  ['pointerdown', 'keydown', 'touchstart'].forEach(e => addEventListener(e, () => Sound.ensure(), { passive: true, capture: true }));
  document.addEventListener('click', e => { if (e.target.closest('a, button, summary, label, .chip, .tab')) sfx('click'); });

  /* ================= Toast ================= */
  let toastT;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }

  /* ================= Render config-driven content ================= */
  const fmtDate = E.dateLabel;
  const icon = id => `<svg class="ic" aria-hidden="true"><use href="#${id}"/></svg>`;
  $('#heroMeta').innerHTML = `<li>${icon('i-cal')}${fmtDate}</li><li>${icon('i-clock')}${E.startTime} to ${E.endTime}</li><li>${icon('i-pin')}${E.venue}</li>`;
  $('#marquee').innerHTML = (() => { const items = [...E.greetings.map(g => `<span style="font-family:${g[2]}">${g[0]}</span>`), ...E.rules.map(r => `<span>${r[0]}</span>`)]; const html = items.join(''); return html + html; })();
  $('#objGrid').innerHTML = E.objectives.map((o, i) => `<article class="obj tilt" data-reveal style="--i:${i}"><span class="no">0${i + 1}</span><h3>${o[0]}</h3><p>${o[1]}</p></article>`).join('');
  $('#closeText').textContent = `${E.registrationCloses}, once lunch boxes are counted.`;
  $('#footContact').innerHTML = E.contactEmail ? `Contact: <a href="mailto:${E.contactEmail}" style="text-decoration:underline">${E.contactEmail}</a>` : '';
  $('#faq').innerHTML = E.faq.map(f => `<details><summary>${f[0]}<i></i></summary><div class="ans"><p>${f[1]}</p></div></details>`).join('');
  $('#dl-country').innerHTML = E.countries.map(c => `<option value="${c}">`).join('');
  $('#dl-faculty').innerHTML = E.faculties.map(c => `<option value="${c}">`).join('');
  $('#teamGrid').innerHTML = E.team.map((m, i) => `<article class="member" tabindex="0" data-reveal style="--i:${i}">
    <svg class="av" viewBox="0 0 46 46" aria-hidden="true"><circle cx="18" cy="23" r="13" fill="#FFB020" fill-opacity=".6"/><circle cx="28" cy="23" r="13" fill="#2DD4BF" fill-opacity=".5"/></svg>
    <h3>${m[0]}</h3><p>${m[1]}</p></article>`).join('');

  // Panel tabs
  (function () {
    const list = $('#tablist'), panel = $('#tabpanel');
    list.innerHTML = E.panel.map((p, i) => `<button class="tab" role="tab" id="tab${i}" aria-selected="${i === 0}" aria-controls="tabpanel" tabindex="${i === 0 ? 0 : -1}">${icon(p.icon)}<span>${p.k}</span></button>`).join('');
    function show(i, byUser) {
      const p = E.panel[i];
      $$('.tab', list).forEach((b, j) => { b.setAttribute('aria-selected', j === i); b.tabIndex = j === i ? 0 : -1; });
      panel.setAttribute('aria-labelledby', 'tab' + i);
      panel.innerHTML = `<div class="tp-in"><h3>${p.t}</h3><p>${p.d}</p></div><svg class="tp-art" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#${p.icon}"/></svg>`;
      if (byUser) sfx('click');
    }
    list.addEventListener('click', e => { const b = e.target.closest('.tab'); if (b) show($$('.tab', list).indexOf(b), true); });
    list.addEventListener('keydown', e => {
      const tabs = $$('.tab', list); let i = tabs.indexOf(document.activeElement); if (i < 0) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') i = (i + 1) % tabs.length; else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') i = (i - 1 + tabs.length) % tabs.length; else return;
      e.preventDefault(); tabs[i].focus(); show(i, true);
    });
    show(0);
  })();

  // Workshop stages with animated vector art
  const stageArt = [
    `<svg class="art g1" viewBox="0 0 280 280" aria-hidden="true"><circle class="a-st" cx="90" cy="140" r="78" stroke="#FFB020" stroke-opacity=".4"/><circle class="a-st" cx="190" cy="140" r="78" stroke="#2DD4BF" stroke-opacity=".4"/>
      ${[[70, 110], [110, 120], [85, 150], [112, 165], [68, 178], [96, 95]].map(p => `<circle class="a-dot-a" cx="${p[0]}" cy="${p[1]}" r="9"/>`).join('')}
      ${[[170, 112], [208, 124], [186, 152], [214, 168], [172, 178], [192, 96]].map(p => `<circle class="a-dot-b" cx="${p[0]}" cy="${p[1]}" r="9"/>`).join('')}</svg>`,
    `<svg class="art g2" viewBox="0 0 280 280" aria-hidden="true"><line class="a-st" x1="30" y1="140" x2="250" y2="140" stroke="currentColor" stroke-opacity=".15" stroke-dasharray="4 8"/>
      <g class="swapA">${[[50, 100], [80, 140], [50, 180], [105, 105], [105, 175]].map(p => `<circle class="a-dot-a" cx="${p[0]}" cy="${p[1]}" r="10"/>`).join('')}</g>
      <g class="swapB">${[[175, 100], [205, 140], [175, 180], [230, 105], [230, 175]].map(p => `<circle class="a-dot-b" cx="${p[0]}" cy="${p[1]}" r="10"/>`).join('')}</g></svg>`,
    `<svg class="art g3" viewBox="0 0 280 280" aria-hidden="true"><g class="bub"><rect x="22" y="40" width="130" height="70" rx="26" fill="#FFB020"/><path d="M52 108l-6 28 30-24z" fill="#FFB020"/><text x="87" y="84">สวัสดี</text></g>
      <g class="bub b2"><rect x="128" y="150" width="130" height="70" rx="26" fill="#2DD4BF"/><path d="M228 218l6 28-30-24z" fill="#2DD4BF"/><text x="193" y="194">မင်္ဂလာပါ</text></g></svg>`,
    `<svg class="art g4" viewBox="0 0 280 280" aria-hidden="true">
      ${[[[60, 70], [140, 140]], [[220, 60], [140, 140]], [[50, 210], [140, 140]], [[230, 200], [140, 140]], [[60, 70], [220, 60]]].map((l, i) => `<path class="a-st edge" pathLength="1" d="M${l[0][0]} ${l[0][1]}L${l[1][0]} ${l[1][1]}" stroke="${i % 2 ? '#2DD4BF' : '#FFB020'}"/>`).join('')}
      <circle class="nodeC a-dot-a" cx="60" cy="70" r="13"/><circle class="nodeC a-dot-b" cx="220" cy="60" r="13"/><circle class="nodeC a-dot-a" cx="50" cy="210" r="13"/><circle class="nodeC a-dot-b" cx="230" cy="200" r="13"/>
      <circle cx="140" cy="140" r="20" fill="url(#gM)"/></svg>`
  ];
  $('#wsTrack').innerHTML = E.stages.map((s, i) => `<article class="stage" data-reveal>${stageArt[i]}<div><span class="n">STAGE ${s.n}</span><h3>${s.t}</h3><p>${s.d}</p></div></article>`).join('');

  // Rules
  const ruleColors = ['var(--amber)', 'var(--teal)', 'var(--amber)', 'var(--teal)', 'var(--amber)'];
  const ruleDeco = [
    '<path class="ring draw" d="M20 90h160M20 60h160M20 120h160" stroke="currentColor" pathLength="1"/>',
    '<path class="ring draw" d="M30 100c0-40 40-70 70-40s40 40 70 0" pathLength="1" stroke="currentColor"/><circle class="ring draw" cx="100" cy="100" r="40" pathLength="1" stroke="currentColor"/>',
    '<path class="ring draw" d="M20 100h60l20-40 20 80 20-40h40" pathLength="1" stroke="currentColor"/>',
    '<circle class="ring draw" cx="70" cy="100" r="40" pathLength="1" stroke="currentColor"/><circle class="ring draw" cx="130" cy="100" r="40" pathLength="1" stroke="currentColor"/><circle class="ring draw" cx="100" cy="100" r="40" pathLength="1" stroke="currentColor" stroke-dasharray="1"/>',
    '<path class="ring draw" d="M30 150L100 40l70 110z" pathLength="1" stroke="currentColor"/><path class="ring draw" d="M60 150l40-70 40 70" pathLength="1" stroke="currentColor"/>'
  ];
  $('#ruleStack').innerHTML = E.rules.map((r, i) => `<article class="rule" style="--k:${i};--c:${ruleColors[i]};color:var(--fg)"><span class="rn">0${i + 1}</span><h3>${r[0]}</h3><p>${r[1]}</p><svg class="deco" viewBox="0 0 200 200" style="color:${ruleColors[i]}" aria-hidden="true">${ruleDeco[i]}</svg></article>`).join('');

  // Timeline
  $('#tl').insertAdjacentHTML('beforeend', E.schedule.map((s, i) => `<li class="tl-item" data-i="${i}" data-reveal>
    <svg class="tl-node" viewBox="0 0 24 24" aria-hidden="true"><circle class="pulse-c" cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="8"/></svg>
    <span class="tl-time">${s[0]}</span><h3>${s[1]}</h3><p>${s[2]}</p></li>`).join(''));

  /* ================= Hero title split, greeting rotator ================= */
  $$('[data-split]').forEach((el, li) => {
    const text = el.textContent.trim(), words = text.split(' '); let n = li * 18, k = 0;
    el.innerHTML = words.map(w => `<span class="word">${[...w].map(ch => `<span class="ch" style="--i:${n++};--p:${Math.round(k++ / Math.max(1, text.length - 1) * 100)}">${ch}</span>`).join('')}</span>`).join(' ');
  });
  (function () {
    const w = $('#greetWord'), l = $('#greetLang'); let i = 0; w.style.fontFamily = E.greetings[0][2];
    function next() {
      i = (i + 1) % E.greetings.length;
      w.classList.remove('in'); l.classList.remove('in'); w.classList.add('out'); l.classList.add('out');
      setTimeout(() => {
        w.textContent = E.greetings[i][0]; l.textContent = E.greetings[i][1]; w.style.fontFamily = E.greetings[i][2];
        w.style.color = i % 2 ? 'var(--teal-t)' : 'var(--amber-t)';
        w.classList.remove('out'); l.classList.remove('out'); w.classList.add('in'); l.classList.add('in');
      }, 420);
    }
    if (!RM.matches) setInterval(() => { if (!document.hidden) next(); }, 2800);
  })();


  /* ================= Theme, sound toggle, menu ================= */
  const themeBtn = $('#theme');
  function setTheme(t) { root.setAttribute('data-theme', t); store.set('theme', t); themeBtn.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'); $('meta[name="theme-color"]').content = t === 'dark' ? '#0B0B0F' : '#FBF6EE'; }
  setTheme(root.getAttribute('data-theme') || 'dark');
  themeBtn.addEventListener('click', () => { setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); sfx('toggle'); });
  const links = $('#links'), menuBtn = $('#menuBtn');
  function menu(open) { links.classList.toggle('open', open); menuBtn.setAttribute('aria-expanded', open); menuBtn.querySelector('use').setAttribute('href', open ? '#i-x' : '#i-menu'); }
  menuBtn.addEventListener('click', () => { menu(!links.classList.contains('open')); sfx('toggle'); });
  links.addEventListener('click', e => { if (e.target.closest('a')) menu(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape') menu(false); });

  /* ================= Interaction polish ================= */
  document.addEventListener('pointerover', e => { if (e.pointerType === 'mouse' && e.target.closest('.btn, .tab, .chip, .icon-btn, .links a')) sfx('hover', { gap: 150 }); });
  document.addEventListener('click', e => {
    const b = e.target.closest('.btn'); if (!b) return;
    sfx('click');
    if (RM.matches) return;
    const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2, s = document.createElement('span');
    s.className = 'rip'; s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    b.appendChild(s); setTimeout(() => s.remove(), 750);
  });
  if (HOVER.matches && !RM.matches) {
    // magnetic buttons
    $$('.mag').forEach(b => {
      b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); b.style.setProperty('--bx', ((e.clientX - r.left - r.width / 2) * .22).toFixed(1) + 'px'); b.style.setProperty('--by', ((e.clientY - r.top - r.height / 2) * .3).toFixed(1) + 'px'); });
      b.addEventListener('pointerleave', () => { b.style.setProperty('--bx', '0px'); b.style.setProperty('--by', '0px'); });
    });
    // card tilt
    $$('.tilt').forEach(c => {
      c.addEventListener('pointermove', e => { const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; c.style.transition = 'transform .1s'; c.style.transform = `perspective(900px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateZ(0)`; });
      c.addEventListener('pointerleave', () => { c.style.transition = 'transform .6s var(--ease)'; c.style.transform = ''; });
    });
    // cursor ring
    const cur = $('.cursor'); let cx = 0, cy = 0, tx = 0, ty = 0, raf;
    addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; cur.classList.add('on'); if (!raf) raf = requestAnimationFrame(follow); }, { passive: true });
    function follow() { cx = lerp(cx, tx, .2); cy = lerp(cy, ty, .2); cur.style.transform = `translate(${cx}px,${cy}px)`; raf = (Math.abs(tx - cx) > .3 || Math.abs(ty - cy) > .3) ? requestAnimationFrame(follow) : 0; }
    document.addEventListener('pointerover', e => cur.classList.toggle('big', !!e.target.closest('a, button, .tab, .chip, summary, .check, .seg label, .obj')));
    document.documentElement.addEventListener('mouseleave', () => cur.classList.remove('on'));
  }


  /* ================= Hero scene: people around a table greeting each other ================= */
  (function () {
    const el = $('#heroScene'), cols = ['#FFB020', '#2DD4BF', '#8B7CFF', '#FF6B9A'], cx = 300, cy = 300, R = 165, Rb = 240;
    const seats = Array.from({ length: 8 }, (_, k) => { const a = (k * 45 - 90) * Math.PI / 180; return { x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R, bx: cx + Math.cos(a) * Rb, by: cy + Math.sin(a) * Rb, c: cols[k % 4] }; });
    const links = seats.map(s => `<line class="link" x1="${cx}" y1="${cy}" x2="${s.x.toFixed(1)}" y2="${s.y.toFixed(1)}"/>`).join('');
    const people = seats.map((s, k) => `<g transform="translate(${s.x.toFixed(1)} ${s.y.toFixed(1)})"><g class="av" style="animation-delay:${(-k * .45).toFixed(2)}s">
      <path d="M-27 34C-27 8 27 8 27 34Z" fill="${s.c}" stroke="var(--bg)" stroke-width="3"/><circle cx="0" cy="-10" r="18" fill="${s.c}" stroke="var(--bg)" stroke-width="3"/></g></g>`).join('');
    const bubbles = [0, 2, 4, 6].map((k, i) => { const s = seats[k], g = E.greetings[i]; return `<g class="bub" style="animation-delay:${i * 3}s"><rect x="${(s.bx - 62).toFixed(1)}" y="${(s.by - 24).toFixed(1)}" width="124" height="48" rx="24"/><text x="${s.bx.toFixed(1)}" y="${s.by.toFixed(1)}" style="font-family:${g[2]}">${g[0]}</text></g>`; }).join('');
    el.innerHTML = `<svg class="hs" viewBox="-20 -10 640 620"><defs><radialGradient id="tbG"><stop offset="0" stop-color="#FFB020" stop-opacity=".35"/><stop offset="1" stop-color="#2DD4BF" stop-opacity=".18"/></radialGradient></defs>
      <circle class="ringd" cx="${cx}" cy="${cy}" r="215"/><circle class="ringd2" cx="${cx}" cy="${cy}" r="118"/>${links}<circle class="table" cx="${cx}" cy="${cy}" r="92"/>
      <g class="logo-c"><circle cx="${cx - 16}" cy="${cy}" r="30" fill="#FFB020" fill-opacity=".85"/><circle cx="${cx + 16}" cy="${cy}" r="30" fill="#2DD4BF" fill-opacity=".75"/></g>${people}${bubbles}</svg>`;
  })();

  /* ================= Doodle vectors scattered through the sections ================= */
  (function () {
    const S = {
      star: '<svg viewBox="0 0 24 24"><path class="fl" d="M12 0C13 8 16 11 24 12C16 13 13 16 12 24C11 16 8 13 0 12C8 11 11 8 12 0Z"/></svg>',
      plus: '<svg viewBox="0 0 24 24"><path class="st" d="M12 3V21M3 12H21"/></svg>',
      squig: '<svg viewBox="0 0 120 20"><path class="st" pathLength="1" d="M2 10q10-14 20 0t20 0t20 0t20 0t20 0t20 0"/></svg>',
      loop: '<svg viewBox="0 0 120 80"><path class="st" pathLength="1" d="M5 62C30 8 72 8 62 42S20 72 72 56 108 22 114 10M104 8l10 2-2 10"/></svg>',
      dots: '<svg viewBox="0 0 48 48">' + [0, 1, 2].map(r => [0, 1, 2].map(c => `<circle class="fl" cx="${8 + c * 16}" cy="${8 + r * 16}" r="2.6"/>`).join('')).join('') + '</svg>',
      tri: '<svg viewBox="0 0 24 24"><path class="st" d="M12 3L22 21H2Z"/></svg>',
      ring: '<svg viewBox="0 0 48 48"><circle class="st" cx="24" cy="24" r="20" stroke-dasharray="3 7"/></svg>'
    };
    const D = [['hero', 'star', 52, 14, 54, 'a', 'dd-pulse'], ['hero', 'plus', 94, 18, 40, 't', 'dd-spin'], ['hero', 'dots', 90, 70, 80, 'p', 'dd-float'], ['hero', 'squig', 56, 84, 140, 't', 'dd-draw'], ['hero', 'loop', 74, 6, 130, 'a', 'dd-draw dm'], ['hero', 'tri', 48, 60, 40, 'p', 'dd-float dm'], ['hero', 'ring', 62, 66, 90, 'a', 'dd-spin dm'], ['hero', 'star', 95, 48, 36, 't', 'dd-float'],
      ['why', 'star', 88, 8, 56, 't', 'dd-pulse'], ['why', 'squig', 4, 78, 130, 'a', 'dd-draw dm'], ['why', 'ring', 78, 70, 70, 'p', 'dd-spin dm'],
      ['objectives', 'plus', 91, 6, 36, 'a', 'dd-spin'], ['objectives', 'star', 3, 42, 40, 't', 'dd-float dm'], ['objectives', 'dots', 90, 88, 64, 'p', 'dd-float dm'],
      ['panel', 'loop', 86, 6, 120, 't', 'dd-draw dm'], ['panel', 'dots', 2, 78, 70, 'a', 'dd-float'], ['panel', 'star', 52, 92, 34, 'p', 'dd-pulse dm'],
      ['rules', 'star', 92, 8, 46, 'a', 'dd-pulse'], ['rules', 'tri', 3, 62, 36, 't', 'dd-float dm'],
      ['schedule', 'squig', 3, 10, 120, 't', 'dd-draw dm'], ['schedule', 'star', 91, 58, 52, 'a', 'dd-float'], ['schedule', 'ring', 4, 84, 64, 'p', 'dd-spin dm'],
      ['team', 'plus', 5, 14, 34, 't', 'dd-spin'], ['team', 'tri', 91, 78, 38, 'a', 'dd-float dm'], ['team', 'star', 90, 8, 40, 'p', 'dd-pulse dm'],
      ['register', 'star', 90, 5, 56, 'a', 'dd-pulse'], ['register', 'squig', 3, 46, 120, 't', 'dd-draw dm'], ['register', 'loop', 84, 86, 110, 'a', 'dd-draw dm'],
      ['info', 'dots', 92, 6, 70, 't', 'dd-float'], ['info', 'star', 3, 80, 44, 'a', 'dd-pulse']];
    D.forEach(([id, type, x, y, size, col, cls], i) => { const sec = document.getElementById(id); if (!sec) return;
      sec.insertAdjacentHTML('afterbegin', `<div class="doodle c-${col} ${cls}" aria-hidden="true" style="left:${x}%;top:${y}%;width:${size}px;animation-delay:${(-i * .7).toFixed(1)}s">${S[type]}</div>`); });
  })();

  /* ================= Scroll engine ================= */
  const nav = $('#nav'), bar = $('.scroll-progress i'), navCta = $('#navCta'), regSec = $('#register');
  const ws = $('#workshop'), wsTrack = $('#wsTrack'), wsBar = $('#wsBar'), stages = $$('.stage'), rules = $$('.rule'), tlItems = $$('.tl-item'), tlFill = $('#tlFill'), tl = $('#tl');
  let ticking = false, lastY = 0, lastActive = -1, tlActive = -1;
  function pinned() { return DESK.matches && !RM.matches; }
  function update() {
    ticking = false;
    const y = scrollY, vh = innerHeight, max = Math.max(1, document.documentElement.scrollHeight - vh);
    bar.style.transform = `scaleX(${clamp(y / max)})`;
    nav.classList.toggle('scrolled', y > 24);
    root.style.setProperty('--sp', clamp(y / max).toFixed(3));
    // nav CTA pulses until the form is reached
    const rr = regSec.getBoundingClientRect();
    navCta.classList.toggle('pulse', rr.top > vh * .8);
    // workshop
    if (pinned()) {
      const r = ws.getBoundingClientRect(), p = clamp(-r.top / (r.height - vh));
      const travel = wsTrack.scrollWidth - innerWidth; wsTrack.style.transform = `translate3d(${-p * travel}px,0,0)`;
      wsBar.style.transform = `scaleX(${.25 + p * .75})`;
      const idx = Math.min(stages.length - 1, Math.round(p * (stages.length - 1)));
      stages.forEach((s, i) => s.classList.toggle('active', i === idx));
      if (idx !== lastActive && lastActive !== -1) sfx('card'); lastActive = idx;
    } else { wsTrack.style.transform = ''; const r = ws.getBoundingClientRect(); wsBar.style.transform = `scaleX(${clamp((vh - r.top) / (r.height + vh), 0, 1)})`; stages.forEach(s => s.classList.remove('active')); }
    // stacked rules
    if (!RM.matches) rules.forEach((c, i) => {
      const n = rules[i + 1]; if (!n) { return; }
      const stick = parseFloat(getComputedStyle(c).top), nt = n.getBoundingClientRect().top, h = c.offsetHeight;
      const p = clamp(1 - (nt - stick) / h);
      c.style.transform = `scale(${1 - p * .06})`; c.style.filter = `brightness(${1 - p * .35})`;
      if (p > .98 && !c._s) { c._s = 1; sfx('card'); } if (p < .5) c._s = 0;
    });
    // timeline
    const tr = tl.getBoundingClientRect(), mid = vh * .55;
    tlFill.style.transform = `scaleY(${clamp((mid - tr.top) / tr.height)})`;
    let act = -1; tlItems.forEach((it, i) => { const on = it.getBoundingClientRect().top < mid; it.classList.toggle('on', on); if (on) act = i; });
    if (act > tlActive && y > lastY) sfx('node', { i: act, gap: 80 }); tlActive = act;
    lastY = y;
  }
  const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  addEventListener('scroll', req, { passive: true }); addEventListener('resize', req); DESK.addEventListener('change', req); RM.addEventListener('change', req);
  update();

  // reveals, staggering, section sounds, nav highlight
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12, rootMargin: '0px 0px -6% 0px' });
    $$('[data-reveal]').forEach(el => io.observe(el));
    $$('[data-stagger]').forEach(g => $$('[data-reveal]', g).forEach((c, i) => c.style.setProperty('--i', i)));
    const secIo = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      const id = e.target.id; $$('.links a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + id));
      if (!e.target._h) { e.target._h = 1; if (id !== 'hero') sfx('section', { gap: 800 }); }
    }), { threshold: .35 });
    $$('main > section').forEach(s => secIo.observe(s));
  } else $$('[data-reveal]').forEach(el => el.classList.add('in'));

  /* ================= Registration form ================= */
  const form = $('#form'), stepsWrap = $('#steps'), stepEls = $$('.step'), btnNext = $('#btnNext'), btnBack = $('#btnBack'), btnSubmit = $('#btnSubmit'), formMsg = $('#formMsg');
  const S = { spoken: new Set(), teach: new Set(), diet: 'None' };
  let cur = 0, busy = false, formStart = 0;
  const DIETS = ['None', 'Vegetarian', 'Halal', 'Allergies', 'Other'];

  const req_ = m => v => v.trim() ? true : m;
  const V = {
    full_name: v => v.trim().length >= 2 || 'Please enter your full name.',
    student_id: v => /^\d{7,12}$/.test(v.trim()) || 'Student ID should be 7 to 12 digits.',
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || 'Enter a valid email address.',
    phone: v => !v.trim() || v.trim().length >= 4 || 'That looks too short.',
    nationality: req_('Tell us your country so we can mix groups.'),
    faculty: req_('Choose or type your school or faculty.'),
    year: req_('Select your year of study.')
  };
  const FIELDS = [['full_name', 'student_id', 'email', 'phone'], ['nationality', 'faculty', 'year'], [], []];

  function setErr(box, msg) { const p = box.querySelector('p'); if (msg) p.textContent = msg; box.classList.toggle('show', !!msg); }
  function shake(el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); setTimeout(() => el.classList.remove('shake'), 300); }
  function checkField(name, quiet) {
    const input = form.elements[name]; if (!input) return true;
    const wrap = input.closest('.fld'), res = V[name](input.value), ok = res === true;
    const filled = input.value.trim().length > 0;
    wrap.classList.toggle('valid', ok && filled); wrap.classList.toggle('invalid', !ok);
    wrap.classList.toggle('has-val', filled);
    setErr(wrap.querySelector('.err'), ok ? '' : res);
    if (!ok && !quiet) { shake(wrap); sfx('invalid'); }
    return ok;
  }
  Object.keys(V).forEach(name => {
    const el = form.elements[name]; if (!el) return;
    let touched = false;
    el.addEventListener('focus', () => { sfx('focus', { gap: 200 }); if (!formStart) formStart = performance.now(); });
    el.addEventListener('blur', () => { touched = true; const was = el.closest('.fld').classList.contains('valid'); const ok = checkField(name, false); if (ok && !was && el.value.trim()) sfx('valid'); });
    el.addEventListener('input', () => { if (touched) checkField(name, true); else el.closest('.fld').classList.toggle('has-val', !!el.value); save(); });
    el.addEventListener('change', () => { el.closest('.fld').classList.toggle('has-val', !!el.value); if (touched || name === 'year') { const ok = checkField(name, true); if (ok && el.value) sfx('valid'); } save(); });
  });

  // chips
  function buildChips(el, items, set, key) {
    el.innerHTML = items.map(l => `<button type="button" class="chip" role="checkbox" aria-checked="false" data-v="${l}"><span>${l}</span></button>`).join('');
    el.addEventListener('click', e => {
      const b = e.target.closest('.chip'); if (!b) return; const v = b.dataset.v, on = !set.has(v);
      on ? set.add(v) : set.delete(v); b.setAttribute('aria-checked', on); sfx(on ? 'chipOn' : 'chipOff'); mine(); save();
    });
  }
  const dietEl = $('#chipDiet');
  buildChips($('#chipSpoken'), E.languages, S.spoken); buildChips($('#chipTeach'), E.languages, S.teach);
  dietEl.innerHTML = DIETS.map(l => `<button type="button" class="chip" role="radio" aria-checked="${l === 'None'}" data-v="${l}"><span>${l}</span></button>`).join('');
  dietEl.addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return; S.diet = b.dataset.v;
    $$('.chip', dietEl).forEach(c => c.setAttribute('aria-checked', c === b)); sfx('chipOn');
    $('#dietOtherWrap').hidden = S.diet !== 'Other' && S.diet !== 'Allergies'; if (!$('#dietOtherWrap').hidden) $('#diet_other').focus(); save();
  });
  function mine() {
    const box = $('#mine'), list = [...S.spoken];
    $$('.tag', box).forEach(t => { if (!S.spoken.has(t.textContent)) t.remove(); });
    list.forEach(l => { if (!$$('.tag', box).some(t => t.textContent === l)) { const t = document.createElement('span'); t.className = 'tag'; t.textContent = l; box.appendChild(t); } });
    box.classList.toggle('empty', !list.length); if (list.length) setErr($('#errSpoken'), '');
  }
  $('#lang_other').addEventListener('keydown', e => {
    if (e.key !== 'Enter') return; e.preventDefault(); e.stopPropagation();
    const v = e.target.value.trim(); if (!v) return;
    if (!E.languages.includes(v)) { const chips = $('#chipSpoken'); chips.insertAdjacentHTML('beforeend', `<button type="button" class="chip" role="checkbox" aria-checked="true" data-v="${v.replace(/"/g, '')}"><span>${v}</span></button>`); }
    S.spoken.add(v); e.target.value = ''; e.target.closest('.fld').classList.remove('has-val'); sfx('chipOn'); mine(); save();
  });
  mine();

  // draft save and restore
  let savedT;
  function collect() {
    const d = {}; ['full_name', 'student_id', 'email', 'phone', 'nationality', 'faculty', 'year', 'access', 'interest', 'diet_other'].forEach(k => d[k] = form.elements[k].value);
    d.student_type = (form.querySelector('[name=student_type]:checked') || {}).value || '';
    d.spoken = [...S.spoken]; d.teach = [...S.teach]; d.diet = S.diet; d.mfu333 = form.elements.mfu333.checked;
    return d;
  }
  function save() {
    store.set('gdc.draft', JSON.stringify(collect()));
    const s = $('#saved'); s.classList.add('show'); clearTimeout(savedT); savedT = setTimeout(() => s.classList.remove('show'), 1400);
  }
  form.addEventListener('change', e => { if (e.target.name === 'student_type') { setErr($('.seg-wrap .err'), ''); sfx('chipOn'); } save(); });
  ['access', 'interest', 'diet_other'].forEach(k => form.elements[k].addEventListener('input', save));
  (function restore() {
    let d; try { d = JSON.parse(store.get('gdc.draft') || 'null'); } catch (e) {} if (!d) return;
    ['full_name', 'student_id', 'email', 'phone', 'nationality', 'faculty', 'year', 'access', 'interest', 'diet_other'].forEach(k => { if (d[k]) { form.elements[k].value = d[k]; form.elements[k].closest('.fld').classList.add('has-val'); } });
    if (d.student_type) { const r = form.querySelector(`[name=student_type][value="${d.student_type}"]`); if (r) r.checked = true; }
    (d.spoken || []).forEach(v => { S.spoken.add(v); const b = $(`#chipSpoken [data-v="${v}"]`); if (b) b.setAttribute('aria-checked', 'true'); else $('#chipSpoken').insertAdjacentHTML('beforeend', `<button type="button" class="chip" role="checkbox" aria-checked="true" data-v="${v}"><span>${v}</span></button>`); });
    (d.teach || []).forEach(v => { S.teach.add(v); const b = $(`#chipTeach [data-v="${v}"]`); if (b) b.setAttribute('aria-checked', 'true'); });
    if (d.diet) { S.diet = d.diet; $$('.chip', dietEl).forEach(c => c.setAttribute('aria-checked', c.dataset.v === d.diet)); $('#dietOtherWrap').hidden = d.diet !== 'Other' && d.diet !== 'Allergies'; }
    form.elements.mfu333.checked = !!d.mfu333; mine();
  })();

  // stepper
  function paintStepper() {
    $('#stFill').style.strokeDashoffset = 1 - cur / 3;
    $$('.nd').forEach((n, i) => { n.classList.toggle('done', i < cur); n.classList.toggle('cur', i === cur); });
    $$('.st-labels span').forEach((s, i) => s.style.color = i === cur ? 'var(--fg)' : '');
    btnBack.hidden = cur === 0; btnNext.hidden = cur === 3; btnSubmit.hidden = cur !== 3;
  }
  function validateStep(n) {
    let ok = true, first = null;
    FIELDS[n].forEach(k => { const good = checkField(k, false); if (!good) { ok = false; first = first || form.elements[k]; } });
    if (n === 1 && !form.querySelector('[name=student_type]:checked')) { const w = $('.seg-wrap'); setErr(w.querySelector('.err'), 'Choose one so we can balance the groups.'); shake(w); sfx('invalid'); ok = false; first = first || w.querySelector('input'); }
    if (n === 2 && !S.spoken.size) { setErr($('#errSpoken'), 'Pick at least one language you speak.'); shake($('#chipSpoken')); sfx('invalid'); ok = false; first = first || $('#chipSpoken .chip'); }
    if (first) first.focus({ preventScroll: false });
    return ok;
  }
  function summary() {
    const d = collect(), row = (t, vals, step) => `<div class="sum-row"><div><dt>${t}</dt>${vals.filter(Boolean).map(v => `<dd>${v}</dd>`).join('')}</div><button type="button" data-go="${step}">Edit</button></div>`;
    $('#summary').innerHTML = row('Name', [d.full_name, d.student_id], 0) + row('Contact', [d.email, d.phone], 0) + row('Background', [`${d.nationality}, ${d.faculty}`, `${d.year}, ${d.student_type}`], 1) +
      row('Languages', [d.spoken.join(', '), d.teach.length ? 'Can help with: ' + d.teach.join(', ') : ''], 2) + row('Lunch box', [d.diet + (d.diet_other ? ': ' + d.diet_other : ''), d.access ? 'Accessibility: ' + d.access : ''], 2);
  }
  $('#summary').addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) goTo(+b.dataset.go); });
  function goTo(n) {
    if (n === cur || busy) return; busy = true; formMsg.textContent = '';
    const dir = n > cur ? 1 : -1, from = stepEls[cur], to = stepEls[n], h0 = stepsWrap.offsetHeight;
    stepsWrap.style.height = h0 + 'px'; from.classList.add(dir > 0 ? 'out-l' : 'out-r'); sfx(dir > 0 ? 'step' : 'back');
    setTimeout(() => {
      from.hidden = true; from.classList.remove('out-l', 'out-r'); if (n === 3) summary();
      to.hidden = false; to.classList.add(dir > 0 ? 'in-r' : 'in-l'); cur = n; paintStepper();
      stepsWrap.style.height = to.offsetHeight + 'px';
      setTimeout(() => { stepsWrap.style.height = ''; to.classList.remove('in-r', 'in-l'); busy = false; const f = to.querySelector('input:not([type=radio]):not([type=checkbox]), select, .chip'); if (f && n < 3) f.focus({ preventScroll: true }); const top = $('#formCard').getBoundingClientRect().top; if (top < 70 || top > innerHeight * .5) scrollTo({ top: scrollY + top - 90, behavior: RM.matches ? 'auto' : 'smooth' }); }, 480);
    }, RM.matches ? 0 : 280);
  }
  btnNext.addEventListener('click', () => { if (validateStep(cur)) goTo(cur + 1); });
  btnBack.addEventListener('click', () => goTo(cur - 1));
  form.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('input:not([type=checkbox]):not([type=radio])') && cur < 3) { e.preventDefault(); if (validateStep(cur)) goTo(cur + 1); } });
  paintStepper();

  // capacity
  const cap = { taken: 0, full: false };
  function demoList() { try { return JSON.parse(store.get('gdc.regs') || '[]'); } catch (e) { return []; } }
  async function loadCapacity() {
    try {
      if (E.endpoint) { const r = await fetch(E.endpoint + (E.endpoint.includes('?') ? '&' : '?') + 'action=count'); const j = await r.json(); cap.taken = j.confirmed || 0; }
      else cap.taken = demoList().filter(r => r.status === 'confirmed').length;
    } catch (e) { cap.taken = 0; }
    paintCap();
  }
  function paintCap() {
    const left = Math.max(0, E.capacity - cap.taken), box = $('#cap'); cap.full = left === 0;
    $('#capText').textContent = cap.full ? 'All places taken. Join the waitlist.' : `${left} of ${E.capacity} places left`;
    box.classList.toggle('low', !cap.full && left <= E.lowSpotsThreshold); box.classList.toggle('full', cap.full);
    $('#capNote').textContent = cap.full ? 'Waitlist open' : (left <= E.lowSpotsThreshold ? 'Almost full' : '');
    $('#capFill').style.transform = `scaleX(${clamp(cap.taken / E.capacity)})`;
    $('.lab', btnSubmit).textContent = cap.full ? 'Join waitlist' : 'Submit registration';
    if (!cap.full && left <= E.lowSpotsThreshold && !Sound._alerted) { Sound._alerted = 1; sfx('alert'); }
  }
  new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { loadCapacity(); o.disconnect(); } }, { rootMargin: '200px' }).observe($('#cap'));

  // submit
  function ticketCode() { const a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', r = new Uint32Array(6); crypto.getRandomValues(r); return 'GDC-' + [...r].map(x => a[x % a.length]).join(''); }
  async function send(data) {
    if (E.endpoint) {
      const r = await fetch(E.endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(data) });
      return r.json();
    }
    await sleep(1500);
    const list = demoList();
    if (list.some(x => x.student_id === data.student_id || x.email.toLowerCase() === data.email.toLowerCase())) return { ok: false, error: 'duplicate' };
    const status = list.filter(x => x.status === 'confirmed').length >= E.capacity ? 'waitlist' : 'confirmed', ticketCode_ = ticketCode();
    list.push({ student_id: data.student_id, email: data.email, status, ticketCode: ticketCode_ }); store.set('gdc.regs', JSON.stringify(list));
    return { ok: true, status, ticketCode: ticketCode_ };
  }
  form.addEventListener('submit', async e => {
    e.preventDefault(); if (busy || cur !== 3) return; formMsg.textContent = '';
    const c1 = form.elements.consent_data, c2 = form.elements.consent_contact; let ok = true;
    [[c1, '#errC1'], [c2, '#errC2']].forEach(([c, id]) => { const bad = !c.checked; setErr($(id), bad ? 'This is required to register.' : ''); if (bad) { shake(c.closest('.check')); ok = false; } });
    if (!ok) { sfx('invalid'); return; }
    if (form.elements.website.value || (formStart && performance.now() - formStart < 4000)) { formMsg.textContent = 'That was very fast. Please check your answers and try again.'; sfx('error'); return; }
    const data = Object.assign(collect(), { consent_data: true, consent_contact: true, languages_spoken: collect().spoken.join(', '), languages_can_teach: collect().teach.join(', ') });
    btnSubmit.style.width = btnSubmit.offsetWidth + 'px'; void btnSubmit.offsetWidth; btnSubmit.classList.add('loading'); btnSubmit.style.width = ''; busy = true;
    try {
      const res = await send(data);
      if (!res.ok) throw new Error(res.error === 'duplicate' ? 'This student ID or email is already registered. Check your inbox for your ticket.' : (res.error || 'Something went wrong.'));
      btnSubmit.classList.remove('loading'); btnSubmit.classList.add('ok'); await sleep(900);
      store.del('gdc.draft'); showSuccess(data, res);
    } catch (err) {
      btnSubmit.classList.remove('loading'); shake(btnSubmit); sfx('error');
      formMsg.textContent = err.message && err.message !== 'Failed to fetch' ? err.message : 'Could not reach the server. Check your connection and try again.';
    } finally { busy = false; }
  });

  function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
  let lastTicket = null;
  async function showSuccess(data, res) {
    const wait = res.status === 'waitlist';
    $('#formCard').hidden = true; $('#cap').hidden = true; $('#success').hidden = false;
    $$('#register .kicker, #register .h2').forEach(el => el.hidden = true);
    $('#successTitle').textContent = wait ? 'You are on the waitlist.' : 'You are in.';
    $('#successSub').textContent = wait ? 'The event is full for now. We will email you if a place opens. Keep this code.' : `We sent a confirmation to ${data.email}. Show the QR code at registration from ${E.startTime}.`;
    $('#tName').textContent = data.full_name; $('#tDate').textContent = E.dateLabel; $('#tTime').textContent = `${E.startTime} to ${E.endTime}`;
    $('#tVenue').textContent = `${E.venue}, ${E.campus}`; $('#tCode').textContent = res.ticketCode; $('#tStatus').textContent = wait ? 'Waitlist' : 'Confirmed';
    lastTicket = { name: data.full_name, code: res.ticketCode, wait };
    $('#success').scrollIntoView({ behavior: RM.matches ? 'auto' : 'smooth', block: 'center' });
    sfx('success'); if (!RM.matches) confetti();
    const qr = $('#qr'); qr.textContent = '';
    try { if (!window.QRCode) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'); new QRCode(qr, { text: res.ticketCode, width: 132, height: 132, colorDark: '#0B0B0F', colorLight: '#F4F2EE', correctLevel: QRCode.CorrectLevel.M }); }
    catch (e) { qr.innerHTML = `<span class="t-code" style="letter-spacing:.05em;text-align:center">${res.ticketCode}</span>`; }
    paintCap();
  }

  // confetti
  function confetti() {
    const cv = $('#confetti'), c = cv.getContext('2d'), dpr = Math.min(devicePixelRatio || 1, 2), W = cv.width = innerWidth * dpr, H = cv.height = innerHeight * dpr, n = innerWidth < 700 ? 90 : 160;
    const cols = ['#FFB020', '#2DD4BF', '#F4F2EE', '#FFD36B'];
    const ps = Array.from({ length: n }, () => ({ x: W / 2 + (Math.random() - .5) * W * .2, y: H * .55, vx: (Math.random() - .5) * 22 * dpr, vy: -(8 + Math.random() * 16) * dpr, r: (4 + Math.random() * 6) * dpr, a: Math.random() * 6, va: (Math.random() - .5) * .4, col: cols[(Math.random() * 4) | 0], round: Math.random() < .35 }));
    const t0 = performance.now();
    (function step(now) {
      c.clearRect(0, 0, W, H); const age = now - t0;
      ps.forEach(p => { p.vy += .55 * dpr; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.a += p.va; c.save(); c.globalAlpha = clamp(1 - (age - 2200) / 1400); c.translate(p.x, p.y); c.rotate(p.a); c.fillStyle = p.col; if (p.round) { c.beginPath(); c.arc(0, 0, p.r / 2, 0, 6.3); c.fill(); } else c.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); c.restore(); });
      if (age < 3600) requestAnimationFrame(step); else c.clearRect(0, 0, W, H);
    })(t0);
  }

  // calendar, ticket PNG, share
  $('#btnIcs').addEventListener('click', () => {
    const d = E.dateISO.replace(/-/g, ''), t = s => s.replace(':', '') + '00';
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Global Dialogues//EN', 'BEGIN:VEVENT', `UID:${lastTicket ? lastTicket.code : 'gdc'}@global-dialogues`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART;TZID=Asia/Bangkok:${d}T${t(E.startTime)}`, `DTEND;TZID=Asia/Bangkok:${d}T${t(E.endTime)}`, `SUMMARY:${E.title}`, `LOCATION:${E.venue}\\, ${E.campus}`, 'DESCRIPTION:Dress code: black and white\\, with jeans. Show your ticket QR code at registration.', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    download(new Blob([ics], { type: 'text/calendar' }), 'global-dialogues.ics'); sfx('click');
  });
  function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
  $('#btnPng').addEventListener('click', () => {
    if (!lastTicket) return;
    const cv = document.createElement('canvas'); cv.width = 1000; cv.height = 460; const c = cv.getContext('2d');
    c.fillStyle = '#F4F2EE'; c.fillRect(0, 0, 1000, 460);
    const g = c.createLinearGradient(0, 0, 1000, 460); g.addColorStop(0, 'rgba(255,176,32,.3)'); g.addColorStop(.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(45,212,191,.3)'); c.fillStyle = g; c.fillRect(0, 0, 1000, 460);
    c.fillStyle = '#0B0B0F'; c.font = '500 18px monospace'; c.fillText(E.title.toUpperCase(), 48, 64);
    c.font = '800 54px sans-serif'; c.fillText(lastTicket.name.slice(0, 26), 48, 140);
    c.font = '600 24px sans-serif'; c.fillText(`${E.dateLabel}, ${E.startTime} to ${E.endTime}`, 48, 220); c.fillText(E.venue, 48, 258); c.fillText('Dress code: black and white, with jeans', 48, 296);
    c.font = '500 18px monospace'; c.fillText(lastTicket.wait ? 'WAITLIST' : 'CONFIRMED', 48, 400);
    c.setLineDash([10, 10]); c.strokeStyle = 'rgba(11,11,15,.4)'; c.lineWidth = 2; c.beginPath(); c.moveTo(740, 24); c.lineTo(740, 436); c.stroke();
    const qc = $('#qr canvas');
    if (qc) c.drawImage(qc, 780, 90, 180, 180);
    c.font = '500 24px monospace'; c.textAlign = 'center'; c.fillText(lastTicket.code, 870, 320);
    cv.toBlob(b => { download(b, 'ticket-' + lastTicket.code + '.png'); }); sfx('click');
  });
  $('#btnShare').addEventListener('click', async () => {
    const data = { title: E.title, text: `I am joining ${E.title} on ${E.dateLabel}. Come along!`, url: location.href.split('#')[0] };
    try { if (navigator.share) await navigator.share(data); else { await navigator.clipboard.writeText(data.url); toast('Link copied'); } } catch (e) {}
  });

  /* ================= Intro sound once sound is enabled ================= */
})();
