# Office

Office is the work part of the workspace: mail, calendar, meetings, files, Word/Excel/PowerPoint-style editors, tasks, projects, overtime, salary and the HR pages, under **one menu**.

---

## 1. What Office is made of

| Part | What it gives | Where it runs | Inside the workspace |
|---|---|---|---|
| **Limelight Office** (own app) | Mail, Calendar, Meetings, Files, Document / Grid / Deck, News, Office setup (also Agent and AI Assistance when used on its own) | `E:\Limelight Ai\limelight-office`, Node, JASPREET port **3300** | proxy **3342**, `lh-office.limelightcorp.net` |
| **HR app** (internally "Lighthouse") | Staff, Departments, Events, Notifications, Settings, admin pages (Payroll, Payments, Clients, Reports, Performance), classic Dashboard/Tasks/Projects, Attendance, Leaves | Next.js app online at lighthouse.limelightcorp.in; repo `D:\LimelightWebapp` (GitHub `Jaspreetnov-11/lighthouse`) | proxy **3343** ("Team"), `lh-team.limelightcorp.net` |
| **Workspace pages** | Dashboard (new Home), Tasks, Projects, Overtime, Salary, Attendance, Leave approvals | Drawn by the workspace itself (`public/js/office-pages.js`, `public/js/salary.js`) | menu items of type `ws` |

Limelight Office also runs **on its own** without the workspace, with its own copy of the menu and its own HR proxy (ports 3301 local / 3444 LAN).

## 2. The menu inside the workspace

Defined in `OFFICE_MENU` in `public/js/workspace.js`. Each item is `[key, label, icon, source, route, admin only]`; source `o` = Limelight Office, `lh` = HR app, `ws` = workspace page.

| Section | Items |
|---|---|
| Work | **Dashboard** (ws, default first page), Mail (o), Calendar (o), Meetings (o), Tasks (ws), Projects (ws), Overtime (ws), Files (o) |
| Create | Document (o), Grid (o), Deck (o) |
| Team | Staff (lh), Departments (lh), Events (lh), News (o), Notifications (lh) |
| Admin (admins only) | Salary (ws), **Attendance** (ws, key `team-attendance`), **Leave approvals** (ws), Payroll, Payments, Clients, Reports, Performance (lh) |
| (bottom) | Settings (lh, HR settings), Office setup (o) |
| Hidden | Dashboard (classic) `/dashboard`, Tasks (classic) `/tasks`, Projects (classic) `/projects` (linked from the new pages) |

- The AI section was removed from the workspace's Office menu (Limelight AI is its own app). Attendance and Leaves moved to Profile.
- Tapping the Office card opens Dashboard.
- **Where the code differs from the notes:** the Office notes list an AI section (Agent, AI Assistance) and Team → Attendance / Leaves in the menu. That is the **standalone** Office menu. Inside the workspace these are not in the menu.

---

## 3. What users can do

### Dashboard (workspace page, `openOfficeHome`)
- **Staff:** greeting with a one-line summary (overdue · open tasks · unread updates), Open my tasks and Quick task, a score ring with rank and on-time %, four focus numbers (Overdue, Due today, Waiting for your review, Done this month), a Focus list with one-click next steps (Start, Submit for review, Approve), team leaderboard, notifications, active projects. The owner approved this version for staff.
- **Admins and owners:** team line (who is in, overdue tasks, waiting approvals, OT to approve), attendance ring, shortcuts (All tasks, Overtime, Staff, Salary), six team numbers, Today (faces of who is in, late, not in, on leave; owners not counted), Needs your decision (one-click Approve, waiting OT), leaderboard, Team hours this month, Projects at risk, Departments table, activity feed.

### Tasks (`openTasks`)
- Board with six columns: To do, In progress, In review, Changes, Done (last 30 days), On hold. Drag a card to change status.
- Scopes: Mine / Assigned by me / Everyone, search and project filter. A side drawer shows details and next-step buttons, and links to the classic HR page.
- **New task** adds a task for yourself.

### Projects (`openProjects`)
- Cards with a completion ring, client, Billable chip, tasks done and an hours bar (red when over the estimate). Filters Active / Finished / Billable / All.
- Not rebuilt yet: assigning tasks to others, timers, adding or editing projects. Use the classic HR pages for these.

