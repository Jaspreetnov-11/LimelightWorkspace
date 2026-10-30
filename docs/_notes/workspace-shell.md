# Limelight Workspace ("Lighthouse") — project notes

Clean notes built from two Claude Code chats (main workspace chat `8aa2a40f…`, 29–30 Oct 2026, and the side chat `2d798d2e…` that removed Edit's sign-in, built the Library player and ran the Office/Design side sessions). This is a reference to understand and rebuild the workspace, not a chat log. No passwords, keys, salaries or personal data are recorded here.

Naming: it started as "Limelight Studio" → "Limelight Workspace" → "Lighthouse". Later the owner asked to remove the word "Lighthouse" from everything people see, so the UI now just says **Limelight** with the Limelight logo. In chat it is still called Lighthouse; the folder stays `limelight-workspace`.

---

## 1. Overview and login / accounts

### What exists now
- One web app that puts every Limelight app in **one window behind one login**: Home (dashboard), Chats, Create (AI image/video), Library, Profile, plus the apps **Edit** (video editor), **Design** (Limelight Studio), **Office** (Limelight Office + the old Lighthouse HR web app, merged) and **Limelight AI**.
- Live at **https://limelightcorp.net** and **https://www.limelightcorp.net**; locally at `http://localhost:3350`.
- **One login = the Lighthouse HR email + password** (the HR app at `https://lighthouse.limelightcorp.in`). There is no separate Workspace account and no "Connected accounts" screen (built once, then removed).
- No second sign-in inside any app: Office, Edit, Limelight AI and the Team/HR pages are all signed in for the person by the workspace (see sections 7–10).

### How it works
- Folder: `E:\Limelight Ai\limelight-workspace`. Node server with no dependencies: `server.mjs` (routes, proxies, dashboard), `auth.mjs` (login, sessions, per-app sign-ins), `chat.mjs`, `activity.mjs` (work-time log), `salary.mjs`, `overtime.mjs` (OT, added by the Office side session).
- Start: `Start Lighthouse.bat` or `node server.mjs [--open] [--lan]`. Background start with no window: `Lighthouse Server (no window).vbs` (copy it to `shell:startup` to survive reboots). `--lan` listens on 0.0.0.0 (office network address was `http://192.168.0.210:3350`); default listens on 127.0.0.1 only.
- Config: `config.json` (template `config.example.json`): `port` 3350, `studioUrl`, `lighthouseUrl`, `editorUrl`, `editorStandbyUrl`, `aiUrl`, `aiLocalUrl`, `aiPassword` (set by an admin, never written here), `editNames` (email → Edit user name overrides), `owners` (default `jaspreet`, `gurpreet`), `keepSignedIn` (default `gurpreet`), public domain/host settings.
- Login: `POST /api/login` checks the email/password against Lighthouse HR `POST /api/auth/login`; there is an offline fallback (scrypt hash of the last good login). The person's HR token is kept encrypted (AES) server-side and reused for HR calls (tasks, attendance, profile, payroll).
- Session cookie `lw_sess` (HttpOnly, SameSite=Lax). On the public site it is scoped to `Domain=limelightcorp.net` and `Secure`, so it works on the apex, `www` and every `lh-*` app host. Sessions stored in `Data/sessions.json`.
- Data folder `Data/`: `users.json`, `sessions.json`, `chat/`, `photos/`, `activity/`, `salary/`, `overtime/`, and the shared keys `edit.key`, `ai.key`, `secret.key` (private: never print or copy).
- Roles: `isAdmin(u)` = HR role admin, or an owner. `isOwner(u)` = first name in `config.owners`. `/api/me` returns `admin` and `owner` flags.

### Session rules (decisions)
- **30 days from last use** (not from sign-in). `renew()` moves the expiry forward at most once a day, so a person who opens it at least once a month never signs in again on that device. 31 idle days → signed out. Logout ends it at once. (Before 30 Oct, sessions died on day 30 even for daily users.)
- **Gurpreet stays signed in**: names in `keepSignedIn` get a 10-year session. He signs in once per device himself; the account was deliberately **not** made password-less (anyone on the internet could then sign in as a co-founder). His HR token renews yearly; if an Office/HR page stops loading after a year, signing in once fixes it.
- **Owners (Jaspreet, Gurpreet)**: admins everywhere, no clock-in card, no Attendance tab, no task/time tracking, left out of salary and time boards. They still sign in once.

### Fixes
- Login page crash (30 Oct): an apostrophe in "Couldn't sign in" broke the login page script so the button did nothing for everyone → changed to "Could not sign in" and checked all edited files for the same issue.
- Wrong password showed "[object Object]" (HR returns an error object) → now "Wrong email or password".
- A sign-in attempt log was added (email + whether accepted + whether the cookie stuck; never passwords) to trace "can't log in" reports. A later report never reached the server, so it was something else (old HR site, an in-app login, or the .exe) — still unresolved, waiting on a screenshot with the address bar.
- Login page 500 when no user (`user?.email`); `theme-boot.js` and `frame.js` added to the public (no-login) file list.

### Pending
- Confirm a real staff sign-in end to end after the login fixes; resolve the "login still not working" report (needs a screenshot with the address bar).
- Owner's Office account still has to be linked once to the Lighthouse email (Office setup → My account).

---

## 2. Home (dashboard, clock-in, welcome)

### What exists now
- Top: greeting ("Good morning, <name>.") with live date/time, and a short **Bhagavad Gita line in English with the Hindi** (one line on desktop, two quiet lines on phone, e.g. verse 6.5). Earlier versions used Limelight-written English quotes (never copied quotes).
- **Clock-in card** right under the greeting (first thing on Home): pulsing ring before clock-in; after clock-in turns green with a running "Working · Xh Ym" timer and Clock out. Hidden for owners.
  - HR requires a selfie: the button opens the camera (fallback "Use a photo"), plus Office / WFH / Field choice and location. Selfie is a 320×400 JPEG.
  - After clock-in: full-screen **welcome animation** (rings, sparks, "Welcome to the AI world, <first name>" + a quote), closes on click or after ~5 s.
  - **Phone: slide to clock in** (drag the yellow knob all the way; half slide snaps back; red "Slide to clock out" while working). Computer keeps a normal button.
- **App cards** (uniform, bigger): Edit, Design, Office, Limelight AI — big icon, Live/Off status, a short description and a live figure (designs this week, new mails, an AI prompt box / "Ask or create →").
- **Number tiles**: Unread chats, Today's tasks (HR), Attendance (opens Profile).
- Lists: Today feed (All / Chats / Tasks / Files), Meetings, Projects (HR), Team updates (HR). Clicking any row opens that chat/task/design/app page.
- Search lives in the top tray on every page (see section 15 / Themes for header look).

### How it works
- `GET /api/dashboard` gathers a little from every app in one call (chats, HR tasks/projects/updates, Office unread mail + next meeting via the vouched Office identity, Design designs, Edit/AI status). Each source gets at most **3 s** and results are cached (`dashCache`); first load ~0.2 s, then ~2 ms.
- `GET /api/punch` / `POST /api/punch` → HR `/attendance/today`, `/attendance/clock-in` (`{lat,lng,acc,addr,selfie,mode}`), `/attendance/clock-out`. Owners get `{owner:true}`.
- Files: `public/index.html`, `public/js/workspace.js` (dashboard `loadHome`, QUOTES, app cards), `public/js/profile.js` (clock card, welcome), `public/css/profile.css`, `public/css/workspace.css`, `public/css/mobile.css`.

### Key decisions
- Many design rounds (6 looks, 7 lower-section options, 6 Bento options, 5 dashboard concepts, 6 header options — the option pages are still at `/options.html`, `/home-options.html`, `/bento-options.html`, `/dash-concepts.html`, `/header-options.html`). Chosen path: Glass Aurora → line icons + widgets + Today feed → "Big Numbers" Bento as a dashboard → top row became app tabs (Edit/Design/Office/AI) → Soft Aurora header → greeting centred, big logo removed from Home (logo only in tray) → uniform big app cards.
- "Welcome back — a new work session started" toast was removed (owner: not required).
- Real clock-ins were never made in testing (would create real attendance).

### Fixes
- "Office band hai" (Office is off) on the Office tile: the tile waited on the outside mailbox server with no time limit → 3 s cap for the count (8 s for the inbox); later mail became team-only.
- Slow Home → 3 s cap per source + cache.
- `.go` CSS class clash on the welcome overlay → renamed `.play`.

### Pending
- One real clock-in test from a real account (camera, selfie, location on a real phone).

---

## 3. Chats

### What exists now
- WhatsApp-style office chat: 1-to-1 and groups; group admin can rename and add/remove members; anyone can leave.
- Send photos/files by 📎, drag-drop or paste (up to 35 MB). Reply, delete for everyone, ✓ / blue ✓✓ read ticks, "typing…", online dot, unread counts, desktop notifications.
- **Forward** button on every message (marked "Forwarded"), and **share cards** ("<item> · Open in Edit/Office/Design") that open the exact item inside the workspace.
- People list = HR staff + anyone who has signed in to the workspace; profile photos show in chat avatars and the people picker.

### How it works
- `chat.mjs`, JSON storage in `Data/chat/`, live updates over SSE (`/api/chat/stream`). Routes: `/api/chat/list`, `/api/chat/people`, `/api/chat/direct`, `/api/chat/group`, `/api/chat/...` messages/files/read/typing.
- UI: `public/js/chats.js`.
- Each person sees only chats they are a member of.

### Fixes
- Bubble extra whitespace (pre-wrap) → text in its own span; avatar stretching; unread badge stretching across the row.
- "Chats disappeared" (30 Oct): nothing was lost — the old chats belonged to the Test Employee account that browser had been signed in as.
- Existing system lines in Hinglish ("… ne group banaya") were rewritten to English; originals backed up in `originals/chat-msgs/`.

---

## 4. Create (AI image / video)

### What exists now
- One Create page with an Image / Video switch.
- AI Image: prompt, style (Photo, Cinematic, Poster, 3D…), size (1:1, 4:5, 9:16, 16:9), Fast/Best, 1/2/4 pictures, "Leave out (negative prompt)". Made by Limelight AI (through Studio's `/api/ai/image`).
- AI Video: prompt, start photo, camera move, 9:16/16:9/1:1, 5 s/10 s. **UI only** — requests are saved (`/api/ai/video`), no engine yet.
- Search bar actions "Make an image with AI" / "Make a video with AI" use the typed text.

### Pending / ideas
- Text-to-video engine (Wan 2.2 5B or LTX-Video on NAYA B's 12 GB card).
- "Send to Design" for AI images, AI video → Edit timeline, Brand Kit, image edit/background removal (Qwen-Image-Edit on NAYA B), voice-over.
- AI images fail while NAYA B is busy running the standby editor.

---

## 5. Library (incl. YouTube-style video player)

### What exists now
- **Videos tab (opens first)**: YouTube-style player for **rendered Edit videos only**. Big player with title, project, who rendered it, date, size; buttons **Download**, **Share** (to people/groups in Chats), **Open in Edit** (opens the project). Right side: searchable list (render, project or person), newest first, project thumbnails, "Playing" badge. Autoplay next (on by default, remembered per PC). 9:16 reels get a taller player; on phone the list goes under the player.
- **Images tab**: the existing AI image library (from Studio).

### How it works
- `GET /api/renders` asks Edit **as that person** (trusted header), so Edit's own access rules decide which renders each person sees. Only finished mp4/mov/webm; no render-bar previews, audio-only or image sequences. List refreshes about once a minute.
- Video streams through the Edit proxy with HTTP Range (`206 Partial Content`) so seeking works.
- Files: `public/js/library.js`, `public/css/library.css`, `#libTabs` / `#libVideos` in `index.html`. No editor change was needed.
- Someone without a linked Edit account sees "open Edit once and sign in".

### Pending
- Download button and phone layout not tested live.

---

## 6. Profile (attendance, leaves, time, team)

### What exists now
- Profile pill (also "My profile" in the account menu): photo (click to change), role, department, employee ID, joining date, shift; this month's present / late / leave / absent; leave balance and own leaves.
- Tabs: **Overview**, **Attendance** and **Leaves / WFH** (the HR app's own pages in frames; moved out of the Office menu), **Time**, **Team**.
- **Team**: everyone (≈54) with photo and a Message button; admins can set anyone's photo.
- **Time**:
  - Staff: only their own clock in / clock out.
  - Admins: a table for any day — each person's clock in/out (with "late"), active work time per app, task time; click a person for their sessions and tasks (taken vs planned, overruns in red). Owners are excluded.
- Profiles show only safe fields: no salary, bank, ID numbers or phone.

### How it works
- Routes: `/api/profile`, `/api/team` (5-minute cache of HR `/employees`, filtered to safe fields), `/api/photo/:email`, `POST /api/photo` (JPEG data URL; own photo, or anyone's if admin), `/api/timeboard`, `/api/activity`, `/api/activity/beat`, `/api/activity/team`.
- Photos: HR has no photo field, so the workspace stores them in `Data/photos/` as `sha1(email).jpg`; shown on the avatar, in Chats and Team.
- Work-time log (`activity.mjs`, `public/js/activity.js`): every page and every app frame reports mouse/keyboard input; a heartbeat every 30 s; a session ends after **5 minutes idle** (first 3, changed to 5 by the owner). Watching playback without input counts as idle. Not linked to attendance.
- HR data used: `/auth/me`, `/attendance/today`, `/attendance?date=`, `/attendance/stats/:empId?month=`, `/leaves`, `/tasks` (`mins`, `taken_mins`), `/settings` (selfie rules, OT rate, hours per day, leave quotas, grace minutes).

### Fixes
- Time tab only loaded on its button click → loads whenever the tab opens.
- `hm` global clash in activity.js → renamed.

### Pending
- Admin Time board and admin views not checked with real admin data (test account is not admin).

---

## 7. Edit inside Lighthouse (no second sign-in)

### What exists now
- Edit (the Limelight video editor, renamed from "Video Editor") opens inside the workspace **without its own sign-in**.
- Edit opens filling the window under the slim app bar; Edit's own project tabs (with "+" for several projects) show inside the workspace; a "← Workspace" button sits in Edit's bottom bar (moved off Edit's logo).
- Edit's "Open in Premiere / DaVinci" link is handed up to the workspace, which passes it to the workspace desktop app (see section 14).
- Edit now (release `20261031-011942`, commit d369a17) has the Audio tab with Beat Maker, per-person presets/templates/music (owner sees all; old ones stay shared), newer Premiere/DaVinci message, "Ask Limelight AI" wording in Flow.

### How it works
- Proxy port **3341** → `editorUrl` NAYA A `http://192.168.0.200`, falling back to `editorStandbyUrl` NAYA B `http://192.168.0.205:3100` (targets re-checked every 20 s).
- **Trusted headers**: the workspace sends `x-lh-edit: <Edit user name>` + `x-lh-key: <shared key>`. Key: workspace `Data/edit.key` = editor `D:\Video Editor Agent\workspace.key` on NAYA A and in NAYA B's standby data (`StandbyLive`). The editor (in `startTeam()`) accepts it only with the right key **and** a real Edit team member; missing key, wrong key or unknown name → normal sign-in. No key file = feature off. Client-sent copies of these headers are always stripped.
- Name mapping: first the Edit account the person signed in to once through the workspace (remembered, stored encrypted); else `editNames` in config; else first name / email start if no one else on staff shares it. The test account maps to Edit's `test`.
- Earlier step (kept as fallback): the workspace remembers a person's Edit cookies (encrypted, `auth.editCookies/keepEditCookies/forgetEdit`) and forgets them on a 401.
- Editor source: `D:\Video Editor Agent` on JASPREET (git, GitHub `Jaspreetnov-11/EditorAgent`). Deploy only via `tools\server\Deploy to server.bat` (tests → trial on NAYA B → NAYA A; A takes the release from `D:\Limelight Release\editor` within ~15 s when idle; never kill the editor process). If the editor is old, the workspace switches Edit's tabs on itself when it loads Edit.

### Key decisions
- "Editor abhi mat chhuo" (don't touch the editor) was the rule until the owner explicitly said "Remove Edit login"; that lifted it for this change only.
- The separate Limelight Editor desktop app is no longer needed; its package is backed up in `E:\Limelight Ai\Backups\Limelight Editor app` and `limelight-workspace\editor-app-backup`.

### Fixes
- Deploy failures (30 Oct): run from bash it picked a different `scp` and could not reach PC B → run from PowerShell; trial cleanup counted an already-ended helper as a failure → fixed in `tools\server\receive-release.ps1`, committed as 47e1979.
- First "Remove Edit login" deploy was blocked by the permission check → the owner ran the deploy himself (twice).

### Pending
- Staff PCs still have the old editor app 1.4; version 1.5 (collect footage before Premiere) only arrives if installed — now superseded by the workspace app.
- Standby on NAYA B with the key not tested.
- Free DaVinci Resolve still needs one click inside Resolve (Workspace → Scripts → Limelight Timeline).

---

## 8. Office inside Lighthouse (menu, embed styling, Dashboard)

### What exists now
- **Office = Limelight Office + the old Lighthouse HR web app**, one menu, no duplicates. Sections: Work (Dashboard, Tasks, Projects from HR; Mail, Calendar, Meetings, Files from Office; Overtime), Create (Document, Grid, Deck), Team (Staff, Departments, Events, Notifications from HR; News from Office), Admin (admins only: Payroll, Payments, Clients, Reports, Performance from HR, plus **Salary**), Settings (HR Settings, Office setup). AI section removed from Office (Limelight AI is its own app). Attendance and Leaves moved to Profile.
- **Dashboard** is Office's first page and default (renamed from Office's new "Home"); tapping the Office card opens it. The old HR page is "Dashboard (classic)".
- **Every person gets their own Office account** (own mail, own files), not the owner's.
- **Mail is team mail only**, kept on Limelight's own server; no Google, no outside mailbox (banner "Team mail · kept on Limelight's own server"). To undo: `teamMailOnly: false` in Office `data\config.json` and add a mailbox again.
- **Salary** (Office → Admin → Salary, admins/owners only): pay per month from HR attendance + payroll: deductions for absent days, half days at ½, leave beyond the paid allowance, every 3 late marks = ½ day; OT = HR OT hours + a typed OT box per person × hourly pay × HR OT rate; an adjustment box per person; totals; CSV download; editable rules; owners excluded. Staff are refused by the server.
- Office side session (separate chat) redesigned Office premium: Dashboard, Notifications (grouped Today/Yesterday/Earlier, icons per type, Mark all read), Events (date cards), Payroll (summary cards + clear table), Office live editing, Overtime approvals.
- Office works on phones (section 12).

### How it works
- Proxy **3342** → Office `127.0.0.1:3300` (started by its vbs if off). HR pages: Office proxies old Lighthouse on 3301; workspace proxy **3343** = "Team" (HR) with the person's HR token injected into localStorage `lh-token`.
- **Trusted identity**: workspace sends `x-lh-as` (base64url JSON `{email,name,role}`) + `x-lh-key` (Office `data/workspace.key`, compared with timingSafeEqual). Office then finds or creates that person's member account (`auth.asPerson`). If the key is missing the workspace refuses (503) instead of falling back to the owner.
- Embed styling is injected only into framed requests (`sec-fetch-dest: iframe`): glass CSS (`GLASS_OFFICE`, `GLASS_LIGHTHOUSE`, vars on `html:root` so they win), the old apps' own sidebars hidden, and the HR app's full-screen **splash loader hidden**. Frames load with `?v=` boot stamps so stale cached pages don't show. Extra Office page styles: `public/css/office-pages.css`, `public/js/office-pages.js`, `embed/office.css`, `embed/office-hr.css/js`.
- Salary: `salary.mjs` (`compute`, `setInput`, `setRules`), routes `/api/salary`, `/api/salary/input`, `/api/salary/rules`; UI `public/js/salary.js`, `public/css/salary.css`. OT: `/api/ot`, `/api/ot/review`, `/api/ot/remove`.
- Office code: `E:\Limelight Ai\limelight-office` (`engine/auth.mjs` asPerson, `server.mjs` vouched()).

### Fixes
- **Security bug (29 Oct)**: the key path had single backslashes, the key was never read, and the Test Employee opened Office as the owner for ~20 minutes → fixed with forward slashes, refuse when key missing. Before per-person Office, Office from outside was admin-only (and showed white-on-white); that gate is gone now.
- Deck canvas collapsed: `.pp` class clash between meeting people list (team.css) and the deck editor → scoped to `.ms-ppl .pp`.
- Mail loading forever: IMAP was set to 8.8.8.8 → time limits, then the outside mailbox was removed (team-only).

### Pending
- Owner links Office account to Lighthouse email once. Salary Approve buttons and OT numbers need one check with an owner login; salary not yet checked with real payroll.

---

## 9. Design inside Lighthouse

### What exists now
- Design = Limelight Studio (port 3330), proxied on **3345**, opens with no sign-in. Studio is now a design tool only (the workspace moved out).
- Export one design as editable **PSD, PDF, CDR, AI** plus PNG, JPG, SVG; "All formats" makes one ZIP (also kept in `Exports\<design> - all formats <date>`). CDR/AI/PDF are made by **CorelDRAW 2025 on JASPREET** (`tools/corel.vbs`): real text in exact fonts/weights, Hindi editable, shapes and photos separate, true page size. Only works while JASPREET is on; ~10–20 s per page.
- "Templates" renamed "Design gallery". The one Hinglish line under the Studio title is now English.
- Design side session: 4 tabs (Design/Photoshop-like, Vector, Book, 3D), Photoshop-style **generative fill** (selection + prompt bar, own masked layer, 3 variations, Generative Expand; remove ~1 s, add/expand ~30 s using the downloaded **SDXL Inpainting** model; result guard rejects mismatched outputs; Cancel + 60 s stop), live editing (see each other's changes and pointers), neutral grey around the artboard.

### Fixes
- Logos saved through the workspace kept the proxy address and broke exports → repointed to Design's own address on open/export.
- Generative fill pasted an unrelated map: old fallback made a new picture when NAYA B refused → fallback removed, result check added.

### Pending
- Design share opens Design's start page unless Design puts the open design in its address.
- CDR/AI not opened in Illustrator/Photoshop yet.

---

## 10. Limelight AI inside Lighthouse

### What exists now
- Opens inside the workspace with no visible login. Shows the signed-in person's name in its corner.
- Per-person chats (Vishal's chats not visible to others; admins/owners also see the old shared chats) — workspace side live; NAYA B side needs `E:\Limelight Ai\limelight-ai\deploy-naya-b\Deploy to NAYA B.ps1` run by the owner.

### How it works
- Proxy **3344** → `aiUrl` NAYA B `http://192.168.0.205:8800`, fallback `aiLocalUrl` `http://127.0.0.1:8800` on JASPREET (used when NAYA B pauses AI while it runs the standby editor).
- Today: one shared AI password set by an admin in the account menu ("Limelight AI" field, `/api/settings/ai`), used to sign everyone in and by Design's generative fill to reach NAYA B. Only admins/owners see that box.
- Planned/partly built: trusted headers `x-lh-user` + `x-lh-admin` + `x-lh-key` (workspace `Data/ai.key` = NAYA B `D:\LimelightAI\app\data\workspace.key`); once B is deployed the shared password is no longer needed.

### Pending
- Run the NAYA B deploy; then remove the AI password box.

---

## 11. App window inside the workspace (all apps)

- Apps open **filling the window** under one slim bar (~35 px): page tabs (Home, Chats, Create, Library, Profile) on the left, a big search in the centre, app icons (Edit, Design, Office, AI) on the right; no logo on that bar; the big header comes back on Home.
- Full screen (browser full screen) keeps the slim bar; app icons switch apps while staying full screen; Esc exits. Office keeps its left menu.
- Share button for whatever is open (Edit project, Office doc/deck, Design page) → pick people/groups (with photos) + message → share card in Chats. Sharing an Edit project also grants Edit access if the sharer is the project maker or owner.
- Injected helper scripts in framed pages: `lhWhere` (reports what is open), `lhActive` (activity), `lhLaunch` (relays `limelight://` links), `lhHome` ("← Workspace" button). Files `public/js/share.js`, `/api/share`.
- Earlier versions: "Reload / Alag window" title strip and top-right Share/Reload/Full screen buttons — removed at the owner's request.

---

## 12. Phone / mobile UI

- `public/css/mobile.css`: bottom tab bar with icons (Home, Chats, Create, Library, Profile, frosted glass); slim header (logo + round search/theme/account buttons; search expands across the bar); no sideways overflow; 16 px inputs so phones don't zoom.
- Home on phone: smaller left-aligned greeting, app cards two per row, number tiles three per row, lists show a few rows with "All →".
- Slide to clock in (section 2).
- Office on phone: the 17-icon rail becomes a swipeable labelled tab strip on top; Mail/Calendar/Meetings/News fit (they used to run off the edge); task board swipes per column; "← Workspace" floating button hidden; Staff/Events (old HR layout) fit but look narrow (can only be restyled from outside).
- Document / Grid / Deck on phone: templates two per row, compact title bar, swipeable tabs and toolbar (was 1,450 px wide), Document reflows (saved file stays A4), Grid uses `width:max-content` so cells stay 100 px and scroll like Excel, Deck shows slide + swipeable slide strip + "+".
- Tested at phone/tablet/desktop widths with the test account; not yet with a real finger, typing or saving on a real phone.

---

## 13. Themes

- Palette button in the header. Themes: Aurora, Ocean, **Sunrise** (replaced Sunset), Forest, Rose, Midnight, Classic, Bento, Rose Quartz, Editorial (cream light, logo turns dark), **Pure Black**, Graphite, Desktop, and **Custom** (5 colours: Base, Glow 1–3, Button; a light base switches to light mode) — 14 total.
- Each device/browser keeps its own choice (localStorage `lh-theme-vars`), applied before paint by `public/js/theme-boot.js` (also on the login page). When a theme's colours are changed in code, devices that chose it get the new colours automatically.
- Default history: Glass Aurora → Soft Aurora (lavender-peach-sky, floating pill header) → Desktop (30 Oct) → **Pure Black is the default everywhere** (phones and computers) for anyone who hasn't picked one; devices that got Desktop saved during those minutes were moved back to Black once.
- Fixes: logo dark box (drop-shadow) removed; search popup layered above the theme list (`z-index`).

---

## 14. Speed / caching

- Every static file link gets `?v=<file's last-modified time>` stamped by the server when it sends the page, so a changed file automatically gets a new URL. Versioned files: `max-age=31536000, immutable` (public for open files, private otherwise); fonts/img 30 days; everything else `no-cache` with "304 not modified" support. Same treatment in Office.
- Reason: Cloudflare kept stylesheets 4 hours despite `no-cache`, so phones ran old code; from home a single stylesheet took 2.1 s, now ~0.45 s and not fetched at all on repeat visits. Login page links are versioned too.
- The 423 KB Hindi web font was dropped (phones use their built-in Hindi font); logos shrunk from 62 KB to ~5 KB (originals in `originals/`).
- Remaining limit: everything is served from JASPREET through the office internet; if that PC or its upload is slow/off, everyone feels it.

---

## 15. Installable app (PWA) and Lighthouse.exe

### PWA (30 Oct)
- `public/manifest.webmanifest` (name "Limelight", black, opens on Home), icon set (rounded for computers, full-bleed squares for iPhone/Android), `public/sw.js` service worker that only makes it installable and shows `offline.html` ("No connection — Try again"); it never serves an old copy — every open loads the latest. iPhone status-bar safe area handled.
- Install: Android Chrome ⋮ → Install app; iPhone **Safari** → Share → Add to Home Screen; Mac Chrome/Edge install icon or Safari File → Add to Dock; Windows Chrome/Edge install icon (or Lighthouse.exe). No store apps (cost, reviews, rebuilds).
- Not yet pressed "Install" on a real phone/Mac.

### Lighthouse.exe (Windows window app)
- `browser/` — WebView2 WinForms (.NET 4.8): `Program.cs`, `Nle.cs`, `Updater.cs`, `Lighthouse.csproj`, `Lighthouse.json` (start URL), `build.cmd`, `app.ico`; built app in `browser\app` (Desktop shortcut). Frameless window: the workspace header is the title bar (drag, double-click), themed ─ ▢ ✕ (`public/js/frame.js`), F11 full screen that keeps the Windows taskbar visible (uses the working area).
- Starts the local server if it is off (health check on 127.0.0.1 — `localhost` resolved to IPv6 and hung). Treats the root domain and all subdomains as in-app; outside links open in the normal browser; separate data folder per host.
- Version 1.2+: new "L ▶" icon, title "Limelight", registers `limelight://` and handles Open in Premiere/DaVinci itself with **Collect** (checks Premiere/Resolve is installed, copies all timeline footage to the PC's biggest non-C: drive under `Limelight Projects\<project>`, progress + Stop, then opens with nothing offline; re-opens copy only changes; asks if the drive is too full). **Self-update** from the NAS `\\192.168.0.99\Team Editing\Limelight Apps\Limelight Workspace` on every start (1.3 published later).
- For other PCs: `dist\Lighthouse` (opens https://www.limelightcorp.net) + `Desktop shortcut banao.vbs` + `PEHLE PADHO.txt`, zipped as `dist\Lighthouse - doosre PC ke liye.zip`.
- Decision: did not copy `Limelight Editor.exe`, because it re-registers the editor shortcut and `limelight://` links on every start.

---

## 16. Public site (Cloudflare tunnel, https, domains)

- Cloudflare named tunnel **limelight-ai** running on JASPREET (config `C:\Users\user\.cloudflared\config.yml`, `E:\Limelight Ai\tools\cloudflared.exe`). Hostnames:
  - `limelightcorp.net`, `www.limelightcorp.net` → workspace `127.0.0.1:3350`
  - `lh-edit`, `lh-office`, `lh-team`, `lh-ai`, `lh-design` `.limelightcorp.net` → app proxies 3341–3345 (all refuse without a workspace session)
  - `ai.limelightcorp.net` → NAYA B :8800; `editor.limelightcorp.net` → NAYA A editor
- `publish\Publish Lighthouse online.bat` (idempotent): backs up the tunnel config, adds missing hostnames, creates DNS routes (`--overwrite-dns` for apex/www), restarts the tunnel.
- **https only**: `toHttps()` in both the main and proxy handlers sends a 301 to https for any `*.limelightcorp.net` request that arrived as plain http (detected from `x-forwarded-proto` or Cloudflare's `cf-visitor` `{"scheme":"http"}`; the tunnel does not send x-forwarded-proto). Deep links are kept; localhost unaffected.
- Not logged in → 302 to `/login` (that is the only redirect).
- History: first published as `lighthouse.limelightcorp.net`; owner wanted the bare domain → apex + www added; apex gave **525** because of old GoDaddy A records → owner deleted them and ran `cloudflared tunnel route dns --overwrite-dns limelight-ai limelightcorp.net`; `lighthouse.` subdomain then removed from the tunnel and its DNS record deleted by the owner (NXDOMAIN).
- The site is down whenever JASPREET is off or the workspace server stops.

---

## 17. Servers and PCs

| Machine | Role |
|---|---|
| **JASPREET** (this PC, LAN ~192.168.0.210) | Workspace server :3350 + proxies 3341–3345, Studio/Design :3330, Office :3300 (HR proxy 3301), Cloudflare tunnel, CorelDRAW exports, local fallback Limelight AI :8800 (Ollama models in `D:\AI Models\ollama\models`), editor source `D:\Video Editor Agent`, editor standby |
| **NAYA A** (192.168.0.200, ssh `limelight-a`, PowerShell) | Live Edit server (`D:\Video Editor Agent\server.mjs`), takes releases from `D:\Limelight Release\editor`. **Never run Ollama/AI here.** |
| **NAYA B** (192.168.0.205, ssh `limelight-b`) | Limelight AI (FastAPI :8800, `D:\LimelightAI\app`, restarted by `run-ai.ps1`); standby editor :3100 (AI pauses while it runs the editor); trial target for every editor release |
| NAS 192.168.0.99 (`Z:`) | Lighthouse.exe update folder |
| HR app | `https://lighthouse.limelightcorp.in` (the old Lighthouse web app, source `D:\LimelightWebapp`) |

Ports: 3350 workspace · 3341 Edit · 3342 Office · 3343 Team/HR · 3344 AI · 3345 Design · 3330 Studio · 3300 Office · 3301 Office's HR proxy · 3100 editor standby · 8800 AI.

---

## 18. English wording

- All visible text is English (about 130 strings in the workspace, 18 in Office, 1 in Studio), e.g. "Aaj" → "Today", "Sab padh liya" → "All caught up", "Galat email ya password" → "Wrong email or password".
- Kept on purpose: the Gita verse's Hindi line; Office's AI Agent answers in the user's language; Design's generative fill still understands typed "hata do".
- The word "Lighthouse" removed from titles, header, login, messages and the window title; the brand is "Limelight".
- Claude's replies to the owner are in English (owner writes Hinglish).

---

## 19. Other deliverables

- `docs\Lighthouse - Feature Guide.pptx/.pdf` (18 slides, Soft Aurora, demo data) and `docs\Lighthouse - Proposal.pptx/.pdf` (21 slides, Graphite, only the apps' inner screens + Office team pages). Screens in `docs\shots\`. Payroll/Payments/Clients/Settings deliberately excluded (money data); the proposal shows real staff names/phones/birthdays — blur before sharing outside.

---

## Update log

- 2026-10-29 02:41 — Workspace UI first built inside Limelight Studio (:3330): Home prompt, app cards, AI Image, AI Video (UI only), Library.
- 2026-10-29 02:50 — All apps embedded in one window through local proxies 3341–3344.
- 2026-10-29 02:53 — Workspace split into its own app `limelight-workspace` on :3350; Studio = design only.
- 2026-10-29 02:58 — One login (HR email/password); Video Editor renamed "Edit"; Edit kept its own login ("don't touch the editor").
- 2026-10-29 03:13 — Glass Aurora look with real Limelight logo; WhatsApp-style Chats with groups; Create page.
- 2026-10-29 03:25 — Home: line-icon app row, widgets, Today feed.
- 2026-10-29 03:32 — Office + old Lighthouse merged into one Office menu; workspace renamed "Lighthouse".
- 2026-10-29 03:37 — Spotlight-style search (Ctrl+K), full-screen Home, AI removed from Office menu, 6 themes.
- 2026-10-29 03:48 — 12 themes + Custom, per device.
- 2026-10-29 03:52 — Admin field for the Limelight AI shared password.
- 2026-10-29 04:01 — Lighthouse.exe window app; Home became the Big Numbers dashboard (`/api/dashboard`).
- 2026-10-29 05:00 — Dashboard top row = Edit/Design/Office/AI tabs.
- 2026-10-29 05:14 — Soft Aurora header chosen as default.
- 2026-10-29 05:16 — Rose Quartz added; Sunset replaced by Sunrise; theme updates reach saved choices.
- 2026-10-29 05:19 — Big logo off Home; search moved into the top tray on every page.
- 2026-10-29 05:25 — Office/HR inner pages in glass; stale cached frames fixed with `?v=`; greeting centred with English quotes.
- 2026-10-29 05:33 — Edit fallback to NAYA B standby; AI fallback to JASPREET; publish script made.
- 2026-10-29 05:40 — Site moved to bare limelightcorp.net + www.
- 2026-10-29 06:05 — Full-screen button for apps; Feature Guide deck.
- 2026-10-29 06:17 — Graphite theme; Proposal deck (later 21 slides with Office team pages).
- 2026-10-29 07:42 — Lighthouse.exe zip for other PCs (opens www).
- 2026-10-29 07:54 — Apex domain live after owner fixed DNS.
- 2026-10-29 07:58 — lighthouse.limelightcorp.net removed.
- 2026-10-29 14:41 — Office admin-only notice made readable; replies switched to English.
- 2026-10-29 14:57 — Office per person (trusted headers); owner-access bug fixed; Clock-in card, welcome animation, Profile with photos, Team tab.
- 2026-10-29 17:09 — http → https redirect.
- 2026-10-29 17:13 — Office Deck layout fix.
- 2026-10-29 17:19 — Edit sign-in remembered per person (cookie jar).
- 2026-10-29 17:32 — Old HR splash loader hidden inside Office and Profile.
- 2026-10-29 17:43 — Edit opens with no sign-in (trusted key on NAYA A/B; release 20261029-231048).
- 2026-10-29 17:50 — Share button in every app; Forward and share cards in Chats.
- 2026-10-29 17:53 — Library YouTube-style player for Edit renders.
- 2026-10-29 17:59 — Full screen keeps a slim tab bar with app icons.
- 2026-10-29 18:08 — Apps open filling the window; logo = Home.
- 2026-10-29 18:26 — Work-time log (idle 3 min) and Profile Time; Premiere/DaVinci link relay.
- 2026-10-29 19:01 — Design exports PSD/PDF/CDR/AI/PNG/JPG/SVG via CorelDRAW.
- 2026-10-29 19:30 — Idle 5 min, no toast; owners (Jaspreet, Gurpreet) rules; admin Time board; "Lighthouse" word removed; bar layout tabs/search/icons; uniform app cards; Gita quote; ← Workspace buttons; Home 3 s caps + cache; editor app backed up and folded into the workspace app.
- 2026-10-29 19:54 — Salary page; Lighthouse.exe 1.2 (icon, self-update from NAS); AI per-person chats (workspace side); Edit Audio tab/Beat Maker and private presets (source).
- 2026-10-29 20:05 — Office Mail team-only on own server.
- 2026-10-29 20:06 — Office redesign (Notifications, Events, Payroll); Design live editing and roomier app bar.
- 2026-10-30 06:49 — Workspace switches on Edit's project tabs itself.
- 2026-10-30 10:18 — Design generative fill fixed and moved to SDXL Inpainting.
- 2026-10-30 16:10 — Phone layout for the workspace; slide to clock in.
- 2026-10-30 17:56 — Office phone layout.
- 2026-10-30 17:58 — Version tags so Cloudflare/phones get new CSS at once.
- 2026-10-30 18:03 — Gurpreet 10-year sign-in; Desktop theme default (briefly).
- 2026-10-30 18:09 — Pure Black default everywhere; phone header/Home polish.
- 2026-10-30 18:18 — Office first page renamed Dashboard and made the default.
- 2026-10-30 18:26 — Speed-up (1-year cache with auto version stamps, font dropped, logos shrunk); Document/Grid/Deck on phones.
- 2026-10-30 18:36 — All visible text English (workspace, Office, Studio).
- 2026-10-30 18:42 — Login page script fix ("Couldn't" apostrophe); clear wrong-password message.
- 2026-10-30 18:46 — Sessions last 30 days from last use.
- 2026-10-30 18:51 — Sign-in attempt log added.
- 2026-10-30 19:37 — Installable app (manifest, icons, service worker, offline page); login page links versioned.
- 2026-10-30 19:50 — Editor release d369a17 deployed to NAYA A (release 20261031-011942).
- 2026-10-30 19:52 — Deploy-script fix committed (47e1979).

---

## Rules the owner set

- Never type passwords or credentials; the owner (or each person) signs in themselves. The Limelight AI shared password is typed by an admin in the account menu, never sent in chat.
- Cloudflare tunnel and DNS changes are done by the owner (Claude prepares scripts/commands; blocked actions are not worked around).
- Don't run Ollama / Limelight AI on NAYA A.
- Keep salary, bank, ID numbers and phone data out of anything shown (profiles, decks, notes); print field names only, never salary values. Office `data/` is private: never print, copy or send it.
- Don't make real attendance punches or send real shares/messages to real staff while testing.
- Editor: deploy only through `Deploy to server.bat`; don't kill the editor process; "don't touch the editor" applies unless the owner explicitly asks for an editor change.
- Don't copy `Limelight Editor.exe` (it hijacks `limelight://`).
- Owners Jaspreet and Gurpreet: no clock-in, no attendance, no task/time tracking; admins and owners have all access.
- All visible wording in English; no "Lighthouse" word in the UI; Limelight logo.
- Don't hide the Windows taskbar.
- Keep it simple; one window, one login.
- Video/reel outputs go to `C:\Users\user\Downloads`, not the project folder.
- Replies to the owner in English.
