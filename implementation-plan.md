# Implementation Plan: "Global Dialogues: Co-existing" Registration Website

## 0. Items to confirm before building

The site will display dates and names publicly, so these inconsistencies in the proposal should be settled first:

- **Event date:** Section 1 says 15 November 2026, but the timeline says the event is on 14 November, with rehearsal on 13 November.
- **Project manager:** Section 1 lists Thinn Myat Noe, but the team table lists Megen. Megen also appears as an Activity 3 Game Leader.
- **Venue:** M4U Networking Space is "subject to confirmation". Use a config variable so it can change without a redesign.
- **Capacity:** 70-80 is tentative. Make it a single config value.

All of these will live in one `event.config.js` file, so a change takes seconds.

---

## 1. Concept and design direction

**Core idea:** "Many voices, one table." The proposal is about people leaving familiar circles and mixing, so the visuals should show scattered groups drifting together and blending.

### Visual identity

- **Palette:** The dress code is black and white, so the base is near-black (`#0B0B0F`) and off-white (`#F4F2EE`). One warm accent (amber `#FFB020`) and one cool accent (electric teal `#2DD4BF`) represent the two communities. Where they overlap, they blend into a third gradient, which is a visual metaphor for co-existing.
- **Light and dark:** Dark by default, with a light theme toggle that keeps the same accents.
- **No emoji anywhere.** Use inline SVG icons (Lucide or Phosphor, line style) in UI, buttons, and cards.

### Typography

| Role | Font | Reason |
|---|---|---|
| Display headings | Bricolage Grotesque (or Sora) | Modern, expressive, strong at large sizes |
| Body and form text | Inter or Plus Jakarta Sans | Highly legible at small sizes in forms |
| Schedule times and labels | JetBrains Mono | Gives the timeline a precise, technical feel |
| Thai fallback | Noto Sans Thai Looping | Participants are Thai students |
| Myanmar fallback | Noto Sans Myanmar | The organizing association is Myanmar, and the language game uses Burmese |

Set the font stack as `'Bricolage Grotesque', 'Noto Sans Thai Looping', 'Noto Sans Myanmar', sans-serif`. This prevents broken glyphs when the greeting rotator displays Thai or Burmese text. Use `font-display: swap`, subset to Latin plus Thai and Myanmar, and self-host the files for speed.

---

## 2. Technology stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Vite with vanilla JS or React | Fast build, small output. React only if you want reusable form-step components |
| Styling | Tailwind CSS plus CSS variables | Quick theming, consistent spacing |
| Animation | GSAP with ScrollTrigger and SplitText, plus Lenis for smooth scroll | Industry standard, precise timeline control |
| Particles/background | Canvas 2D (custom) or Three.js if you want depth | Lightweight custom canvas is enough for the "groups merging" effect |
| Micro-interactions | CSS transitions plus Web Animations API | Keeps small effects off the main thread |
| Success animation | Lottie (optional) or SVG path drawing | Ticket and checkmark |
| Sound | Howler.js (audio sprite) or the native Web Audio API | Reliable cross-browser playback and volume control |
| Form validation | Zod (or hand-written validators) | Same rules on client and server |
| Backend | Google Apps Script writing to Google Sheets (free) or Supabase | Fits the small budget, and the organizers already use Google tools |
| Email confirmation | Apps Script `MailApp` or Resend | Sends the ticket and QR code |
| QR code | `qrcode` library | Used for check-in at the 8:30 AM registration |
| Hosting | Vercel, Netlify, or GitHub Pages | Free with HTTPS |

---

## 3. Site structure (single page, section by section)

