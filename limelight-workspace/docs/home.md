# Home, login and the workspace shell

This covers signing in, accounts and sessions, the Home dashboard, clock-in, the app bar and search, and colour themes.

---

## 1. Login and accounts

### What users can do
- Sign in once with the **HR (Lighthouse) email and password** (the HR web app at https://lighthouse.limelightcorp.in).
- After that, Office, Edit, Design, Limelight AI and the HR pages open already signed in. There is no second login and no "Connected accounts" screen (one was built and then removed).
- Sign out from the account menu (top right).

### How it works
| Step | What happens | Code |
|---|---|---|
| 1 | The login page (`/login`, `public/login.html`) posts email + password to `POST /api/login` | `server.mjs` |
| 2 | The workspace sends them to the HR server `POST /api/auth/login` (10 s limit) | `auth.mjs` `login()` |
| 3 | On success it stores the user in `Data/users.json`: name, role, a scrypt hash of the password (for offline sign-in) and the HR token, **AES-256-GCM encrypted** with `Data/secret.key` | `auth.mjs` |
| 4 | It creates a session and sets the cookie `lw_sess` (HttpOnly, SameSite=Lax). On the public site the cookie has `Domain=limelightcorp.net; Secure`, so it works on the apex, `www` and every `lh-*` app host | `auth.mjs` `sessionCookie()` |
| 5 | Every later request: `auth.userOf(req)` finds the session in `Data/sessions.json`. No session → `/api/*` gets 401, pages get a 302 to `/login` | `server.mjs` |

- **Offline fallback:** if the HR server cannot be reached, the last password the HR server accepted on this PC still works. A first sign-in needs the internet.
- **Wrong password** shows "Wrong email or password" (the HR server returns an error object; it used to show "[object Object]").
- **Paths that need no login** (`OPEN` in `server/core.mjs`): `/login`, `/api/login`, `/api/health`, `css/`, `fonts/`, `img/`, `js/theme-boot.js`, `js/frame.js`, `manifest.webmanifest`, `sw.js`, `offline.html`.
- **Sign-in log:** `server.log` records each sign-in (email, accepted or not, host, browser) and each "not signed in" visit to `/` or `/api/me` with whether a cookie was sent. Passwords are never logged.
- `GET /api/me` returns name, email, role, `admin`, `owner`, the HR id and the owners' names (`aiReady` is still sent but no longer used by the page).

### Sessions (decided rules)
| Rule | Detail |
|---|---|
| 30 days from last use | Not from sign-in. `renew()` moves the expiry forward at most once a day. Someone who opens it at least once a month never signs in again on that device. 31 idle days → signed out. Logout ends it at once |
| Keep signed in | First names in `config.json` `keepSignedIn` (default `gurpreet`) get a 10-year session. They still sign in once per device. The account was **not** made password-less, because anyone on the internet could then sign in as a co-founder |
| HR token for long sessions | The HR token renews yearly. If Office/HR pages stop loading after a year, signing in once fixes it |

### Roles
| Role | Rule | Code |
|---|---|---|
| Owner | First name in `config.owners` (default `jaspreet`, `gurpreet`) | `isOwner()` in `server/state.mjs` |
| Admin | HR role `admin`, or an owner | `isAdmin()` |
| Owners only | No clock-in card, no Attendance tab, no task or work-time tracking, left out of Salary and the Time board. They are admins everywhere | `server/areas/profile.mjs`, `salary.mjs` |

---

## 2. Home (dashboard)

### What users see
- **Greeting** ("Good morning, <name>.") with live date and time, and a short **Bhagavad Gita line** in English with the Hindi (one line on a computer, two quiet lines on a phone). The verse changes daily. (Earlier versions used Limelight-written English quotes.)
- **Clock-in card** right under the greeting (section 3). Hidden for owners.
- **App cards** (same size): Edit, Design, Office, Limelight AI. Each shows a big icon, Live/Off, a short description and a live figure (designs this week, new mails, an AI prompt box "Ask or create →").
- **Number tiles:** Unread chats, Today's tasks (from HR), Attendance (opens Profile).
- **Lists:** Today feed (All / Chats / Tasks / Files), Meetings, Projects (HR), Team updates (HR). Clicking a row opens that chat, task, design or app page.

### How it works
- `GET /api/dashboard` (`server/areas/home.mjs`) collects in one call: HR tasks, today's clock-in, HR projects, HR activity, Office unread mail and today's meetings (asked as the person through the Office key), and which apps are up.
- Each source gets at most **3 s**; a slow one shows "–" and never holds Home up.
- The result is kept **one minute per person**. After 15 s it is refetched in the background, so Home opens at once. First load about 0.2 s, then about 2 ms.
- `GET /api/today` gives the person's open HR tasks (up to 6).
- The page also loads `/api/chat/list`, `/api/projects` and `/api/library` (Studio designs and images) for the feed.
- App status dots refresh every 30 s (`/api/apps/status`).
- Files: `public/index.html` (`#v-home`), `public/js/workspace.js` (`loadHome`, `QUOTES`, app cards), `public/css/workspace.css`, `public/css/mobile.css`.

---

## 3. Clock in / clock out

### What users can do
- Before clock-in the card shows a pulsing ring. After clock-in it turns green with a running "Working · Xh Ym" timer and a Clock out button.
- The HR app requires a **selfie**: the button opens the camera (fallback "Use a photo"), plus a choice of Office / WFH / Field and the location. The selfie is a 320×400 JPEG.
- After clock-in a full-screen **welcome animation** plays (rings, sparks, "Welcome to the AI world, <first name>" and a quote). It closes on click or after about 5 s.
- **On a phone:** slide to clock in (drag the yellow knob all the way; a half slide snaps back). While working it shows a red "Slide to clock out". A computer keeps a normal button.

### How it works
| Route | Goes to (HR server, as the person) |
|---|---|
| `GET /api/punch` | `/api/attendance/today` and `/api/settings` (selfie rules) |
| `POST /api/punch` | `/api/attendance/clock-in` with `{lat, lng, acc, addr, selfie, mode}`, or `/api/attendance/clock-out` |
| Owners | `/api/punch` answers `{owner: true}`; no card is shown |

Files: `server/areas/profile.mjs` (`punch`), `public/js/profile.js` (clock card, welcome), `public/css/profile.css`, `public/css/mobile.css` (slider).

---

## 4. The app window, app bar and search

- Apps open **filling the window** under one slim bar (about 35 px): page tabs (Home, Chats, Create, Library, Profile) on the left, a big search in the centre, app icons (Edit, Design, Office, AI) on the right. No logo on that bar; the big header comes back on Home.
- Each app is a frame that stays loaded while you switch (`makeFrame`, `openApp` in `workspace.js`).
- **Full screen** (browser full screen) keeps the slim bar. App icons switch apps while staying full screen. Esc exits.
- A **"← Workspace"** button sits in the corner of Edit, Office and AI (put in by the proxy, `HOME_JS`); Design has its own.
- If an app is off, its card shows Off and a **Start** button for Office and Design (`POST /api/apps/<id>/start` runs the app's `.vbs`). If the app does not answer, the frame shows "<App> is offline".
- **Search** (top tray, every page, Ctrl+K / Cmd+K): finds apps, Office pages, chats, people and designs as you type, plus "Make an image with AI" / "Make a video with AI" with the typed text. File: `public/js/search.js`.
- Earlier versions had a "Reload / Open in new window" title strip and Share/Reload/Full-screen buttons top right. They were removed at the owner's request.
- The Share button is described in [chats.md](chats.md).

Helper scripts the proxy puts into every framed app page (`server/apps-proxy.mjs`):
| Script | Job |
|---|---|
| `WHERE_JS` (`lhWhere`) | Tells the workspace which page and title are open (for Share and work time) |
| `lhActive` (inside `WHERE_JS`) | Reports mouse/keyboard use for the work-time log |
| `lhLaunch` (inside `WHERE_JS`) | Passes `limelight://` links (Open in Premiere/DaVinci) up to the main page |
| `HOME_JS` (`lhHome`) | The "← Workspace" button |

---

## 5. Colour themes

- A palette button in the header. 14 choices: **Pure Black** (default), Aurora, Ocean, Sunrise (replaced Sunset), Forest, Rose, Midnight, Classic, Bento, Rose Quartz (light), Editorial (light, cream; the logo turns dark), Graphite, Desktop, and **Custom** (5 colours: Base, Glow 1-3, Button; a light base switches to light mode).
- Each device/browser keeps its own choice in localStorage `lh-theme-vars`. `public/js/theme-boot.js` applies it before the page paints (also on the login page).
- When a theme's colours change in code, devices that picked it get the new colours automatically.
- Default history: Glass Aurora → Soft Aurora (lavender-peach-sky, floating pill header) → Desktop (30 Oct, a few minutes) → **Pure Black everywhere**. Devices that saved Desktop during those minutes were moved back to Black once (`lh-theme-reset1`).
- Themes list: `THEMES` in `public/js/workspace.js`. Base colours: `:root` in `public/css/workspace.css`.

---

## Settings that affect this area (`config.json`)

| Key | Default | Meaning |
|---|---|---|
| `port` | 3350 | Workspace port |
| `lighthouseUrl` | https://lighthouse.limelightcorp.in | HR server used for login and HR data |
| `owners` | jaspreet, gurpreet | First names of the owners |
| `keepSignedIn` | gurpreet | First names with a 10-year session |
| `publicDomain`, `publicHost`, `appHosts` | limelightcorp.net, lh-* hosts | Public addresses and cookie domain |

## Decisions and why
- **One login = the HR account.** One account per person, already managed by HR; no new accounts in any app.
- **Many design rounds** for Home: Glass Aurora → line icons, widgets, Today feed → "Big Numbers" Bento dashboard → top row became app tabs → Soft Aurora header → greeting centred, big logo off Home (logo only in the tray) → uniform big app cards. The option pages are now in `archive/mockups/` (the notes say they are served at `/options.html` etc.; in the current code they were moved out of `public/` and are no longer served).
- The "Welcome back — a new work session started" toast was removed (owner: not needed).
- Real clock-ins were never made while testing, because they would create real attendance.

## Fixes worth knowing
- Login page did nothing for everyone (30 Oct): an apostrophe in "Couldn't sign in" broke the page script → "Could not sign in"; all edited files were checked for the same issue.
- Login page error 500 with no user (`user?.email`); `theme-boot.js` and `frame.js` added to the no-login list.
- Office tile said Office was off: it waited on an outside mailbox with no time limit → 3 s cap (later mail became team-only).
- `.go` CSS class clash on the welcome overlay → renamed `.play`.
- Logo dark box (drop-shadow) removed; search popup put above the theme list (`z-index`).

## Known issues / pending
- One real clock-in from a real account on a real phone (camera, selfie, location) has not been done.
- A staff "login still not working" report never reached the server; it needs a screenshot with the address bar (could be the old HR site, an in-app login or the .exe).
- Confirm one real staff sign-in end to end after the login fixes.
