# Global Dialogues: Co-existing — registration site

Static site. No build step, no dependencies to install. Open `index.html`, or serve the folder:

```bash
npx serve site
```

## Files
- `event.config.js` — dates, venue, capacity, schedule, rules, team, FAQ, form options. **Start here.**
- `index.html`, `styles.css`, `app.js` — structure, styling and all animation/sound/form logic.
- `backend/Code.gs` — Google Apps Script that writes to a Sheet, checks capacity and duplicates, and emails the QR ticket.

## Before launch
1. Resolve the CONFIRM items in `event.config.js` (event date 14 vs 15 Nov, project manager, venue, capacity).
2. Replace DRAFT copy (objectives, panel text, stage text, schedule, team) with the proposal's wording.
3. Deploy `backend/Code.gs`, paste the web app URL into `endpoint`. Until then the form runs in **demo mode** (data stays in the visitor's browser).
4. Optional: self-host the fonts and replace the cdnjs QR script with a local copy.

## Motion and sound
- Hero: Venn vectors that draw and drift together, orbiting dots, a particle field in two colour groups that mixes as you scroll.
- Workshop: pinned horizontal sequence on laptop, vertical stack on phone, with animated vector scenes per stage.
- Rules stack and scale back; schedule line fills and nodes ping; form has floating labels, drawn checkmarks, shake errors, step slides, button morph, confetti and a flip-in ticket.
- All motion falls back to simple fades under `prefers-reduced-motion`. Sound is synthesised (Web Audio), off by default, and toggled from the nav.