1. **Hero:** Event title, date, time, venue, and a "Register" button. A rotating greeting in many languages (Hello, Sawasdee, Mingalaba, Annyeong, Namaste, Ni hao, Salaam, Bonjour) cycles under the title, and a background of drifting dots shows two color groups slowly mixing.
2. **Why this matters:** The background and rationale, condensed to three short statements.
3. **Objectives:** Five cards that flip or reveal on scroll.
4. **Panel discussion:** The four discussion areas (Language, Culture, Inclusion, Practical Co-existence) as an interactive accordion or tab set.
5. **Workshop:** The four stages (Group Formation, Group Mixing, Language Exchange, Problem-solving) shown as a horizontal scroll-driven sequence.
6. **Five Rules for Co-existing:** Stacked cards that pin and layer as the user scrolls.
7. **Schedule:** A vertical timeline from 8:30 AM to 4:00 PM, where the line draws itself as the user scrolls.
8. **Team:** Roles and names in a grid, with a hover reveal of responsibilities.
9. **Register:** The multi-step form (detailed in section 5).
10. **Practical info:** Dress code (black and white with jeans), what to expect, lunch, MFU 333 recognition (pending approval), and a short FAQ.
11. **Footer:** Contact, the Myanmar Students' Association and GRD credits, and the sound toggle.

A persistent top bar contains a logo mark, section links, a theme toggle, a sound toggle, and a "Register" button that pulses subtly until the user scrolls to the form.

---

## 4. Animation plan

### 4.1 Page-level and hero

- **Intro loader (1.5-2 s max):** Dots from two color groups drift in separately and settle into the logo mark. It skips automatically on repeat visits (check `sessionStorage`).
- **Hero title:** Split by line and character with SplitText. Characters rise from a masked baseline with a stagger of about 0.02 s and `power4.out` easing.
- **Greeting rotator:** Each greeting blurs out and slides up while the next slides in. The text color shifts between the two accents.
- **Background canvas:** About 80 particles (matching the expected participant count) in two color groups. They begin clustered by color, then slowly drift toward a mixed state as the user scrolls. The mouse gently attracts nearby particles, and clicking releases a soft ripple. Use `requestAnimationFrame`, cap the frame rate on mobile, and reduce the particle count to 40 on small screens.
- **Magnetic buttons:** Primary buttons subtly follow the cursor within a 60 px radius and snap back with an elastic ease.
- **Custom cursor (desktop only):** A small ring that expands over interactive elements.

### 4.2 Scroll animations

- **Smooth scroll:** Lenis, synced with the GSAP ticker.
- **Section reveals:** Fade and rise (24 px) with a stagger on children.
- **Objectives cards:** Staggered 3D tilt-in, with a gentle hover tilt that follows the pointer.
- **Workshop sequence:** A pinned section where the four stages slide horizontally as the user scrolls vertically. A progress bar fills as each stage activates.
- **Five Rules:** Each card pins and slightly scales back as the next card stacks on top. Each rule number counts up from 0 to its value.
- **Schedule timeline:** The SVG line draws with `stroke-dashoffset`. Each time slot lights up as it reaches the viewport center, and the current-stage label updates.
- **Number counters:** Capacity, hours, and number of activities count up on first view.
- **Marquee strip:** A slow, infinite strip of the greetings and the five rule titles between sections.

### 4.3 Reduced motion

Wrap everything in `gsap.matchMedia()`. When `prefers-reduced-motion: reduce` is set, replace motion with simple fades, disable the canvas movement and parallax, and skip the pinned scroll sequences in favor of a normal vertical layout.

---

## 5. Registration form: structure and animations

### 5.1 Form design: four steps

A multi-step form feels lighter than one long page and gives more room for animation.

**Step 1: About you**
- Full name
- Student ID
- Email (MFU email preferred)
- Phone or LINE ID (optional)

**Step 2: Your background**
- Nationality or country (searchable select with text only, since emoji are restricted)
- School or faculty
- Year of study
- Student type: Thai student / International student

**Step 3: Language and preferences**
- Languages you speak (multi-select chips, with an "Other" field)
- Languages you can help others practice (supports the Multilingual Language Exchange Game, since organizers can prepare prompts in the languages actually present)
- Dietary needs for the lunch box (none, vegetarian, halal, allergies, other)
- Accessibility needs (optional)
- One short question: "What would you like to learn or talk about?" (optional, helpful for the facilitators)