### Overtime (`openOvertime`)
- **Staff** log OT once a day: date, hours (0-16) and what they worked on (at least 3 characters). Saving again changes the entry. Today's clock-in/out shows beside the form.
- **Check against the clock** (the HR app's own rule): time from clock-in to clock-out beyond the working day (default 8 h) is OT; after-midnight clock-outs are handled; 15 minutes of slack. States: Matches clock-out / More than clock-out / Waiting for clock-out / No clock-in that day.
- **Admins** see a Team view by day. Approve is pre-filled with min(claim, clock OT); they can change it, approve, reject or undo. Decided entries are locked for staff.
- **Approved OT goes into Salary.** For anyone with register entries that month, approved register hours **replace** the HR app's automatic OT (shown as "reg"), so nothing is paid twice. Typed OT in Salary still adds on top.

### Salary (admins and owners only, `openSalary`)
- The month's pay for everyone, from HR attendance + payroll:
  - per day = salary ÷ working days; hourly = per day ÷ hours per day;
  - absent = 1 day each; half day = ½ day; leave beyond the paid allowance = 1 day each; every 3 late marks = ½ day;
  - OT pay = (HR OT or approved register OT + typed OT) × hourly × HR OT rate (a rate above 5 is read as rupees per hour);
  - net = salary − deductions + OT pay + adjustment.
- An OT box and an adjustment box per person, editable rules, totals, CSV download. Owners are excluded. Staff are refused by the server.

### Attendance (admins and owners only, `openAttendance`)
A separate menu item beside Salary; both pages share the chosen month. (Menu key `team-attendance`, because `#attendance` in the address opens Profile's own Attendance tab.)
- Everyone's month as a grid: one row per person, one column per day, then Present / ½ / Absent / Leave / Late / OT hours totals. Five summary cards (staff, working days so far, absent days, late marks, OT hours) and a colour key.
- Day marks: **P** present, **W** work from home, **½** half day, **A** absent, **L** leave, **H** holiday (name on hover), blank = week off or a future day; an orange ring = late. Hover shows hours worked or "not clocked out".
- Data: the HR app's `/api/attendance/team-summary` (per-day punches, missed days, week off) + `/api/holidays`, through `GET /api/salary/attendance?month=`. A past working day with no punch is shown as **L** only when those days add up to the person's leave count, otherwise "–" (no record, e.g. before joining). Owners left out. CSV download (late days marked `*`).

### Leave approvals (admins and owners only, `openLeaveApprovals`, `public/js/leave-approvals.js`)
- Pending leave, half-day (with slot) and work-from-home requests as cards: who, dates, number of days, reason, and the person's leave balance this year (days left of the quota, other pending days; worked out like Profile's balance; WFH does not count).
- **Approve** / **Reject** with an optional note. It goes to the HR app as the signed-in admin (`PATCH /api/leaves/<id>/decide`), which saves the note in the remarks and notifies the person, exactly as the HR Leaves page does.
- Below: the last 40 decided requests. Owners' requests are left out.

### Limelight Office pages
| Page | What it does |
|---|---|
| Mail | **Team mail only**, kept on Limelight's own server (banner "Team mail · kept on Limelight's own server"). The code also supports a company mailbox over IMAP/SMTP, turned off by `teamMailOnly: true` |
| Calendar | Events with team invites and RSVP, repeats, colours, reminder 10 min before, optional video room |
| Meetings | In-app video calls (WebRTC mesh): camera, mic, screen share, raise hand, chat. Invite rings the other person |
| Files | Each person's own folder on the NAS: `\\192.168.0.99\Team Editing\Limelight Storage\<email>\Office` (Z:). Falls back to the old local folder if the NAS is off |
| Document / Grid / Deck | Real Word / Excel / PowerPoint-style editors. Save real .docx / .xlsx / .pptx through the installed Microsoft Office (COM). **Live co-editing**: carets/cells/slides of others in their colour; Share to teammates |
| News | News feed |
| Office setup | My account, My mail, Look (no effect inside the workspace), Team (staff sync, firewall command), Office (files folder, AI) |

### HR pages (restyled from outside)
- Staff, Departments, Events, Notifications, Settings and the admin pages are the HR app's own pages in a frame, restyled by the workspace.
- Notifications: grouped Today / Yesterday / This week / Earlier, a coloured icon per type, unread tint, Mark all read.
- Events: a date tile on every birthday, anniversary and holiday; the next 7 days highlighted.
- Payroll: five summary cards and a clear table (matches the Salary page).

---

## 4. How it works

### Sign-in: each person is their own Office member
- The workspace proxy (port 3342) sends `x-lh-as` (base64url JSON `{email, name, role, owner}`) and `x-lh-key` (the value of `E:\Limelight Ai\limelight-office\data\workspace.key`) on every request (`officeAs()` in `server/areas/office.mjs`).
- Office compares the key with `timingSafeEqual` (`vouched()` in Office's `server.mjs`) and finds or creates that person's member account (`auth.asPerson` in `engine/auth.mjs`). Requests with the headers are accepted only from this PC.
- **If the key file is missing the workspace refuses** (shows "Office is offline") instead of letting the person in as the PC owner.
- The workspace's Home asks Office the same way for unread mail and today's meetings (127.0.0.1:3300 directly).

### HR pages
- Proxy 3343 goes straight to the HR server (`lighthouseUrl`). On each HTML page it puts the person's HR token into localStorage `lh-token`, so the page opens signed in.
- Inside a frame it also sets `sessionStorage['lh-splash-seen']='1'` (no full-screen "Slide to clock in") and serves the Inter font at `/__ll/inter.woff2`.

### Look injection (`embed/`)
Put into framed HTML pages only (requests with `sec-fetch-dest: iframe`); re-read on every page load, so a style edit needs only a reload.
| File | For | Job |
|---|---|---|
| `embed/office.css` | Limelight Office | Glass look; hides Office's own side menu; pads the editor status bar for "← Workspace"; solid pop-ups |
| `embed/office-hr.css` | HR pages | Glass look; hides the HR sidebar, phone bar, splash, clock-in card and top-bar Clock In |
| `embed/office-hr.js` | HR pages | Only adds `data-` attributes (page name, notification kind/day, event date tiles); never moves elements; runs on `setTimeout` (not `requestAnimationFrame`, which does not fire in hidden tabs) |
- Colour variables are set on `html:root` so they win over the apps' own.
- Frames load with `?v=` boot stamps so stale cached pages do not show.
- Workspace-drawn page styles: `public/css/office-pages.css`, `public/js/office-pages.js` (global names use an `op` prefix: `OP_STATUS`, `opHm`, because all classic scripts share one scope).

### Workspace routes for Office
| Route | Job | Who |
|---|---|---|
| `/api/hr/<part>` GET | Read HR data as the person: tasks, projects, todos, activity, employees, departments, productivity, performance, attendance, holidays, clients | everyone (HR decides what they see) |
| `/api/hr/<part>` POST/PUT/PATCH/DELETE | Write only tasks, todos, projects | everyone (HR checks rights) |
| `GET /api/ot` (`?all=1` for admins), `POST /api/ot`, `/api/ot/remove`, `/api/ot/review` | Overtime register | review: admins only |
| `GET /api/salary?month=`, `POST /api/salary/input`, `POST /api/salary/rules`, `GET /api/salary/attendance?month=`, `GET /api/salary/leaves`, `POST /api/salary/leaves/decide` | Salary, Attendance and Leave approvals pages | admins only |

- Overtime store: `overtime.mjs`, data `Data/overtime/<YYYY-MM>.json`.
- Salary store: `salary.mjs` (`compute`, `setInput`, `setRules`), data `Data/salary/rules.json` and `Data/salary/<YYYY-MM>.json`.
- UI: `public/js/salary.js`, `public/css/salary.css`.

### Limelight Office itself (`E:\Limelight Ai\limelight-office`)
| Part | Detail |
|---|---|
| `server.mjs` | HTTP 127.0.0.1:3300 and HTTPS 0.0.0.0:3443 (self-signed); routes `on(method, pattern, handler, 'user'/'admin'/'public')`; cookie `llo_s`; non-GET API calls need header `x-llo: 1`; HR proxy 3301/3444 |
| `engine/` | `db.mjs` (SQLite), `auth.mjs` (HR login, staff sync, `asPerson`), `lighthouse.mjs`, `config.mjs` (`storageDir`, `teamMailOnly`), `lmail.mjs`, `lcal.mjs`, `live.mjs` (SSE, meetings, co-edit rooms), `office.mjs` + `ps/office.ps1` (Office via COM), `agent.mjs`, `news.mjs`, `store.mjs`, `otool.mjs` (CLI) |
| `public/` | `app.js`, `meet.js`, `editors/` (`shell.js`, `document.js`, `grid.js`, `present.js`, `formula.js`, `live.js`) |
| Needs | Node.js 24 (uses `node:sqlite`) and Microsoft Office installed. npm: imapflow, mailparser, nodemailer |
| Start | `Start Limelight Office.bat` or `Limelight Office (no window).vbs` (also the workspace's Start button). Restart: stop port 3300, run the `.vbs` |
| CLI for Claude | `node engine/otool.mjs <command>` and the **office-agent** skill. Anything that goes out (send, event with guests, upload) needs the user's yes first |
| AI | The Limelight AI engine (llama.cpp) on this PC, `127.0.0.1:8830` (OpenAI-style API, tool calls), model `qwen3-8b`. Old saved `:11434` addresses are read as `:8830`. Check: `node engine/test-llm.mjs`. The Agent's send/add/delete/upload actions always wait for an Approve click |
| Private | `data/` (office.db with everyone's mail, `secret.key`, ssl key, `workspace.key`). Never print, copy or send |

### Where Office data is saved
| What | Where |
|---|---|
| Mail, calendar, meetings, users, shares | JASPREET `limelight-office\data\office.db` |
| Document, Grid, Deck, Files (per person) | NAS `Z:\Limelight Storage\<email>\Office` |
| Tasks, projects, attendance, leaves, staff, payroll | HR server (online) |
| Logins, sessions, OT register, salary settings, work time | JASPREET `limelight-workspace\Data` |

---

## 5. Settings
| Setting | Where | Meaning |
|---|---|---|
| `teamMailOnly` | Office `data\config.json` | `true` = team mail only. To undo: set `false` and add a mailbox again |
| `storageDir` | Office `data\config.json` | Root of per-person file folders (the NAS) |
| `workspace.key` | Office `data\` | Shared key; without it Office will not open inside the workspace |
| Salary rules | Office → Admin → Salary (saved in `Data/salary/rules.json`) | lates per half day (3), paid leaves per month (default: HR leaves per year ÷ 12), OT multiplier (default: HR OT rate) |

## 6. Decisions and why
- **Local app like the video editor** (Node server, skill, CLI), Limelight black and yellow.
- **Real editors, not forms**: the owner wanted the Word/Excel/PowerPoint interface; files stay real Office files.
- **No Google**: first built on Gmail/Calendar/Drive, then replaced by Limelight's own Mail, Calendar and Meetings, then all Google code removed.
- **Mail is team mail only** on Limelight's own server (the outside mailbox caused endless loading).
- **Every person gets their own Office account** (own mail, own files), not the owner's.
- **Office stays independent**: it mirrors the workspace's menu, HR login and HR proxy, but runs without it.
- **Use the HR app's own tasks and attendance**; Office's own versions were dropped.
- **Don't touch the live HR code**: pushes to `D:\LimelightWebapp` `main` go live for all staff in about 2 minutes and others commit there. All restyling is done from the workspace side. Changing the HR repo needs the owner's explicit yes.
- **New workspace pages** for Home/Tasks/Projects (the restyled HR dashboard was "the old one"); they run as the person, so HR still decides permissions.
- **Separate dashboards** for staff and admins.
- **OT register replaces HR auto-OT in Salary** for people who use it, to avoid double pay (offered as a choice; stays "replace" unless the owner asks otherwise).

## 7. Fixes worth knowing
- **Security bug (29 Oct):** the Office key path had single backslashes, the key was never read, and the test account opened Office as the owner for about 20 minutes → forward slashes, and refuse when the key is missing. Before per-person Office, Office from outside was admin-only (and showed white-on-white); that gate is gone.
- Deck canvas collapsed: `.pp` class clash between the meeting people list and the deck editor → scoped to `.ms-ppl .pp`.
- Mail loading forever (IMAP set to 8.8.8.8) → time limits, then the outside mailbox was removed.
- Office Home blank in the workspace because of the HR splash → sessionStorage flag.
- Meetings "Camera needs https" in the workspace → check `window.isSecureContext` (localhost counts as secure).
- Live carets had no colour → `style.setProperty` for custom properties.
- Global name clashes (`STATUS`, `avatar`, `hm`) → `op` prefix.
- Mail libraries took about 9 s to load at start → loaded lazily.
- (Full list in `docs/_notes/office.md`.)

## 8. Known issues / pending
- The owner links his Office account to the HR email once (Office setup → My account).
- Office → Attendance checked only with sample data and a staff login (refused, as it should be); needs one look with an owner login.
- Leave approvals checked only with sample data and a staff login (refused); Approve / Reject not clicked on a real request yet (it notifies the person).
- Salary Approve buttons and OT numbers need one check with an owner login; Salary not yet checked against real payroll. Admin Home and the OT team view were checked only in a preview.
- Status changes, Approve and Quick task on the new pages were not clicked (they write live HR data).
- Real camera call between two PCs not tested (WebRTC verified between two tabs).
- Member-to-member Share between two real staff not tested (it sends a real notification).
- Agent's tools not tested with a real model on NAYA B.
- Firewall for team PCs: ports 3443 and 3444 on JASPREET (owner's job; the command is in Office setup → Team).
- Staff and Events pages (old HR layout) look narrow on phones; they can only be restyled from outside.
- Offered, not answered: editing the HR app's own code (for example a proper greeting header).
- Office's `README.md` still mentions `engine/google.mjs` (deleted) and the old local files folder.
