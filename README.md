# Global Dialogues: Co-existing

Registration website for the event, built with the **MERN stack**:

| Letter | Tech | Where |
|---|---|---|
| **M** | MongoDB (Atlas, free tier) | stores registrations and the website settings |
| **E** | Express | `server/` (the API) |
| **R** | React (Vite) | `client/` (public website and `/admin`) |
| **N** | Node.js | runs the API |

```
client/        React app: public site (/) and admin panel (/admin)
server/        Express API + Mongoose models
shared/        defaultSettings.js (default content, used by both sides)
api/index.js   Vercel entry point for the API
vercel.json    Vercel configuration
```

The registration form asks only for **name, MFU email and LINE ID**, confirms the email with a 6-digit code, and shows an animated 3D cinema seating plan. Seats are assigned automatically and admins can move people on the same 3D plan. Everything you see on the website (colours, fonts, animations, text, sections) can be changed from the admin panel without touching code.

---

## Part 1: MongoDB for complete beginners (about 10 minutes)

MongoDB stores data as *documents* (like JSON objects) inside *collections* (like folders) inside a *database*. You do **not** create tables or run any setup commands: the app creates the `registrations` and `settings` collections by itself the first time it saves something.

We use **MongoDB Atlas**, MongoDB's free online service, so you install nothing.

**Step 1. Create an account.** Go to <https://www.mongodb.com/cloud/atlas/register> and sign up (Google sign-in works).

**Step 2. Create a free cluster.** Choose **M0 (Free)**, any cloud provider, and the region closest to your visitors (for example Singapore). Click **Create**. The cluster takes a minute or two.

**Step 3. Create a database user.** In the left menu go to **Database Access → Add New Database User**.
- Authentication: Password. Choose a username (for example `gdapp`) and **Autogenerate Secure Password**, then **copy the password now**.
- Privileges: *Read and write to any database*. Click **Add User**.
- Tip: avoid the characters `@ : / ? # %` in a password you type yourself, they break the connection string.

**Step 4. Allow connections.** Go to **Network Access → Add IP Address**.
- For local testing: **Add Current IP Address**.
- For Vercel: choose **Allow access from anywhere** (`0.0.0.0/0`). Vercel does not have a fixed IP address. This is safe here because the database still needs the username and password.

**Step 5. Get the connection string.** Go to **Database → Connect → Drivers** and copy the string. It looks like:

```
mongodb+srv://gdapp:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
```

Replace `<password>` with your password and add the database name before the `?`:

```
mongodb+srv://gdapp:YourPassword@cluster0.abcde.mongodb.net/globaldialogues?retryWrites=true&w=majority
```

**Step 6. Look at your data later.** In Atlas open **Database → Browse Collections**. You will see `globaldialogues → registrations` and `settings`. You can also install **MongoDB Compass** (a free desktop app) and paste the same connection string.

---

## Part 2: Run it on your computer