**Step 4: Confirm**
- Summary review with "Edit" links back to each step
- Interest in MFU 333 recognition points or working hours (checkbox, with the note "subject to university approval")
- Consent to data use for event organization only (required)
- Consent to be contacted about event updates (required)
- Submit

### 5.2 Form animations

**Field level**
- **Floating labels:** The label starts inside the field and glides up and shrinks on focus or when filled.
- **Focus underline:** A line draws from the left to full width in the accent color, while the field gains a faint glow.
- **Live validation:** A valid field shows an SVG checkmark that draws itself. An invalid one gets a short horizontal shake (3 oscillations, 250 ms) and an error message that slides down with a height animation. Validate on blur, then on input after the first error.
- **Student ID and email helper:** As the user types, a thin progress ring around the field fills to indicate format completion.
- **Select and chips:** Chips pop in with a spring (scale 0.8 to 1.05 to 1) and toggle with a fill sweep. Selected languages appear in a "your languages" row that grows as items are added.
- **Searchable dropdown:** The panel opens with a clip-path reveal, and options stagger in.

**Step level**
- **Progress indicator:** A path with four nodes. The line between nodes fills with a gradient as steps complete, and the current node has a soft pulse. Completed nodes turn into checkmarks.
- **Step transitions:** The leaving step slides left and fades while the entering step slides in from the right (reversed when going back). Height of the container animates smoothly so there is no layout jump.
- **Keyboard flow:** Enter advances to the next step, and focus moves to the first field of the new step automatically.
- **Auto-save:** Draft data is stored in `localStorage` so a refresh does not lose progress. A small "Saved" label fades in briefly each time.

**Submit and success**
- **Submit button morph:** The button shrinks into a circle, shows a spinner ring, then morphs into a checkmark that draws itself. On error, it shakes and restores with a clear message.
- **Success screen:** A confetti burst built from the two accent colors (canvas confetti, no emoji). A digital **ticket** flips in with a 3D rotation, showing the participant's name, a QR code, event date and time, venue, and the dress code. Buttons: "Add to calendar" (.ics download), "Download ticket" (PNG), and "Share".
- **Capacity indicator:** A thin bar above the form showing spots remaining. When fewer than 15 remain, the bar turns amber and gently pulses. When full, the form switches to a waitlist mode with an adjusted message and animation.

---

## 6. Sound FX plan

### 6.1 Principles

- **Off until the user opts in or interacts.** Browsers block autoplay, so the first click or key press unlocks the audio context. A sound toggle in the nav shows an animated equalizer icon (SVG bars) when on.
- **Respect the preference:** Store it in `localStorage`. Default volume around 35 percent. Muted when the tab is hidden. Also off when `prefers-reduced-motion` is set, unless the user turns it on manually.
- **Subtle and consistent:** Short sounds (under 400 ms), soft tonal character (glassy, wooden, or airy) so it feels welcoming rather than game-like.
- **Never block the interface.** Sounds are decorative, and every action works without them.

### 6.2 Sound map

| Event | Sound | Notes |
|---|---|---|
| Sound toggled on | Soft rising chime | Confirms audio works |
| Page intro complete | Gentle whoosh with a low pad swell | Plays once |
| Button hover | Very quiet tick | Throttled to one per 150 ms |
| Button click | Soft pop | |
| Section enters view | Light airy swish | Only for major sections, max once per section |
| Timeline node activates | Short pluck, pitch rising along the timeline | Pitch steps up the scale as the day progresses |
| Rule card stacks | Paper-slide sound | |
| Field focus | Faint tick | |
| Chip selected / deselected | Pop up / pop down (pitch lower) | |
| Valid field | Small bright "ding" | |
| Invalid field | Muted low thud | Not harsh |
| Step advance | Whoosh forward | |
| Step back | Whoosh reversed | |
| Submit success | Ascending three-note chime with a sparkle tail | Synced with confetti |
| Submit error | Soft descending two-note | |
| Spots almost full | One gentle alert tone | Once per session |

