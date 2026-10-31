import React from 'react';
import { FONT_OPTIONS, SECTION_KEYS } from '../../../shared/defaultSettings.js';
import { ensureFont } from '../lib/theme.js';
import ImageUpload from './ImageUpload.jsx';

const clone = o => JSON.parse(JSON.stringify(o));
const setPath = (draft, path, val) => { const n = clone(draft); let o = n; path.slice(0, -1).forEach(k => { o = o[k]; }); o[path[path.length - 1]] = val; return n; };

/* ---------- small controls ---------- */
const Card = ({ title, hint, children }) => <section className="a-card"><h2>{title}</h2>{hint && <p className="muted">{hint}</p>}<div className="a-fields">{children}</div></section>;
const Row = ({ label, hint, children }) => <label className="a-row"><span><b>{label}</b>{hint && <small>{hint}</small>}</span>{children}</label>;

function Toggle({ label, hint, checked, onChange }) {
  return <Row label={label} hint={hint}><span className="switch"><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} /><i /></span></Row>;
}
function Text({ label, hint, value, onChange, area, max = 200, type = 'text' }) {
  return <Row label={label} hint={hint}>{area ? <textarea rows={2} maxLength={max} value={value} onChange={e => onChange(e.target.value)} /> : <input type={type} maxLength={max} value={value} onChange={e => onChange(e.target.value)} />}</Row>;
}
function Range({ label, hint, value, min, max, step = 1, unit = '', onChange }) {
  return <Row label={label} hint={hint}><span className="range"><input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} /><output>{value}{unit}</output></span></Row>;
}
function Color({ label, hint, value, onChange }) {
  return (
    <Row label={label} hint={hint}>
      <span className="color"><input type="color" value={value} onChange={e => onChange(e.target.value.toUpperCase())} aria-label={label} />
        <input type="text" value={value} maxLength={7} onChange={e => { const v = e.target.value; if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v.toUpperCase()); }} onBlur={e => { if (!/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onChange(value.length === 7 ? value : '#FFB020'); }} /></span>
    </Row>
  );
}
function Segmented({ label, hint, value, options, onChange }) {
  return <Row label={label} hint={hint}><span className="seg">{options.map(([v, l]) => <button type="button" key={v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>)}</span></Row>;
}

/* ---------- list editor (rows of text columns, add / remove / reorder) ---------- */
function ListEditor({ title, hint, rows, onChange, cols, blank, max = 30, min = 0 }) {
  const get = (r, c) => (c.key !== undefined ? r[c.key] : r[c.i]);
  const put = (r, c, v) => { const n = Array.isArray(r) ? [...r] : { ...r }; if (c.key !== undefined) n[c.key] = v; else n[c.i] = v; return n; };
  const move = (i, d) => { const n = [...rows], j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; onChange(n); };
  return (
    <Card title={title} hint={hint}>
      <div className="a-list-editor">
        {rows.map((r, i) => (
          <div className="le-row" key={i}>
            <div className="le-cols" style={{ gridTemplateColumns: cols.map(c => c.w || '1fr').join(' ') }}>
              {cols.map((c, ci) => (
                <label key={ci}><small>{c.label}</small>
                  {c.options ? <select value={get(r, c)} onChange={e => onChange(rows.map((x, xi) => (xi === i ? put(x, c, e.target.value) : x)))}>{c.options.map(o => <option key={o} value={o}>{o}</option>)}</select>
                    : c.area ? <textarea rows={2} value={get(r, c)} onChange={e => onChange(rows.map((x, xi) => (xi === i ? put(x, c, e.target.value) : x)))} />
                      : <input value={get(r, c)} onChange={e => onChange(rows.map((x, xi) => (xi === i ? put(x, c, e.target.value) : x)))} />}
                </label>
              ))}
            </div>
            <div className="le-tools">
              <button type="button" className="a-icon" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
              <button type="button" className="a-icon" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="Move down">↓</button>
              <button type="button" className="a-icon danger" onClick={() => onChange(rows.filter((_, xi) => xi !== i))} disabled={rows.length <= min} aria-label="Remove">✕</button>
            </div>
          </div>
        ))}
        {rows.length < max && <button type="button" className="a-btn add" onClick={() => onChange([...rows, clone(blank)])}>+ Add</button>}
      </div>
    </Card>
  );
}

/* ---------- people: organisers, contributors and staff ---------- */
const GROUP_NAMES = { organizer: 'Organizer', contributor: 'Contributor', staff: 'Staff' };
function PeopleEditor({ rows, onChange, flash, onAuthError }) {
  const upd = (i, patch) => onChange(rows.map((r, n) => (n === i ? { ...r, ...patch } : r)));
  const move = (i, d) => { const n = [...rows], j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; onChange(n); };
  return (
    <Card title="People" hint="Organizers, contributors and staff shown on the website. People without a name are ignored. Photos are cropped square.">
      <div className="a-list-editor">
        {rows.map((r, i) => (
          <div className="le-row person-row" key={i}>
            <ImageUpload kind="photo" label="Add photo" size={64} value={r.photo} flash={flash} onAuthError={onAuthError} onChange={id => upd(i, { photo: id })} />
            <div className="le-cols" style={{ gridTemplateColumns: '1.2fr 1.2fr .8fr' }}>
              <label><small>Name</small><input value={r.name} maxLength={80} onChange={e => upd(i, { name: e.target.value })} /></label>
              <label><small>Role</small><input value={r.role} maxLength={80} onChange={e => upd(i, { role: e.target.value })} /></label>
              <label><small>Group</small><select value={r.group} onChange={e => upd(i, { group: e.target.value })}>{Object.entries(GROUP_NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            </div>
            <div className="le-tools">
              <button type="button" className="a-icon" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
              <button type="button" className="a-icon" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="Move down">↓</button>
              <button type="button" className="a-icon danger" onClick={() => onChange(rows.filter((_, n) => n !== i))} aria-label="Remove">✕</button>
            </div>
          </div>
        ))}
        {rows.length < 60 && <button type="button" className="a-btn add" onClick={() => onChange([...rows, { name: '', role: '', group: 'staff', photo: '' }])}>+ Add person</button>}
      </div>
    </Card>
  );
}

/* ---------- tabs ---------- */
export function DesignTab({ draft, setDraft, flash, onAuthError }) {
  const t = draft.theme, up = (k, v) => setDraft(d => setPath(d, ['theme', k], v));
  const fontPick = (k, list, name) => { ensureFont(list.find(f => f.name === name)); up(k, name); };
  FONT_OPTIONS.display.concat(FONT_OPTIONS.body).forEach(f => { if (f.name === t.displayFont || f.name === t.bodyFont) ensureFont(f); });
  return (
    <>
      <Card title="Logo" hint="Shown in the top bar, the footer and at the top of every email. Use the official MFU logo file (PNG with a transparent background looks best).">
        <ImageUpload kind="logo" label="Upload logo" value={draft.branding.logoId} flash={flash} onAuthError={onAuthError} onChange={id => setDraft(d => setPath(d, ['branding', 'logoId'], id))} />
        <Text label="Logo description (for screen readers)" value={draft.branding.logoAlt} max={100} onChange={v => setDraft(d => setPath(d, ['branding', 'logoAlt'], v))} />
      </Card>
      <Card title="Colours" hint="Accent colours drive the buttons, shapes and the animated people.">
        <Segmented label="Default theme" hint="Visitors can still switch with the sun/moon button." value={t.mode} options={[['light', 'Light'], ['dark', 'Dark'], ['auto', 'Match device']]} onChange={v => up('mode', v)} />
        <Color label="Accent 1" value={t.accent1} onChange={v => up('accent1', v)} />
        <Color label="Accent 2" value={t.accent2} onChange={v => up('accent2', v)} />
        <Color label="Light background" value={t.lightBg} onChange={v => up('lightBg', v)} />
        <Color label="Dark background" value={t.darkBg} onChange={v => up('darkBg', v)} />
        <div className="swatch" style={{ background: t.lightBg }}><i style={{ background: t.accent1 }} /><i style={{ background: t.accent2 }} /><i style={{ background: t.darkBg }} /></div>
      </Card>
      <Card title="Fonts" hint="Loaded from Google Fonts. Thai, Burmese and Chinese text keep their own fonts.">
        <Row label="Headings">
          <select value={t.displayFont} onChange={e => fontPick('displayFont', FONT_OPTIONS.display, e.target.value)}>{FONT_OPTIONS.display.map(f => <option key={f.name}>{f.name}</option>)}</select>
        </Row>
        <p className="font-sample" style={{ fontFamily: `'${t.displayFont}', serif` }}>Global Dialogues: Co-existing</p>
        <Row label="Body text">
          <select value={t.bodyFont} onChange={e => fontPick('bodyFont', FONT_OPTIONS.body, e.target.value)}>{FONT_OPTIONS.body.map(f => <option key={f.name}>{f.name}</option>)}</select>
        </Row>
        <p className="font-sample body" style={{ fontFamily: `'${t.bodyFont}', sans-serif` }}>A day of conversation, games and shared problem-solving.</p>
      </Card>
      <Card title="Shape">
        <Range label="Corner roundness" hint="Cards, panels and the form" value={t.radius} min={0} max={48} unit="px" onChange={v => up('radius', v)} />
        <div className="radius-sample" style={{ borderRadius: t.radius }} />
      </Card>
    </>
  );
}

export function AnimationTab({ draft, setDraft }) {
  const a = draft.animation, up = (k, v) => setDraft(d => setPath(d, ['animation', k], v));
  return (
    <>
      <Card title="Motion" hint="Turn any animation off, or change how fast everything moves.">
        <Range label="Overall speed" hint="1 is normal. Lower is calmer, higher is livelier." value={a.speed} min={0.25} max={3} step={0.25} unit="×" onChange={v => up('speed', v)} />
        <Toggle label="Animated people" hint="The skeleton-rigged people in the hero and workshop" checked={a.people} onChange={v => up('people', v)} />
        <Toggle label="Floating shapes" hint="Stars, squiggles and dots around the sections" checked={a.doodles} onChange={v => up('doodles', v)} />
        <Toggle label="Scrolling greetings strip" checked={a.marquee} onChange={v => up('marquee', v)} />
        <Toggle label="Reveal on scroll" hint="Sections fade and rise as they appear" checked={a.reveal} onChange={v => up('reveal', v)} />
        <Toggle label="Pinned workshop scroll" hint="On laptops the four stages slide sideways while you scroll" checked={a.pinnedWorkshop} onChange={v => up('pinnedWorkshop', v)} />
      </Card>
      <Card title="Background">
        <Toggle label="Soft morphing background" checked={a.background} onChange={v => up('background', v)} />
        <Range label="Background strength" value={a.blobOpacity} min={0} max={100} unit="%" onChange={v => up('blobOpacity', v)} />
      </Card>
      <Card title="Sound">
        <Toggle label="Click and hover sounds" hint="Visitors need to tap once before the browser lets sound play" checked={a.sound} onChange={v => up('sound', v)} />
      </Card>
    </>
  );
}

const SECTION_LABELS = { why: 'Why this matters', objectives: 'Objectives', panel: 'Panel discussion', workshop: 'Workshop', rules: 'Five rules', schedule: 'Schedule', team: 'Organizers, contributors and staff', info: 'Info and FAQ' };

export function ContentTab({ draft, setDraft, flash, onAuthError }) {
  const e = draft.event, h = draft.hero, c = draft.content;
  const ev = (k, v) => setDraft(d => setPath(d, ['event', k], v)), hr = (k, v) => setDraft(d => setPath(d, ['hero', k], v)), ct = (k, v) => setDraft(d => setPath(d, ['content', k], v));
  const ICONS = ['i-lang', 'i-culture', 'i-incl', 'i-prac'];
  return (
    <>
      <Card title="Sections" hint="Hide any section from the website.">
        {SECTION_KEYS.map(k => <Toggle key={k} label={SECTION_LABELS[k]} checked={draft.sections[k]} onChange={v => setDraft(d => setPath(d, ['sections', k], v))} />)}
      </Card>
      <Card title="Registration rules" hint="Who can register and how seats work. Each email can register once, confirmed with an emailed code.">
        <Text label="Allowed email domains" hint="Separate with commas" value={draft.registration.allowedDomains.join(', ')} max={200} onChange={v => setDraft(d => setPath(d, ['registration', 'allowedDomains'], v.split(',').map(x => x.trim()).filter(Boolean)))} />
        <Toggle label="Let people pick a seat" hint="Shows the 3D cinema seat map. Off = seats are assigned automatically." checked={draft.registration.seatSelection} onChange={v => setDraft(d => setPath(d, ['registration', 'seatSelection'], v))} />
        <Range label="Seats per row" value={draft.registration.seatCols} min={4} max={20} onChange={v => setDraft(d => setPath(d, ['registration', 'seatCols'], v))} />
      </Card>
      <Card title="Event details" hint="Shown in the hero, the ticket and the calendar file.">
        <Text label="Event title" value={e.title} onChange={v => ev('title', v)} />
        <Text label="Date (calendar)" type="date" value={e.dateISO} onChange={v => ev('dateISO', v)} />
        <Text label="Date (as shown)" value={e.dateLabel} onChange={v => ev('dateLabel', v)} />
        <Text label="Start time" type="time" value={e.startTime} onChange={v => ev('startTime', v)} />
        <Text label="End time" type="time" value={e.endTime} onChange={v => ev('endTime', v)} />
        <Text label="Venue" value={e.venue} onChange={v => ev('venue', v)} />
        <Text label="Campus" value={e.campus} onChange={v => ev('campus', v)} />
        <Row label="Capacity" hint="After this many confirmed registrations, new people join the waitlist"><input type="number" min="1" max="5000" value={e.capacity} onChange={ev2 => ev('capacity', Number(ev2.target.value))} /></Row>
        <Row label="“Almost full” warning at"><input type="number" min="0" max="500" value={e.lowSpotsThreshold} onChange={ev2 => ev('lowSpotsThreshold', Number(ev2.target.value))} /></Row>
        <Text label="Registration closes" value={e.registrationCloses} onChange={v => ev('registrationCloses', v)} />
        <Text label="Contact email (footer)" type="email" value={e.contactEmail} onChange={v => ev('contactEmail', v)} />
      </Card>
      <Card title="Hero text">
        <Text label="Small line above the title" value={h.eyebrow} max={160} onChange={v => hr('eyebrow', v)} />
        <Text label="Title, line 1" value={h.line1} max={60} onChange={v => hr('line1', v)} />
        <Text label="Title, line 2 (coloured)" value={h.line2} max={60} onChange={v => hr('line2', v)} />
        <Text label="Register button" value={h.registerLabel} max={40} onChange={v => hr('registerLabel', v)} />
      </Card>
      <ListEditor title="Greetings" hint="Shown in the hero and the moving strip. The font stack picks the typeface for that script." rows={c.greetings} onChange={v => ct('greetings', v)} max={16} min={1} blank={['Hello', 'Language', "'Fraunces', serif"]}
        cols={[{ i: 0, label: 'Greeting', w: '1fr' }, { i: 1, label: 'Language', w: '1fr' }, { i: 2, label: 'Font stack (CSS)', w: '2fr' }]} />
      <Card title="Why this matters"><Text label="Heading" value={c.whyTitle} max={140} onChange={v => ct('whyTitle', v)} /></Card>
      <ListEditor title="Why cards" rows={c.why} onChange={v => ct('why', v)} max={3} min={3} blank={['Title', 'Text']} cols={[{ i: 0, label: 'Title', w: '1fr' }, { i: 1, label: 'Text', area: true, w: '2fr' }]} />
      <ListEditor title="Objectives" rows={c.objectives} onChange={v => ct('objectives', v)} max={12} blank={['Title', 'Text']} cols={[{ i: 0, label: 'Title', w: '1fr' }, { i: 1, label: 'Text', area: true, w: '2fr' }]} />
      <ListEditor title="Panel discussion" rows={c.panel} onChange={v => ct('panel', v)} max={8} min={1} blank={{ k: 'Topic', icon: 'i-lang', t: 'Topic', d: 'Description' }}
        cols={[{ key: 'k', label: 'Tab label', w: '1fr' }, { key: 't', label: 'Heading', w: '1fr' }, { key: 'icon', label: 'Icon', options: ICONS, w: '.7fr' }, { key: 'd', label: 'Text', area: true, w: '2fr' }]} />
      <ListEditor title="Workshop stages" hint="Exactly four stages, each with its own animated scene." rows={c.stages} onChange={v => ct('stages', v)} max={4} min={4} blank={{ n: '05', t: 'Stage', d: 'Text' }}
        cols={[{ key: 'n', label: 'No.', w: '.4fr' }, { key: 't', label: 'Title', w: '1fr' }, { key: 'd', label: 'Text', area: true, w: '2fr' }]} />
      <ListEditor title="Five rules" rows={c.rules} onChange={v => ct('rules', v)} max={5} min={5} blank={['Rule', 'Text']} cols={[{ i: 0, label: 'Rule', w: '1fr' }, { i: 1, label: 'Text', area: true, w: '2fr' }]} />
      <ListEditor title="Schedule" rows={c.schedule} onChange={v => ct('schedule', v)} max={20} blank={['00:00', 'Title', 'Text']} cols={[{ i: 0, label: 'Time', w: '.5fr' }, { i: 1, label: 'Title', w: '1fr' }, { i: 2, label: 'Text', area: true, w: '1.6fr' }]} />
      <PeopleEditor rows={c.people} onChange={v => ct('people', v)} flash={flash} onAuthError={onAuthError} />
      <ListEditor title="FAQ" rows={c.faq} onChange={v => ct('faq', v)} max={20} blank={['Question?', 'Answer']} cols={[{ i: 0, label: 'Question', w: '1fr' }, { i: 1, label: 'Answer', area: true, w: '1.6fr' }]} />
    </>
  );
}