You need [Node.js 18+](https://nodejs.org).

```bash
# 1. install everything
npm run install:all

# 2. create your settings file
copy .env.example .env        # Windows   (use: cp .env.example .env  on Mac/Linux)
```

Open `.env` and fill it in:

```
MONGODB_URI=<the string from Part 1, step 5>
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=a-long-password-only-you-know
JWT_SECRET=any-long-random-text-like-k29dj38dhs8d7f6s5d4f
```

```bash
# 3. start the API (port 5000) and the website (port 5173) together
npm run dev
```

- Website: <http://localhost:5173>
- Admin panel: <http://localhost:5173/admin> (sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`)

`.env` is in `.gitignore`, so your passwords are never uploaded to GitHub.

---

## Part 3: Put it online with Vercel

The repo is already connected to Vercel, which redeploys on every push. Two things to do once:

1. In Vercel open your project → **Settings → Environment Variables** and add the same four values as in `.env`: `MONGODB_URI`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `JWT_SECRET` (apply to Production, Preview and Development).
2. Go to **Deployments → ⋯ → Redeploy** so the new variables are used.

Then open `https://your-site.vercel.app/admin`. If the website shows the default content but registering fails, check that Atlas **Network Access** allows `0.0.0.0/0` and that `MONGODB_URI` has no `<` `>` characters left in it.

How the pieces fit on Vercel: `vercel.json` builds `client/` into static files and sends every `/api/*` request to `api/index.js`, which runs the Express app as a serverless function.

---

## Email setup (verification codes and tickets)

People must verify their MFU email with a code, so the server needs an email account to send from. The easiest free option is a Gmail account:

1. Use (or create) a Gmail account just for the event.
2. Turn on **2-Step Verification**: Google Account → Security → 2-Step Verification.
3. Create an **App password**: Google Account → Security → search "App passwords" → name it `Global Dialogues` → **Create**. Copy the 16 letters (no spaces).
4. Put these in `.env` **and** in Vercel (Settings → Environment Variables), then redeploy:

| Name | Value |
|---|---|
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | your Gmail address |
| `SMTP_PASS` | the 16-letter app password |
| `MAIL_FROM` | `Global Dialogues <yourgmail@gmail.com>` (optional) |

Gmail allows about 500 emails per day, which is plenty. Any other SMTP service works too (Brevo, Mailgun, Zoho): just use its host, port, username and password.

**Testing without email:** set `DEV_SHOW_OTP=1` in your local `.env`. The code is then printed in the terminal and shown on the page. This is ignored on Vercel, so it can never leak a code in production.

## How registration works

1. The visitor enters name, **MFU email** and LINE ID. They cannot choose a seat: one is assigned automatically.
2. Only the email domains listed in **Admin → Content → Registration rules** are accepted (default `@lamduan.mfu.ac.th` and `@mfu.ac.th`).
3. A 6-digit code is emailed. It expires in 10 minutes, allows 5 tries and can be re-sent after 45 seconds.
4. After the correct code the ticket (QR code + seat) is created and a copy is emailed. Seats are handed out front row first, from the middle of each row outwards.
5. **One registration per mailbox**: `name+tag@lamduan.mfu.ac.th` counts as `name@lamduan.mfu.ac.th`. LINE IDs are unique too.
6. If the event is full, people join the waitlist (no seat).

## Bot and scam protection (freeze for 15 minutes)

A visitor's IP address is **frozen for 15 minutes** and sees a warning when they:

- fill the hidden trap field, or paste links / spam text in the form (instant freeze),
- send the form without a valid, timed token (bots that post directly), or too fast,
- guess the email code wrongly 5 times, or request too many codes,
- fail admin login too many times.

Wrong email domains only collect warnings (many students share one campus Wi-Fi address, so one freeze would hit everybody). The warning says the visitor's **IP address, browser details and attempt were logged**. The site does not collect GPS location, and the message does not claim to. Admins can see and **unfreeze** visitors in **Admin → Security**.

## Email design (Admin → Emails)

Both emails are normal HTML that you can edit without code:

- **Verification code email** (sent with the 6-digit code) and **Ticket email** (sent with the QR code and seat).
- Edit the **subject** and the **HTML**. Click a placeholder chip such as `{{name}}`, `{{code}}`, `{{seat}}`, `{{qr}}` or `{{logo}}` to insert it at the cursor. Values are inserted safely (escaped), so a visitor's name can never inject HTML.
- The live **preview** updates as you type, with a Desktop / Phone switch.
- **Send test email** sends the draft (even before you save) to any address, with sample data.
- **Reset to default design** restores the original template. Scripts, forms and `javascript:` links are removed automatically.
- The logo and the ticket QR code are attached **inside** the email, so they show without the reader pressing "load images".

Tip: email apps are fussy. Keep layouts table-based with inline `style="..."` (like the default), and avoid web fonts.

## Logo and people

- **Admin → Design → Logo**: upload the official MFU logo (PNG, JPG or WebP; a PNG with a transparent background looks best). It appears in the top bar, the footer and every email. I cannot download the MFU logo for you, so you upload it here. It is resized in your browser first, so any normal logo file works.
- **Admin → Content → People**: add **organizers, contributors and staff** with a name, role, group and an optional photo. They appear on the website in three groups. Use the arrows to reorder. People without a name are ignored.
- Uploaded images are stored in MongoDB and served from `/api/asset/<id>`. Images that are no longer used are cleaned up automatically after an hour.

## Check-in with QR codes

- **Admin → Check-in** has a camera scanner. Point it at the QR on a ticket (or type the code).
- To avoid giving volunteers an admin login, create a **check-in link** (label + how long it works). It opens `/checkin/<secret>` on their phone with just the scanner. Links expire automatically and can be switched off at any time. The secret is shown only once when you create it.
- Scanning marks the person as checked in. A second scan says "already checked in"; waitlist people are rejected.
- Camera access needs HTTPS, which Vercel provides.

## Admins

The **owner** is the `ADMIN_EMAIL` / `ADMIN_PASSWORD` from your environment. In **Admin → Admins** the owner and any admin can add more admins (email + password, 10+ characters), reset their passwords or remove them. Passwords are stored as salted hashes.

## Seats

- **Visitors** see an animated 3D seating plan (seats rise in row by row, people appear on taken seats). They cannot pick a seat. After registering, their own seat gets a glowing beam and the camera flies to it. The saved ticket refreshes its seat from the server, so if an admin moves them, they see the new seat.
- **Admins** use **Admin → Seats**: click a person (on the map or in the lists), then click a free seat to move them, or another person's seat to swap. **Seat everyone** assigns all confirmed people without a seat. Waitlist people have no seat; moving someone to the waitlist frees their seat.
- **The room is yours to design** in **Admin → Seat layout** (see below). Rows A to H are just the starting layout.
- You can hide the plan with **Show the 3D seating plan** (Admin → Content → Registration rules).
- Drawn with three.js, loaded only when the section comes into view. On laptops drag to look around; on phones the plan sways gently. Reduced-motion users get a calm version.

### Seat layout editor (Admin → Seat layout)

A top-down editor where **every seat is a movable object**, so the plan can match any room:

- **Drag** any seat to move it. **Drag on the floor** to select many (Shift adds to the selection). The mouse wheel zooms; hold Alt or the middle mouse button to pan.
- **Toolbar:** add a seat by clicking the floor, delete, duplicate, align (left / centre / right / top / middle / bottom), space evenly, rotate 15°, turn towards the stage, snap to a grid, undo / redo. Keys: arrows nudge, Del deletes, Ctrl+Z / Ctrl+Y undo / redo, Ctrl+D duplicates, Ctrl+A selects all.
- **Selection panel:** exact label, position and rotation of a seat; width, depth and position of the stage.
- **Generate a layout:** curved rows, straight rows, or straight rows with aisles, with your own number of rows and seats, spacing and distance from the stage. You can still move every seat afterwards.
- **Auto-label rows:** names the rows A, B, C… from the stage backwards and numbers seats left to right.
- **Raised floor:** rows further back can be higher, like a cinema.
- **3D preview** shows the result as visitors will see it.
- Changes are saved with **Save changes**. **People keep their physical seat**: renaming or swapping seat labels moves the people with the seats. If you delete a seat, the person sitting there loses their seat and shows up under "Without a seat" in **Admin → Seats**, where you can seat them again.
- Seats are handed out closest to the stage first, from the middle outwards, whatever the shape. The "Capacity setting" is how many people can be confirmed before the waitlist starts; the editor shows a button to match it to your seat count.

---

## The admin panel (`/admin`)

| Tab | What you can do |
|---|---|
| Dashboard | Totals, capacity bar, registrations per day, latest sign-ups |
| Registrations | Search, seat, switch confirmed ⇄ waitlist, tick check-in, delete, **copy emails**, **export CSV** |
| Seats | 3D view: move or swap people between seats, seat everyone |
| Seat layout | Design the room: drag every seat, generate rows and aisles, move the stage |
| Check-in | QR scanner and volunteer check-in links |
| Admins | Add / remove admins, reset passwords |
| Security | See and unfreeze frozen visitors |
| Emails | Edit the verification and ticket emails (HTML), preview, send a test |
| Design | Logo upload, light/dark default, accent colours, heading and body fonts, corner roundness |
| Animation | Speed, animated people, floating shapes, background, scroll reveal, pinned workshop, sound |
| Content | Show/hide sections, event details and capacity, hero text, greetings (with a font per language), objectives, panel, workshop stages, rules, schedule, **people (organizers, contributors, staff)**, FAQ |

Changes go live when you press **Save changes**. **Reset to defaults** loads the built-in content (it is not saved until you press Save).

## Security notes

- Passwords are never stored in the database or in the code: the admin login uses `.env` values and signs a 12-hour token.
- The API validates every input, rate-limits and freezes abusive visitors, and escapes CSV cells. Colours and fonts saved from the admin are checked against allowed values.
- The registration form has a hidden honeypot field and a minimum fill time to block simple bots.
- Names, emails, LINE IDs and IP addresses are personal data. The website says they are used only for this event; delete the registrations (Admin → Registrations, or Atlas) after the post-event report as promised.

## Content still to confirm

The proposal gives conflicting dates (15 vs 14 November), and the project manager, venue, capacity, schedule and team are placeholders. Set them in **Admin → Content**.

## Burmese font (Pyidaungsu)

Pyidaungsu is not on Google Fonts. Put `Pyidaungsu-Regular.woff2` (or `.ttf`) in `client/public/fonts/` and push. Until then Burmese text uses Padauk, then Noto Sans Myanmar.

## Notes on the animation

The people are *rigged* vector figures: the shoulders, elbows and neck are separate joints that rotate around exact pivots (SVG `animateTransform`), the same idea as bone animation. They appear in the hero and in the four workshop scenes. Loading states use shimmering skeleton placeholders.
