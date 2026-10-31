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

The registration form asks only for **name, email and LINE ID**. Everything you see on the website (colours, fonts, animations, text, sections) can be changed from the admin panel without touching code.

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

## The admin panel (`/admin`)

| Tab | What you can do |
|---|---|
| Dashboard | Totals, capacity bar, registrations per day, latest sign-ups |
| Registrations | Search, switch confirmed ⇄ waitlist, tick check-in, delete, **copy emails**, **export CSV** |
| Design | Light/dark default, two accent colours, backgrounds, heading and body fonts, corner roundness |
| Animation | Speed, animated people, floating shapes, background, scroll reveal, pinned workshop, sound |
| Content | Show/hide sections, event details and capacity, hero text, greetings (with a font per language), objectives, panel, workshop stages, rules, schedule, team, FAQ |

Changes go live when you press **Save changes**. **Reset to defaults** loads the built-in content (it is not saved until you press Save).

## Security notes

- Passwords are never stored in the database or in the code: the admin login uses `.env` values and signs a 12-hour token.
- The API validates every input, rate-limits registration and login, and escapes CSV cells. Colours and fonts saved from the admin are checked against allowed values.
- The registration form has a hidden honeypot field and a minimum fill time to block simple bots.
- Names, emails and LINE IDs are personal data. The website says they are used only for this event; delete the registrations (Admin → Registrations, or Atlas) after the post-event report as promised.

## Content still to confirm

The proposal gives conflicting dates (15 vs 14 November), and the project manager, venue, capacity, schedule and team are placeholders. Set them in **Admin → Content**.

## Burmese font (Pyidaungsu)

Pyidaungsu is not on Google Fonts. Put `Pyidaungsu-Regular.woff2` (or `.ttf`) in `client/public/fonts/` and push. Until then Burmese text uses Padauk, then Noto Sans Myanmar.

## Notes on the animation

The people are *rigged* vector figures: the shoulders, elbows and neck are separate joints that rotate around exact pivots (SVG `animateTransform`), the same idea as bone animation. They appear in the hero and in the four workshop scenes. Loading states use shimmering skeleton placeholders.
