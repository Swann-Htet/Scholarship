// Imperative page behaviours (scroll-linked animation, reveals, cursor, tilt, sounds). Runs once after the React tree is mounted.
import { sfx, prepareAudio } from '../lib/sound.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

export function initEffects() {
  const cleanups = [];
  const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); cleanups.push(() => t.removeEventListener(ev, fn, o)); };
  const RM = matchMedia('(prefers-reduced-motion: reduce)'), DESK = matchMedia('(min-width: 861px)'), HOVER = matchMedia('(hover: hover) and (pointer: fine)');
  const root = document.documentElement;

  // ---- audio: first gesture prepares it, then click + hover sounds ----
  ['pointerdown', 'keydown', 'touchstart'].forEach(e => on(window, e, prepareAudio, { passive: true, capture: true }));
  on(document, 'click', e => { if (e.target.closest('a, button, summary, label, .tab')) sfx('click'); });
  on(document, 'pointerover', e => { if (e.pointerType === 'mouse' && e.target.closest('.btn, .tab, .icon-btn, .links a')) sfx('hover', null, 150); });
  on(document, 'click', e => {
    const b = e.target.closest('.btn'); if (!b || RM.matches) return;
    const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height) * 2, s = document.createElement('span');
    s.className = 'rip'; s.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    b.appendChild(s); setTimeout(() => s.remove(), 750);
  });

  // ---- pointer polish (mouse devices only) ----
  if (HOVER.matches && !RM.matches) {
    $$('.mag').forEach(b => {
      on(b, 'pointermove', e => { const r = b.getBoundingClientRect(); b.style.setProperty('--bx', ((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1) + 'px'); b.style.setProperty('--by', ((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1) + 'px'); });
      on(b, 'pointerleave', () => { b.style.setProperty('--bx', '0px'); b.style.setProperty('--by', '0px'); });
    });
    $$('.tilt').forEach(c => {
      on(c, 'pointermove', e => { const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5; c.style.transition = 'transform .1s'; c.style.transform = `perspective(900px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`; });
      on(c, 'pointerleave', () => { c.style.transition = 'transform .6s var(--ease)'; c.style.transform = ''; });
    });
    const cur = $('.cursor'); let cx = 0, cy = 0, tx = 0, ty = 0, raf = 0;
    if (cur) {
      const follow = () => { cx = lerp(cx, tx, 0.2); cy = lerp(cy, ty, 0.2); cur.style.transform = `translate(${cx}px,${cy}px)`; raf = (Math.abs(tx - cx) > 0.3 || Math.abs(ty - cy) > 0.3) ? requestAnimationFrame(follow) : 0; };
      on(window, 'pointermove', e => { tx = e.clientX; ty = e.clientY; cur.classList.add('on'); if (!raf) raf = requestAnimationFrame(follow); }, { passive: true });
      on(document, 'pointerover', e => cur.classList.toggle('big', !!e.target.closest('a, button, .tab, summary, .obj')));
      on(root, 'mouseleave', () => cur.classList.remove('on'));
      cleanups.push(() => cancelAnimationFrame(raf));
    }
  }

  // ---- scroll engine ----
  const nav = $('#nav'), bar = $('.scroll-progress i'), navCta = $('#navCta'), regSec = $('#register');
  let ticking = false, lastY = scrollY, tlActive = -1, lastStage = -1;
  const pinned = () => DESK.matches && !RM.matches && !document.body.classList.contains('no-pin');

  function update() {
    ticking = false;
    const y = scrollY, vh = innerHeight, max = Math.max(1, root.scrollHeight - vh);
    if (bar) bar.style.transform = `scaleX(${clamp(y / max)})`;
    nav?.classList.toggle('scrolled', y > 24);
    root.style.setProperty('--sp', clamp(y / max).toFixed(3));
    if (regSec && navCta) navCta.classList.toggle('pulse', regSec.getBoundingClientRect().top > vh * 0.8);

    const ws = $('#workshop'), track = $('#wsTrack'), wsBar = $('#wsBar'), stages = $$('.stage');
    if (ws && track) {
      if (pinned()) {
        const r = ws.getBoundingClientRect(), p = clamp(-r.top / (r.height - vh)), travel = track.scrollWidth - innerWidth;
        track.style.transform = `translate3d(${-p * travel}px,0,0)`; if (wsBar) wsBar.style.transform = `scaleX(${0.25 + p * 0.75})`;
        const idx = Math.min(stages.length - 1, Math.round(p * (stages.length - 1)));
        stages.forEach((s, i) => s.classList.toggle('active', i === idx));
        if (idx !== lastStage && lastStage !== -1) sfx('card'); lastStage = idx;
      } else {
        track.style.transform = ''; const r = ws.getBoundingClientRect();
        if (wsBar) wsBar.style.transform = `scaleX(${clamp((vh - r.top) / (r.height + vh))})`; stages.forEach(s => s.classList.remove('active'));
      }
    }
    if (!RM.matches) {
      const rules = $$('.rule');
      rules.forEach((c, i) => {
        const n = rules[i + 1]; if (!n) return;
        const stick = parseFloat(getComputedStyle(c).top), p = clamp(1 - (n.getBoundingClientRect().top - stick) / c.offsetHeight);
        c.style.transform = `scale(${1 - p * 0.06})`; c.style.filter = `brightness(${1 - p * 0.18})`;
        if (p > 0.98 && !c._s) { c._s = 1; sfx('card'); } if (p < 0.5) c._s = 0;
      });
    }
    const tl = $('#tl'), fill = $('#tlFill');
    if (tl && fill) {
      const tr = tl.getBoundingClientRect(), mid = vh * 0.55; fill.style.transform = `scaleY(${clamp((mid - tr.top) / tr.height)})`;
      let act = -1; $$('.tl-item').forEach((it, i) => { const o = it.getBoundingClientRect().top < mid; it.classList.toggle('on', o); if (o) act = i; });
      if (act > tlActive && y > lastY) sfx('node', act, 80); tlActive = act;
    }
    lastY = y;
  }
  const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  on(window, 'scroll', req, { passive: true }); on(window, 'resize', req); DESK.addEventListener('change', req); RM.addEventListener('change', req);
  cleanups.push(() => { DESK.removeEventListener('change', req); RM.removeEventListener('change', req); });
  update();

  // ---- reveals + section highlight ----
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    $$('[data-reveal]').forEach(el => io.observe(el));
    const sec = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      $$('.links a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
      if (!e.target._h) { e.target._h = 1; if (e.target.id !== 'hero') sfx('section', null, 800); }
    }), { threshold: 0.35 });
    $$('main > section').forEach(s => sec.observe(s));
    cleanups.push(() => { io.disconnect(); sec.disconnect(); });
  } else $$('[data-reveal]').forEach(el => el.classList.add('in'));

  return () => cleanups.forEach(fn => fn());
}