### 6.3 Implementation

- Create one **audio sprite** (single file, `.webm` with `.mp3` fallback, under 150 KB) with a JSON map of start and duration for each cue, loaded with Howler.
- Build a central `SoundManager` module with `play(name, {volume, rate})`, `mute()`, `unmute()`, and throttling per cue. Components call it rather than touching Howler directly.
- Add small random pitch variation (plus or minus 4 percent) on repeated sounds like typing and chips so they do not feel mechanical.
- **Sourcing:** Use CC0 packs (Kenney UI audio, Freesound CC0), or synthesize cues with the Web Audio API (oscillators plus envelopes) to avoid any licensing questions and keep the payload tiny. Record the license for every file in `/assets/audio/LICENSES.md`.

```js
// soundManager.js (sketch)
import { Howl } from 'howler';

const sprite = {
  click: [0, 180], hover: [300, 90], valid: [500, 320],
  invalid: [900, 260], step: [1300, 350], success: [1800, 1400]
};

const sfx = new Howl({ src: ['/audio/sfx.webm', '/audio/sfx.mp3'], sprite, volume: 0.35 });
let enabled = localStorage.getItem('sfx') === 'on';
const lastPlayed = {};

export function play(name, { gap = 120 } = {}) {
  if (!enabled || document.hidden) return;
  const now = performance.now();
  if (now - (lastPlayed[name] || 0) < gap) return;
  lastPlayed[name] = now;
  const id = sfx.play(name);
  sfx.rate(0.96 + Math.random() * 0.08, id);
}

export function setEnabled(v) {
  enabled = v;
  localStorage.setItem('sfx', v ? 'on' : 'off');
}
```

---

## 7. Data, backend, and security

**Submission schema (Google Sheet columns or a database table)**

`timestamp, full_name, student_id, email, phone_or_line, nationality, faculty, year, student_type, languages_spoken, languages_can_teach, dietary, accessibility, interests, mfu333_interest, consent_data, consent_contact, status (confirmed or waitlist), checked_in (boolean), ticket_code`

**Flow**
1. Client validates with the same schema as the server.
2. A POST goes to the Apps Script web app or Supabase edge function.
3. The server re-validates, checks capacity, and rejects duplicates by student ID and email.
4. It generates a unique ticket code (short, non-guessable), stores the row, and sends the confirmation email with the QR code.
5. The client receives `{status, ticketCode}` and plays the success animation.

**Protection**
- Honeypot hidden field plus a minimum fill time to block bots, and Cloudflare Turnstile if abuse appears.
- Rate limiting per IP.
- HTTPS only, with no sensitive data (passwords, national ID) collected.
- A clear privacy notice in line with Thailand's PDPA: purpose (event organization only), retention (delete after the post-event report), and a contact for removal requests.

**Check-in tool (optional but valuable)**
A password-protected admin page for the registration team that scans the QR code with the phone camera and marks the participant as checked in. This directly supports the 8:30-9:00 AM registration slot. The proposal notes external staff will handle registration, so keep the tool simple enough to use with no training.

**Organizer dashboard (optional)**
A live summary of registrations, nationality split, Thai vs international ratio, language list for preparing the language exchange prompts, and dietary counts for ordering lunch boxes.

---

## 8. Accessibility and performance

### Accessibility

- Contrast at WCAG AA or better in both themes.
- Every field has a real `<label>`, and errors are announced with `aria-live="polite"`.
- Full keyboard navigation with a visible focus ring, and logical tab order across steps.
- Animations never carry meaning alone: success and error are also stated in text.
- Alt text and `aria-hidden` for decorative canvases and SVGs.
- Sound is never required, and there is a persistent, labeled toggle.
- Test with a screen reader (NVDA or VoiceOver) on the form.

### Performance targets

- Lighthouse 90 or higher for Performance, Accessibility, and Best Practices on mobile.
- Largest Contentful Paint under 2.5 s on a typical mobile connection. Most students will register from phones.
- Total JavaScript under about 250 KB gzipped. Lazy-load GSAP plugins, the confetti library, and the QR library.
- Fonts subsetted, with `preload` for the primary display font only.
- Canvas paused when off-screen (IntersectionObserver) and when the tab is hidden.

