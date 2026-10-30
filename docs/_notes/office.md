# Office: project notes

Office is the work part of the Limelight Workspace: mail, calendar, meetings, files, Word/Excel/PowerPoint-style editors,
tasks, projects, overtime and HR pages. These notes come from the Claude Code build sessions of 29–30 Oct 2026 and the
code as it stands. They are written so someone can understand and rebuild Office.

Sources: sessions `e4f20feb` (Office build), `eb1c0f3f` (Office redesign inside the workspace, live editing, new
Home/Tasks/Projects, Overtime, single login), the app's README.md and CLAUDE.md, and the hand-over note
`office-redesign.md` in the shared side-session notes folder. Times are India time (IST).

---

## 1. What Office is (two apps under one menu)

Inside the workspace (http://localhost:3350, Office menu on the left), Office combines three sources:

| Part | What it is | Where it runs |
|---|---|---|
| **Limelight Office** (our own app) | Mail, Calendar, Meetings, Files, Document / Grid / Deck editors, News, Agent, AI Assistance, Office setup | `E:\Limelight Ai\limelight-office`, Node, port 3300. The workspace re-serves it on **:3342** |
| **HR app** (internally "Lighthouse") | Attendance, Leaves/WFH, Staff, Departments, Events, Notifications, Payroll, Payments, Clients, Reports, Performance, Settings, and the "classic" Home/Tasks/Projects | Next.js app hosted at lighthouse.limelightcorp.in. Repo `D:\LimelightWebapp` (GitHub `Jaspreetnov-11/lighthouse`). The workspace re-serves it on **:3343** |
| **Workspace-native pages** | New Home (staff and admin versions), Tasks, Projects, Overtime, Salary | Drawn by the workspace itself (`limelight-workspace/public/js/office-pages.js`, `salary.js`) as menu items of type `ws` |

Limelight Office also runs **on its own**, without the workspace. It has its own copy of the same menu and its own
HR proxy.

---

## 2. What exists now: features per page

### Menu (same in the workspace and standalone)
- **Work:** Dashboard/Home, Mail, Calendar, Meetings, Tasks, Projects, Overtime (workspace only), Files
- **Create:** Document, Grid, Deck
- **AI:** Agent, AI Assistance
- **Team:** Attendance, Leaves/WFH, Staff, Departments, Events, News, Notifications
- **Admin (admins only):** Payroll, Payments, Clients, Reports, Performance, Salary (workspace)
- **Settings** (HR) and **Office setup**

Names the user chose: Gmail → **Mail**, Drive → **Storage/Files**, Word → **Document**, Excel → **Grid**,
PowerPoint → **Present**, later renamed **Deck**, Meet → **Meetings**. In the standalone app's menu, "Home" was renamed
**Dashboard**. The ribbon "Home" tab inside the editors was kept, to match Office.

### Home (workspace-native, `openOfficeHome`)
- **Staff Home:** greeting with the date and a one-line summary (overdue · open tasks · unread updates), Open my tasks
  and Quick task buttons. Score this month in a ring, with rank (for example "#24 of 57") and on-time %. Four focus
  numbers: Overdue (red), Due today, Waiting for your review, Done this month. A **Focus** list of open tasks, most urgent
  first, each with a lateness badge and a one-click next step (Start, Submit for review, Approve). On the side: team
  leaderboard and latest notifications. Active projects with progress rings at the bottom. The user approved this
  version for regular staff.
- **Admin Home** (Jaspreet, Gurpreet and admins, `ME.admin`): a team line ("… of 51 in today · 44 overdue tasks · 15
  waiting for approval · 1 OT to approve"), an attendance ring, and shortcuts to All tasks, Overtime (with count), Staff and
  Salary. Six team numbers: open, overdue, waiting approval, done this month, productive % of clocked time, OT to approve.
  **Today:** faces of who is in, late, not in yet, on leave (owners are not counted). **Needs your decision:** submitted
  tasks with one-click Approve, plus waiting OT. Also a leaderboard, **Team hours this month** (task time against clocked
  time per person), **Projects at risk** (overdue or over estimate), a **Departments** table and a latest-activity feed.
- The HR app's "Slide to clock in" full-screen splash, its clock-in card and its top-bar Clock In button are hidden inside
  the workspace, because the workspace Home card already does clock in and clock out.

### Tasks (workspace-native, `openTasks`)
- A board with six columns: To do, In progress, In review, Changes, Done (last 30 days), On hold. Drag a card to change
  its status.
- Scopes: Mine / Assigned by me / Everyone, plus search and a project filter.
- Cards show project, type, assignee, a due badge (late / today / tomorrow) and time used against the estimate.
- Clicking a card opens a side drawer: status, title, project/type/department, assignee, deadline with lateness, time
  used, next-step buttons, and a link to the classic HR page.
- **New task** adds a task for yourself: what, project, deadline, time needed, start now.

### Projects (workspace-native, `openProjects`)
- Cards with a completion ring, client, Billable chip, tasks done, and an hours bar that turns red when over the estimate.
- Filters: Active / Finished / Billable / All, plus search. The drawer shows team avatars and tasks grouped by status.
- Assigning tasks to others, timers, and adding or editing projects are not rebuilt yet. The "classic" HR pages
  (`home-classic`, `tasks-classic`, `projects-classic`) are kept for these jobs.

### Overtime (workspace-native, `openOvertime`)
- **Staff** log OT once a day: date, hours (0–16) and what they worked on (at least 3 characters). Saving again changes
  the entry. Today's clock-in and clock-out show beside the form, and the hours fill in automatically after clock-out.
- **Check against the clock.** This uses the HR app's own rule: time from clock-in to clock-out beyond the 8-hour day
  is OT. Clock-outs after midnight are handled, with 15 minutes of slack. States: ✓ **Matches clock-out**, **More than
  clock-out**, **Waiting for clock-out** (checked again automatically later). Verified on a real case: clocked in 12:01
  and out 23:42 gives 3.68 h, the same as the HR app.
- **Admins** get a Team view grouped by day. Approve is pre-filled with the fair figure, min(claim, clock OT). They can
  change it, approve, reject or undo. Entries that have been decided are locked.
- **Approved OT goes into Salary.** For anyone with register entries that month, approved register hours *replace* the
  HR app's automatic OT, so nothing is paid twice. Salary marks these "reg". Typed OT still adds on top. The user
  confirmed the tab ("Overtime tab is fine"). The replace-vs-add rule was offered as a choice. It stays "replace" unless
  the user asks otherwise.

### Mail (Limelight Office)
- Team mail between staff, stored inside Office, plus an optional company mailbox per person over IMAP/SMTP in **one
  unified inbox**. Writing a team member's name keeps the mail internal. Writing an email address sends it out through
  the person's SMTP mailbox.
- Mailbox setup is in Office setup → My mail. It has presets for GoDaddy, Hostinger, Zoho and Microsoft 365, and
  provider detection from the email address. Mailbox passwords are encrypted (AES-256-GCM with `data/secret.key`). The
  company domain limelightcorp.in uses Google Workspace mail (checked with MX records). That needs an App Password. The
  Google-specific preset and help were later removed along with all Google code.
- Compose works and was checked inside the workspace.

### Calendar
- Events with team invites and RSVP (Going / Maybe / Not going), repeating events, colours, a reminder 10 minutes
  before, and an optional video room linked to an event.

### Meetings
- In-app video calls (WebRTC mesh rooms): camera, mic, screen share, raise hand, chat and active-speaker highlight.
  **Invite** rings the other person. Signalling and presence run over the app's SSE stream.
- The camera check is `window.isSecureContext`, so `http://localhost` (the workspace) is allowed. On the LAN, https
  (:3443) is still needed. Workspace frames allow `display-capture` for screen sharing.

### Files
- This-PC / own-folder file list (Drive was removed). Each person has their own folder. In the current code
  (`engine/config.mjs`) each person's files live on the office NAS at
  `\\192.168.0.99\Team Editing\Limelight Storage\<email>\Office` (Z: drive). The original default was
  `Documents\Limelight Office` on this PC.

### Document / Grid / Deck editors (`public/editors/`)
These are real Word/Excel/PowerPoint-style editors, not forms. The user rejected a form-based first version. Each opens
with an Office-style start screen (Blank, templates, Recent files). Saving writes real **.docx / .xlsx / .pptx** through
the installed Microsoft Office (COM). Existing files open in the same editors. The title bar is plain dark with one
colour per app (Word blue, Excel green, PowerPoint orange), and the ribbon is light and minimal.
- **Document (Word-like):** font, size, bold/italic/underline, colour, highlight, change case, format painter; bullets,
  numbering, alignment, line/paragraph spacing, shading, styles (Title, H1–H3, Quote); Find & Replace (Ctrl+F/H);
  tables (add/remove rows and columns), picture, link, cover page, signature, symbols; **header, footer and page number
  saved into the real .docx**; margins, portrait/landscape, 2–3 columns; Read mode, zoom, word count, print; AI: write,
  improve, Hindi/English translate, proofread. Ribbon tabs: Home, Insert, Layout, View, Review, AI.
- **Grid (Excel-like):** its own formula engine (`formula.js`: SUM, AVERAGE, IF, VLOOKUP, SUMIF, COUNTIF and more, with
  live recalculation); font, borders, wrap, merge & centre, ₹ / % / decimals; conditional formatting and format as table;
  **charts (column, bar, line, pie) saved as real Excel charts**; sort, filter, remove duplicates, freeze panes, find &
  replace, multiple sheets; Hindi typing works; AI: build a table, write a formula, explain the sheet.
- **Deck (PowerPoint-like):** slide thumbnails, drag/resize on the canvas, 6 themes, background picture; shapes
  (triangle, arrow, star, line), table, align on slide, layer order; **transitions (fade, push, wipe) saved into the
  real .pptx**; slide sorter, speaker notes, full-screen show (F5); AI: build a whole deck, speaker notes.
- **Live co-editing (added 30 Oct):** two people with the same file open see each other's changes as they type. Each
  person's caret, selected cell or slide shows in their colour with their name. The title bar shows faces ("2
  editing") and a **Share** button. Share lets you pick teammates, who get a notification with a link that opens the file
  as themselves with edit rights. When anyone saves, everyone sees "✓ Saved". A late joiner gets the current unsaved copy
  from the oldest person in the room.

### News, Agent, AI Assistance, Chatbot
- **News:** a news feed page.
- **Agent:** a local AI assistant that works on your behalf through tools: list_team, search/read/send/trash email,
  list/create/delete event, create Word/Excel/PPT, files. Its task tools were removed because the HR app owns tasks.
  **Sending mail, adding or deleting events, uploading and binning always wait for an Approve click.**
- **AI Assistance / Chatbot:** chat helpers. Chats are stored per owner (`engine/store.mjs`).

### HR pages (shown inside Office, restyled from outside)
- Attendance, Leaves/WFH, Staff, Departments, Events, Notifications, Settings and the admin pages are the HR app's own
  pages, shown in a frame. The workspace gives them the same dark-glass look with an injected stylesheet and script.
- **Notifications:** grouped under Today / Yesterday / This week / Earlier. Each has a coloured type icon: task
  (yellow), leave (blue), attendance (green), mention (purple), project (teal), announcement (pink), other (grey),
  and "Needs attention" (red). Unread items have a yellow tint and dot. Delete ✕ shows on hover. Mark all read / Clear
  all stay top right.
- **Events:** every Birthday, Work anniversary and Holiday row starts with a date tile (big day number, month below).
  Today, tomorrow and the next 7 days are highlighted yellow. The list was already upcoming-first.
- **Payroll:** five summary cards (Staff, Monthly salary, Earned so far, Paid in green, Pending as a yellow card), a
  sticky table header, centred day counts, right-aligned amounts, and row hover. It matches the workspace Salary page.

### Office setup (Limelight Office)
- **My account:** profile, "Sign in with Limelight" (HR account) for the local owner, notifications.
- **My mail:** company mailbox (IMAP/SMTP) with presets and "Save & test".
- **Look:** 7 looks: Limelight Black, Paper, Midnight Gold, Aurora Glass, Graphite, Saffron, Studio Mono. Inside the
  workspace these no longer change anything, because the workspace theme decides the colours.
- **Team:** staff synced from the HR app with "Sync now", the LAN address, and the firewall command.
- **Office:** files folder and AI settings.

### Branding
- The word "Lighthouse" is not shown anywhere visible. It reads Limelight or "HR pages" instead (sign-in page, Office
  setup, team page, error messages). Staff IDs like LH0001 are real data and were left as they are.
- The workspace default theme is **Pure Black** (user's request). Aurora (purple) stays as a theme to pick.

---

## 3. How it works

### Machines and addresses
- **JASPREET (this PC, 192.168.0.210)** runs Limelight Office and the workspace. The PC must stay on while the team
  uses Office. Most data lives on it.
- **NAYA B (192.168.0.205)** is the AI box (Ollama 11434, Limelight AI 8800). **Never run AI models on NAYA A
  (192.168.0.200).**

| Address | What |
|---|---|
| http://127.0.0.1:3300 | Limelight Office on this PC. The owner is signed in automatically, with no password |
| https://192.168.0.210:3443 | Limelight Office for team PCs on the LAN (self-signed certificate, team logins) |
| http://127.0.0.1:3301 / https :3444 | Office's own proxy to the HR app (local / LAN) |
| http://localhost:3350 → :3342 / :3343 | The workspace re-serves Office (:3342) and the HR app (:3343) so logins work inside frames |

### Start
- `Start Limelight Office.bat`, or `Limelight Office (no window).vbs` (this one also opens a browser tab), or the Desktop
  shortcut "Limelight Office". Needs Node.js (24, uses `node:sqlite`) and Microsoft Office installed.
- To restart: stop the process on port 3300, then run the `.vbs`. The workspace restarts with `Lighthouse Server (no
  window).vbs` after stopping port 3350.
- Claude works with Office through the CLI `node engine/otool.mjs <command>` (JSON output) and the **office-agent**
  skill. Check `otool status` first. Show the user anything that goes out (send, event with guests, upload) and get a
  yes first.

### Folders and main files (`E:\Limelight Ai\limelight-office`)
- `server.mjs`: HTTP (127.0.0.1:3300) and HTTPS (0.0.0.0:3443) with no framework. Routes are declared as
  `on(method, pattern, handler, 'user'|'admin'|'public')`. Session cookie `llo_s` (Secure, SameSite=Strict), a host check,
  and non-GET API calls need the header `x-llo: 1`. It also has the HR proxy (`lhProxy`/`lhUpgrade`, ports 3301/3444),
  which strips X-Frame-Options, injects the person's HR token into localStorage, and hides the HR sidebar in frames.
- Main API groups: `/api/login`, `/api/me/lighthouse`, `/api/team/sync`, `/api/status`, `/api/lmail*`, `/api/cal*`,
  `/api/ltasks*`, `/api/rtc/:room/{join,leave,signal,state,chat,invite}`, `/api/stream` (SSE), `/api/notes`,
  `/api/doc|grid|slides/open|save`, `/api/co/join|send|leave`, `/api/share`, plus news, chats, chatbot, assist and agent.
- `engine/`: `db.mjs` (SQLite: users, sessions, mail, events, guests, tasks, notes, shares; `seal`/`unseal`),
  `auth.mjs` (HR login, staff sync, owner), `lighthouse.mjs` (HR API client), `config.mjs` (settings, per-user files
  folder), `lmail.mjs` (team + IMAP/SMTP; mail libraries load lazily), `lcal.mjs` (calendar and tasks), `live.mjs`
  (SSE hub, notifications, meeting rooms, co-edit rooms), `office.mjs` + `ps/office.ps1` (Office through COM in
  PowerShell), `agent.mjs` (assistant and tools), `news.mjs`, `store.mjs`, `otool.mjs` (CLI).
- `public/`: `index.html`, `app.js` (router, menu, pages, `window.LLO` helpers), `meet.js` (WebRTC), CSS (`app.css`,
  `editors.css`, `team.css`, `looks.css`), `editors/` (`shell.js`, `document.js`, `grid.js`, `present.js`,
  `formula.js`, `live.js`).
- npm dependencies: imapflow, mailparser and nodemailer only.
- `data/` is **private**: office.db (everyone's mail), secret.key, the ssl key and tokens. Never print, copy or send it.

### Login and the HR app
- **One login = the HR (Lighthouse) account**, email and password checked by lighthouse.limelightcorp.in
  (`/api/auth/login`). The user is created or updated by email. Admin role comes from the HR role (`/admin|owner|super/i`).
  Staff are synced in the background from `/api/employees`. When offline, the last password the HR app accepted still
  works on this PC.
- The local owner (auto-login on 127.0.0.1) links their HR account once in Office setup → My account. This brings the
  staff list and makes HR pages open signed in.
- Inside the workspace, each person is their own Office member through the workspace's `x-lh-as` vouch header, so
  there is no second sign-in. The workspace verified single login across Edit, Design, Office and Limelight AI on 30 Oct.
- Owners Jaspreet and Gurpreet are admins and have no clock-in.

### Workspace side (how Office is shown in `limelight-workspace`)
- `server.mjs` `appProxy` injects files from `limelight-workspace/embed/` into framed pages, re-reading them on every
  page load (style edits need only a reload):
  - `embed/office.css`: glass look for Limelight Office. Hides Office's own side menu. Editor status bar padded 118 px
    for the "← Workspace" button. Pop-ups solid rgba(22,22,26,.97).
  - `embed/office-hr.css` + `embed/office-hr.js`: look for the HR pages. The script only adds `data-` attributes
    (page tag, notification kind/unread/day headings, event date tiles) and never moves the HR app's elements. It runs
    with `setTimeout`, not `requestAnimationFrame`.
  - The Inter font is served to the HR frame at `/__ll/inter.woff2`, and `sessionStorage['lh-splash-seen']='1'` is set to
    skip the splash.
- `/api/hr/*` is a narrow pass-through using the person's own HR token. It can read tasks, projects, todos, activity,
  employees, departments, productivity, performance, attendance, holidays and clients. It can write only tasks, todos and
  projects. `/api/me` adds `hrId` and `owners`.
- Overtime: `overtime.mjs` (`createOvertime`), data in `limelight-workspace/Data/overtime/<YYYY-MM>.json`, API `/api/ot`
  (GET mine or `all=1` for admins, POST save, `/remove`, `/review` admin only). Salary: `salary.mjs` `compute(…, otRegister)`.
- Menu: `public/js/workspace.js` `OFFICE_MENU`. Home/Tasks/Projects/Overtime are `'ws'` items. Classic HR pages stay as
  hidden `*-classic` items.
- New pages: `public/js/office-pages.js` + `public/css/office-pages.css`. Global names carry an `op` prefix
  (`OP_STATUS`, `opAv`, `opHm`) because the workspace's classic scripts share one global scope.

### Live co-editing design
- Built on the existing SSE stream. A room per file (`coRoom` = sha1 of the path). `engine/live.mjs` coJoin / coLeave /
  coRelay. A `want` message asks the oldest peer for a full copy.
- Single hook: every editor calls `shell.setDirty(parts, true)` on every change, so `setDirty` calls
  `parts.onEdit` / `parts.onClean`.
- `editors/live.js`: adapter API (file, units, apply, cursor, drawPeers, busy, saved). Diffs flush every 120 ms, with a
  250 ms tick.
  - Document: units are top-level blocks keyed `data-k`, and the caret is restored after remote edits.
  - Grid: units are per cell.
  - Deck: units are per slide. A slide is "busy" while a text box or the notes are being edited.
- Conflict rule: last writer wins per paragraph / cell / slide.
- Sharing: a `shares` table. `office.mjs` `mine()` allows the local owner, your own folder, or files shared with you.

### AI
- Ollama at NAYA B (`192.168.0.205:11434`) first, then this PC (`127.0.0.1:11434`), model `qwen3:8b`.
- qwen3:8b tends to invent guest emails and locations. `groundArgs` in `agent.mjs` strips anything not in the user's text
  or in tool output. The approval card lets the user fill To and guests.

### Where data is saved
| What | Where |
|---|---|
| Office mail, calendar, meetings, users, shares, document list | This PC: `limelight-office\data\office.db` |
| Office files (Document, Grid, Deck, Files), per person | NAS `\\192.168.0.99\Team Editing\Limelight Storage\<email>\Office` (Z:) |
| Tasks, Projects, Attendance, Leaves, Staff, Payroll | HR app's online server (lighthouse.limelightcorp.in) |
| Logins, sessions, OT register, Salary settings, activity | This PC: `limelight-workspace\Data` |

Most of this is on JASPREET, so it needs regular backups.

---

## 4. Key decisions and why
- **Local app like the video editor agent:** same pattern (Node server, skill, CLI), simple and aesthetic UI, Limelight
  black and yellow.
- **Real editors, not forms:** the user wanted the Word/Excel/PowerPoint interface with all their tools, minimal and
  premium. Files stay real Office files, so the installed Office does the saving through COM.
- **No Google.** It was first built on Gmail/Calendar/Drive (OAuth). The user then asked for Limelight's own Mail,
  Calendar, Tasks and Meetings, and finally "no Google at all". `engine/google.mjs` was deleted, along with Drive and the
  Google mailbox preset.
- **User choices for the own stack:** Mail = both team mail and a company mailbox; Users = the whole team on the office
  LAN with logins; Meetings = in-app video call.
- **Mirror the workspace instead of building new:** the user said the full Office setup already exists in the AI
  workspace. Office copied the workspace's Office menu, HR login and HR proxy, but it stays **independent** (runs
  without the workspace).
- **HR app's own tasks/attendance are used:** Office's own Task/Attendance pages were dropped from the menu.
- **Don't touch the live HR code:** `D:\LimelightWebapp` pushes to `main` go live for all staff in about 2 minutes, and
  other people commit there. All restyling and the new pages work from the workspace side (injected CSS/JS, `/api/hr`
  pass-through). Changing the HR repo needs an explicit yes.
- **Workspace-native Home/Tasks/Projects:** the user said the restyled dashboard was "the old one". New pages were built
  instead of restyling. They run as the signed-in person, so the HR app still decides permissions.
- **Separate dashboards:** the staff Home stays as approved. Owners and admins get a full team dashboard.
- **OT register replaces HR auto-OT in Salary** for people who use it, to avoid double pay.
- **Pure Black default theme** (user's request).

## 5. Problems hit and fixes
- PowerShell variables are case-insensitive ($R/$r, $F/$f clashed). Renamed them.
- Excel `Value2` Int32 cast error. Strings and numbers are now handled separately.
- Office processes were left running. The script records PIDs before the job and kills new windowless
  EXCEL/WINWORD/POWERPNT processes afterwards.
- Agent date error (`weekday` together with `dateStyle`). Removed `weekday`.
- qwen3 invented guests and locations. Added `groundArgs` and the Approve step.
- Hindi/IME typing in Grid cells failed. Grid now uses an always-focused hidden input.
- The transition code was in the wrong PowerShell function. Moved it into the slides save. Zoom transition id 3345 is
  invalid; it is 3849.
- `select` shadowing in present.js. Renamed it to `pick`.
- The server seemed to hang at start because the mail libraries took about 9 s to load. They now load lazily.
- Certificate check crashed when `ips.txt` was missing. Added an existence check.
- `meet.js` `sig` was used before it was defined (TDZ). It is now a function declaration.
- `e.currentTarget` was null after `await`. Handlers use `(e.btn ||= e.currentTarget)`.
- Office Home was blank in the workspace because the HR splash hid it. Fixed with the sessionStorage flag.
- A grey haze appeared on glass cards (a gradient border showing through translucent cards). Switched to a solid border
  with a brighter top edge.
- Live carets had no colour because `Object.assign(style, {'--co': …})` ignores custom properties. Now uses
  `style.setProperty`.
- `run` name clash in office.mjs. It is imported as `dbRun`.
- The injected HR script didn't run because rAF doesn't fire in hidden tabs. Switched to `setTimeout`.
- `STATUS`, `avatar` and `hm` clashed with workspace globals. Renamed with the `op` prefix.
- Opacity fades left screenshots blank. Animations are now transform-only.
- Payroll first column was misaligned by a stray bottom border. Fixed with `border:0` plus border-top.
- Admin team-hours bars overflowed, because task time can exceed clocked time (it includes credit for managing others).
  Bars now scale to the larger value with overflow hidden.
- "Camera needs https" inside the workspace. The check is now `isSecureContext`.
- Unresolved early on: the mailbox test showed "Fill the address, servers and password" with dummy values. It was not
  pursued after Google was dropped.

## 6. Pending / not verified
- Real camera call between two PCs (the browser pane has no camera). WebRTC was verified between two tabs.
- Company mailbox connection (needs the user's own App Password; Claude never types passwords).
- Agent's new tools with a real model on NAYA B (at build time NAYA B's Ollama showed no models).
- Status changes, Approve and Quick task on the new Tasks/Home pages. These write live HR data and were not clicked.
- Member-to-member Share between two real staff (it would send a real notification).
- Admin Home and the OT team view were checked only by switching the admin view on in a preview tab. They need one
  real check as Jaspreet or Gurpreet, along with the Salary OT numbers.
- Payroll restyle was checked with sample numbers (admin-only page).
- Not rebuilt in the new pages: assigning tasks to others, timers, adding or editing projects (use the classic pages).
- Firewall for team PCs: ports 3443 and 3444 may need allowing (the command is in Office setup → Team). Changing the
  firewall is the user's job.
- Offered and not answered: editing the HR app's own code (for example a proper greeting header). This needs explicit
  consent, because it deploys live.
- README.md still mentions `engine/google.mjs`, but that file is deleted.

---

## 7. Update log (IST, oldest first)
- 29 Oct 06:20: Asked for MS Office + Gmail + Calendar + Drive combined into one local app, like the video editor agent.
- 29 Oct 06:42: First build on :3300. Word/Excel/PPT through COM (PDF too, Hindi OK), AI assistant (qwen3:8b) with
  Approve step, office-agent skill and `otool.mjs` CLI, Desktop shortcut. Google not connected.
- 29 Oct 07:25: Step-by-step Google Cloud OAuth guide given (user to do it).
- 29 Oct 07:54: Pages renamed (Mail, Storage, Document, Grid, Present, Meetings). Added News, Chats, Chatbot,
  AI Assistance, Agent, Task, Attendance. Sidebar split into Work / Create / AI / Team.
- 29 Oct 08:10: Real Word/Excel/PowerPoint-style editors built (ribbon, start screen, formula engine). The form version
  was rejected. "Connect Google" text removed.
- 29 Oct 08:31: Full toolsets added to all three editors. Header/page number, Excel chart, star shape and push transition
  verified in real files.
- 29 Oct 08:35: Asked to replace Google Mail/Calendar/Task/Meetings with Limelight's own.
- 29 Oct 09:02: Own team mail + IMAP/SMTP inbox, calendar with RSVP, tasks board, WebRTC meetings, notifications, LAN
  https :3443 with team logins. Present renamed Deck. 7 UI looks added.
- 29 Oct 09:09: Company mailbox setup prepared (limelightcorp.in is on Google Workspace, so an App Password is needed).
- 29 Oct 09:23: Google removed completely. Login is now the HR (Lighthouse) account, staff synced, workspace Office menu
  mirrored, HR pages in a frame through Office's own proxy (3301/3444). Office stays standalone.
- 30 Oct 01:16: Office redesigned inside the workspace: glass look via `embed/office.css` and `embed/office-hr.css`,
  HR clock-in splash/card hidden, "Lighthouse" text replaced by Limelight, Pure Black made the default theme.
- 30 Oct 01:29: Live co-editing and Share added to Document / Grid / Deck. Office Home cards refined.
- 30 Oct 01:30: Standalone Office menu "Home" renamed **Dashboard**.
- 30 Oct 01:35: Notifications (day groups, type icons), Events (date tiles) and Payroll (summary cards, table) redesigned
  via `embed/office-hr.js` and CSS.
- 30 Oct 01:46: Meetings "Camera needs https" fixed. New workspace-native Home, Tasks and Projects pages with the
  `/api/hr` pass-through.
- 30 Oct 01:53: Overtime tab (daily OT checked against clock-out, admin approve, feeds Salary) and the admin/owner team
  dashboard added.
- 30 Oct 12:16: User confirmed the Overtime tab. The Salary "replace HR auto-OT" rule kept.
- 30 Oct 19:31: Single login confirmed across the workspace apps. Data-location map written (Office files on the NAS).
