import { FONT_OPTIONS } from '../../../shared/defaultSettings.js';

const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
export const shade = (h, p) => '#' + rgb(h).map(c => Math.round(c * (1 - p)).toString(16).padStart(2, '0')).join('');

const PRELOADED = ['Fraunces', 'DM Sans']; // already requested in index.html
const loaded = new Set(PRELOADED);

export function ensureFont(opt) {
  if (!opt || loaded.has(opt.name)) return;
  loaded.add(opt.name);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${opt.name.replace(/ /g, '+')}${opt.spec}&display=swap`;
  document.head.appendChild(link);
}

const find = (list, name) => list.find(f => f.name === name) || list[0];
const readTheme = () => { try { return localStorage.getItem('gd-theme'); } catch { return null; } };
export const saveVisitorTheme = t => { try { localStorage.setItem('gd-theme', t); } catch { /* ignore */ } };

export function resolveMode(settings) {
  const visitor = readTheme();
  if (visitor === 'light' || visitor === 'dark') return visitor;
  const m = settings.theme.mode;
  if (m === 'auto') return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  return m;
}

export function applyTheme(settings, { preview = false } = {}) {
  const t = settings.theme, a = settings.animation, root = document.documentElement;
  const display = find(FONT_OPTIONS.display, t.displayFont), body = find(FONT_OPTIONS.body, t.bodyFont);
  ensureFont(display); ensureFont(body);
  const mode = preview ? (t.mode === 'dark' ? 'dark' : 'light') : resolveMode(settings);
  root.setAttribute('data-theme', mode);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = mode === 'dark' ? t.darkBg : t.lightBg;

  let style = document.getElementById('gd-theme-vars');
  if (!style) { style = document.createElement('style'); style.id = 'gd-theme-vars'; document.head.appendChild(style); }
  style.textContent = `
:root{--amber:${t.accent1};--teal:${t.accent2};--r:${t.radius}px;--blob-k:${(a.blobOpacity / 50).toFixed(2)};
--display:'${display.name}','Pyidaungsu','Noto Sans Thai Looping','Noto Sans Myanmar',${display.generic};
--body:'${body.name}','Pyidaungsu','Noto Sans Thai Looping','Noto Sans Myanmar','Noto Sans SC',${body.generic}}
[data-theme="dark"]{--bg:${t.darkBg};--amber-t:${t.accent1};--teal-t:${t.accent2}}
[data-theme="light"]{--bg:${t.lightBg};--amber-t:${shade(t.accent1, 0.35)};--teal-t:${shade(t.accent2, 0.4)}}`;

  const b = document.body.classList;
  b.toggle('no-bg', !a.background); b.toggle('no-doodles', !a.doodles); b.toggle('no-people', !a.people);
  b.toggle('no-marquee', !a.marquee); b.toggle('no-reveal', !a.reveal); b.toggle('no-pin', !a.pinnedWorkshop);
}

// Speeds up / slows down every running CSS animation and transition (SMIL people are scaled at render time).
export function applySpeed(speed) {
  const go = () => document.getAnimations().forEach(an => { try { an.updatePlaybackRate(speed); } catch { /* ignore */ } });
  go(); setTimeout(go, 600); setTimeout(go, 2500);
}