**Mobile first:** Design at 375 px width first. Replace the pinned horizontal workshop sequence with a vertical stack on small screens, reduce particles, and remove the custom cursor.

---

## 9. Suggested project structure

```
/src
  /assets
    /fonts
    /audio        (sfx.webm, sfx.mp3, LICENSES.md)
    /icons        (SVG)
  /config
    event.config.js     (date, venue, capacity, schedule, rules, team)
  /components
    Hero, About, Objectives, Panel, Workshop,
    Rules, Schedule, Team, RegisterForm, Ticket, FAQ, Footer
  /lib
    animations.js       (GSAP timelines, ScrollTrigger setup)
    particles.js        (hero canvas)
    soundManager.js
    validation.js
    api.js
  /styles
    tokens.css          (colors, type scale, spacing, easing)
    base.css
/public
```

---

## 10. Delivery phases

| Phase | Scope | Output |
|---|---|---|
| 1. Foundation | Confirm date, venue, and PM; finalize copy from the proposal; set up repo, tokens, fonts | Approved copy deck and design tokens |
| 2. Design | Wireframes, mobile and desktop mockups, ticket design, motion storyboard for hero, timeline, and form | Clickable prototype |
| 3. Static build | All content sections, responsive layout, theme toggle | Working site without motion |
| 4. Motion | Hero canvas, scroll animations, rules stack, schedule timeline, reduced-motion paths | Animated site |
| 5. Form | Four-step form, validation, form animations, ticket, draft saving | Working front end |
| 6. Backend | Sheet or database, email with QR code, capacity and waitlist, duplicate check | End-to-end registration |
| 7. Sound | Prepare or synthesize the sprite, SoundManager, wire cues, toggle | Full audio layer |
| 8. QA and launch | Device and browser tests, accessibility audit, Lighthouse, load test, privacy notice, domain and HTTPS | Public launch |
| 9. Event support | Check-in tool, organizer dashboard, reminder email on 12 November | Event-day readiness |

**Suggested timing:** The proposal's own timeline has promotional planning from late October. Aim to launch registration by the end of October, close it around 9 November (when materials are confirmed and lunch boxes counted), and send reminders on 12 November, before the 13 November rehearsal.

---

## 11. Testing checklist

- **Browsers:** Chrome, Safari (iOS), Firefox, Samsung Internet.
- **Devices:** low-end Android phone, standard iPhone, laptop, tablet.
- **Form:** empty submit, invalid formats, duplicate registration, full-capacity waitlist, refresh mid-form (draft restore), slow network, offline error.
- **Sound:** first-interaction unlock, mute persistence, tab hidden, rapid clicking (throttling), iOS silent switch behavior.
- **Motion:** reduced-motion setting, 60 fps scroll on mid-range phones, no layout shift during step transitions.
- **Languages:** Thai and Burmese text rendering in the greeting rotator, form fields, and email.
- **Accessibility:** keyboard-only completion of the form, screen reader pass, 200 percent zoom.

---

## 12. Content notes drawn from the proposal

- Use the proposal's own phrasing for the core message: co-existing does not require sameness, but recognizing differences, listening, and finding ways to live and work together with mutual respect.
- Present the Five Rules exactly as written (Respect Differences, Listen Before Judging, Communicate with Openness, Include Others, Find Solutions Together), since they are the event's backbone and are referenced throughout the workshop.
- The language-exchange game is "not limited to Burmese", so the greeting rotator and the form's language fields should clearly include Thai and many others, reinforcing inclusion.
- The proposal says activities should avoid stereotyping by nationality. Keep the form wording neutral: ask about nationality for logistics and mixing, and explain why ("to help us form mixed groups"), rather than using it to categorize people.
- Add a short note on the registration page that MFU 333 points or hours are subject to GRD and university approval, as the proposal states.
