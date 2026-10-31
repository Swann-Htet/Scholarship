import { defaultSettings, FONT_OPTIONS, SECTION_KEYS } from '../shared/defaultSettings.js';
import { Setting } from './models.js';

const clone = o => JSON.parse(JSON.stringify(o));
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);

function deepMerge(base, over) {
  if (!isObj(over)) return base;
  for (const k of Object.keys(over)) {
    if (isObj(base[k]) && isObj(over[k])) deepMerge(base[k], over[k]);
    else if (over[k] !== undefined) base[k] = over[k];
  }
  return base;
}

export async function getSettings() {
  const doc = await Setting.findOne({ key: 'site' }).lean();
  return deepMerge(clone(defaultSettings), doc?.data || {});
}

// ---- validation: never trust what the admin form (or anyone with a stolen token) sends ----
const str = (v, max, fb) => (typeof v === 'string' ? v.slice(0, max) : fb);
const num = (v, min, max, fb) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fb; };
const bool = (v, fb) => (typeof v === 'boolean' ? v : fb);
const hex = (v, fb) => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : fb);
const pick = (v, list, fb) => (list.includes(v) ? v : fb);
const date = (v, fb) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : fb);
const time = (v, fb) => (typeof v === 'string' && /^\d{2}:\d{2}$/.test(v) ? v : fb);
const tuples = (v, n, fb, max = 30, len = 400) => (Array.isArray(v) ? v.slice(0, max).map(r => Array.from({ length: n }, (_, i) => str(Array.isArray(r) ? r[i] : '', len, ''))) : fb);
const ICONS = ['i-lang', 'i-culture', 'i-incl', 'i-prac'];

export function sanitize(input) {
  const d = defaultSettings, i = isObj(input) ? input : {};
  const ev = isObj(i.event) ? i.event : {}, he = isObj(i.hero) ? i.hero : {}, th = isObj(i.theme) ? i.theme : {}, an = isObj(i.animation) ? i.animation : {}, se = isObj(i.sections) ? i.sections : {}, co = isObj(i.content) ? i.content : {};
  const displayNames = FONT_OPTIONS.display.map(f => f.name), bodyNames = FONT_OPTIONS.body.map(f => f.name);
  return {
    event: {
      title: str(ev.title, 120, d.event.title), dateISO: date(ev.dateISO, d.event.dateISO), dateLabel: str(ev.dateLabel, 60, d.event.dateLabel),
      startTime: time(ev.startTime, d.event.startTime), endTime: time(ev.endTime, d.event.endTime), venue: str(ev.venue, 120, d.event.venue), campus: str(ev.campus, 120, d.event.campus),
      capacity: Math.round(num(ev.capacity, 1, 5000, d.event.capacity)), lowSpotsThreshold: Math.round(num(ev.lowSpotsThreshold, 0, 500, d.event.lowSpotsThreshold)),
      registrationCloses: str(ev.registrationCloses, 60, d.event.registrationCloses), contactEmail: str(ev.contactEmail, 120, '')
    },
    hero: { eyebrow: str(he.eyebrow, 160, d.hero.eyebrow), line1: str(he.line1, 60, d.hero.line1), line2: str(he.line2, 60, d.hero.line2), registerLabel: str(he.registerLabel, 40, d.hero.registerLabel) },
    theme: {
      mode: pick(th.mode, ['light', 'dark', 'auto'], d.theme.mode), accent1: hex(th.accent1, d.theme.accent1), accent2: hex(th.accent2, d.theme.accent2),
      lightBg: hex(th.lightBg, d.theme.lightBg), darkBg: hex(th.darkBg, d.theme.darkBg), displayFont: pick(th.displayFont, displayNames, d.theme.displayFont),
      bodyFont: pick(th.bodyFont, bodyNames, d.theme.bodyFont), radius: Math.round(num(th.radius, 0, 48, d.theme.radius))
    },
    animation: {
      background: bool(an.background, d.animation.background), blobOpacity: Math.round(num(an.blobOpacity, 0, 100, d.animation.blobOpacity)), doodles: bool(an.doodles, d.animation.doodles),
      people: bool(an.people, d.animation.people), marquee: bool(an.marquee, d.animation.marquee), reveal: bool(an.reveal, d.animation.reveal),
      pinnedWorkshop: bool(an.pinnedWorkshop, d.animation.pinnedWorkshop), sound: bool(an.sound, d.animation.sound), speed: num(an.speed, 0.25, 3, d.animation.speed)
    },
    sections: Object.fromEntries(SECTION_KEYS.map(k => [k, bool(se[k], d.sections[k])])),
    content: {
      greetings: tuples(co.greetings, 3, d.content.greetings, 16, 120),
      whyTitle: str(co.whyTitle, 140, d.content.whyTitle),
      why: tuples(co.why, 2, d.content.why, 6),
      objectives: tuples(co.objectives, 2, d.content.objectives, 12),
      panel: Array.isArray(co.panel) ? co.panel.slice(0, 8).map((p, n) => ({ k: str(p?.k, 60, ''), icon: pick(p?.icon, ICONS, ICONS[n % 4]), t: str(p?.t, 80, ''), d: str(p?.d, 400, '') })) : d.content.panel,
      stages: Array.isArray(co.stages) ? co.stages.slice(0, 4).map((p, n) => ({ n: str(p?.n, 4, '0' + (n + 1)), t: str(p?.t, 80, ''), d: str(p?.d, 400, '') })) : d.content.stages,
      rules: tuples(co.rules, 2, d.content.rules, 8),
      schedule: tuples(co.schedule, 3, d.content.schedule, 20),
      team: tuples(co.team, 2, d.content.team, 16),
      faq: tuples(co.faq, 2, d.content.faq, 20, 800)
    }
  };
}

export async function saveSettings(input) {
  const data = sanitize(input);
  await Setting.findOneAndUpdate({ key: 'site' }, { key: 'site', data }, { upsert: true, new: true });
  return data;
}
