# Limelight Workspace - start here

## What it is

- One web app that puts every Limelight app in **one window, behind one login**.
- People sign in once with their **HR (Lighthouse) email and password**. No app inside asks again.
- It has its own pages (Home, Chats, Create, Library, Profile) and opens four apps inside: **Edit**, **Design**, **Office**, **Limelight AI**.
- It runs on the owner's PC **JASPREET** (port 3350) and is online at **https://limelightcorp.net** through a Cloudflare tunnel.
- In chat it is called "Lighthouse". The folder is `limelight-workspace`. People see only the name **Limelight**.

## Map of the areas

| Area | What it is | Served by (app, PC, port) | Main code files |
|---|---|---|---|
| **Home** | Greeting, clock-in, app cards, numbers, Today feed; login; themes | Workspace, JASPREET, 3350 | `server/areas/home.mjs`, `server/areas/account.mjs`, `auth.mjs`, `public/js/workspace.js`, `public/js/profile.js`, `public/js/search.js`, `public/js/theme-boot.js` → [home.md](home.md) |
| **Chats** | Office chat: 1-to-1, groups, files, share cards | Workspace, JASPREET, 3350 | `chat.mjs`, `server/areas/chats.mjs`, `server/areas/share.mjs`, `public/js/chats.js`, `public/js/share.js` → [chats.md](chats.md) |
| **Create** | AI Image (works), AI Video (screen only) | Workspace 3350; images made by Limelight AI through Design (Studio 3330) | `server/areas/create.mjs`, `server/areas/design.mjs`, `public/js/workspace.js` → [create-library-profile.md](create-library-profile.md) |
| **Library** | Videos (Edit renders) and Images (AI images) | Workspace 3350; videos from Edit, images from Studio | `server/areas/library.mjs`, `public/js/library.js` → [create-library-profile.md](create-library-profile.md) |
| **Profile** | Own details, attendance, leaves, Time, Team | Workspace 3350; data from the HR app | `server/areas/profile.mjs`, `server/hr.mjs`, `activity.mjs`, `public/js/profile.js`, `public/js/activity.js` → [create-library-profile.md](create-library-profile.md) |
| **Edit** | The video editor | NAYA A (192.168.0.200), standby NAYA B :3100; proxy **3341** | `server/areas/edit.mjs`, `server/apps-proxy.mjs`; editor code in `D:\Video Editor Agent` → [edit.md](edit.md) |
| **Design** | Limelight Studio (design tool) | JASPREET, port 3330; proxy **3345** | `server/areas/design.mjs`; app code in `E:\Limelight Ai\limelight-studio` → [design.md](design.md) |
| **Office** | Limelight Office + HR pages + workspace pages (Dashboard, Tasks, Projects, Overtime, Salary) | Office on JASPREET 3300 (proxy **3342**); HR app online (proxy **3343**) | `server/areas/office.mjs`, `overtime.mjs`, `salary.mjs`, `embed/`, `public/js/office-pages.js`, `public/js/salary.js`; app code in `E:\Limelight Ai\limelight-office` → [office.md](office.md) |
| **Limelight AI** | Private AI chat, work agent, coding agent, images | NAYA B (192.168.0.205:8800), fallback JASPREET :8800; proxy **3344** | `server/areas/ai.mjs`; app code in `E:\Limelight Ai\limelight-ai` → [limelight-ai.md](limelight-ai.md) |

How a request is handled: `server.mjs` checks https, the login and then asks each area in `server/areas/` in turn. Each area answers its own paths or passes the request on. The apps are served again on ports 3341-3345 by `server/apps-proxy.mjs`, which signs the person in to each app.

## Code layout (workspace folder)

| Path | What it does |
|---|---|
| `server.mjs` | Startup, login/logout, the login check, the router that hands each request to an area |
| `server/config.mjs` | Reads `config.json` (with defaults), port, `--open` / `--lan`, folders |
| `server/core.mjs` | Send replies, read bodies, serve pages/files with cache rules and `?v=` stamps, https redirect, `OPEN` (paths with no login) |
| `server/app-list.mjs` | The list of apps, which PC answers for each (checked every 20 s), up/down status |
| `server/state.mjs` | Creates the stores (auth, chat, activity, salary, overtime); owner and admin checks |
| `server/hr.mjs` | Calls the HR server as the signed-in person; staff list (safe fields only); photo file names |
| `server/apps-proxy.mjs` | The app proxies on 3341-3345: sign-in, look injection, redirects, cookies, SSE/WebSocket |
| `server/areas/*.mjs` | One file per area: `account`, `ai`, `apps`, `chats`, `create`, `design`, `edit`, `home`, `library`, `office`, `profile`, `share` |
| `auth.mjs` | One login, sessions, encrypted HR token, AI sign-in |
| `chat.mjs`, `activity.mjs`, `overtime.mjs`, `salary.mjs` | Data stores for chats, work time, OT register, salary |
| `public/` | The web UI: `index.html`, `login.html`, `offline.html`, `sw.js`, `manifest.webmanifest`, `js/`, `css/`, `img/`, `fonts/` |
| `embed/` | CSS/JS put into Office and HR pages when they open inside the workspace |
| `browser/` | Source of the Windows window app `Lighthouse.exe` (WebView2) |
| `dist/` | Built `Lighthouse.exe` package for other PCs (not in git) |
| `publish/Publish Lighthouse online.bat` | Adds the public hostnames to the Cloudflare tunnel |
| `archive/` | Old design mockups, the old editor app backup, original files (not used by the running app) |
| `docs/` | This handbook. `docs/_notes/` holds the raw notes taken from the build chats |

## Start, stop, restart

| Task | How |
|---|---|
| Start with a window | Double-click `Start Lighthouse.bat`. If it is already running, it just opens http://localhost:3350 |
| Start by hand | `node server.mjs` (this PC only), `node server.mjs --lan` (office network too), add `--open` to open the browser |
| Start everything hidden (normal way) | `Limelight Workspace (start all).vbs` → `start-all.ps1`. Starts, hidden, every app on JASPREET that is not already answering: the AI engine (:8830), the workspace (:3350, `--lan`, log `server.log`), Office (:3300), Design (:3330) and the local Limelight AI fallback (:8800). An app that already answers is left alone, so it is safe to run any time. A copy sits in `shell:startup`, so a restart or power cut brings limelightcorp.net back by itself. Log: `start-all.log` |
| Start only the workspace hidden | `Lighthouse Server (no window).vbs`. It runs `node server.mjs --lan` and writes `server.log` |
| Check it is up | Open http://127.0.0.1:3350/api/health |
| Stop | Stop the `node` process that listens on port 3350 (PowerShell: `Get-NetTCPConnection -LocalPort 3350 -State Listen \| % { Stop-Process -Id $_.OwningProcess }`). This also stops the app proxies 3341-3345, which run in the same process |
| Restart | Stop it, then run either `.vbs` again |

Office and Design have their own `.vbs` too (`limelight-office\Limelight Office (no window).vbs`, `limelight-studio\Limelight Studio (no window).vbs`; the workspace's Start button runs them). The Cloudflare tunnel starts from its own Startup entry (`tools\Limelight AI Tunnel.vbs`). Edit and Limelight AI run on NAYA A and NAYA B. See [servers.md](servers.md).

## Where data and secrets live (names only)

Never print, copy or send these files.

| What | Where |
|---|---|
| Settings, incl. the office AI password | `limelight-workspace\config.json` (template: `config.example.json`) |
| Users, sessions | `limelight-workspace\Data\users.json`, `Data\sessions.json` |
| Key that encrypts saved HR tokens | `Data\secret.key` |
| Shared key for Edit | `Data\edit.key` (same value as `workspace.key` in the editor's data folder on NAYA A and in NAYA B's standby data) |
| Shared key for Limelight AI | `Data\ai.key` (same value as `D:\LimelightAI\app\data\workspace.key` on NAYA B) |
| Shared key for Office | `E:\Limelight Ai\limelight-office\data\workspace.key` |
| Chats and chat files | `Data\chat\` (`chats.json`, `msgs\`, `files\`) |
| Profile photos | `Data\photos\` |
| Work-time log | `Data\activity\<day>.json` |
| Overtime register | `Data\overtime\<month>.json` |
| Salary rules and typed inputs | `Data\salary\` |
| AI video requests | `Data\video-requests.json` |
| Office mail, calendar, users | `limelight-office\data\office.db` (private) |
| Office files per person | NAS `\\192.168.0.99\Team Editing\Limelight Storage\<email>\Office` |
| Tasks, attendance, staff, payroll | The HR app's own server (lighthouse.limelightcorp.in) |
| Cloudflare tunnel settings and credentials | `C:\Users\user\.cloudflared\` on JASPREET |
| Limelight AI password on NAYA B | `D:\LimelightAI\password.txt` |

Most data sits on JASPREET, so back it up regularly (see [PENDING.md](PENDING.md)).

## The other documents

| File | What is in it |
|---|---|
| [home.md](home.md) | Login and accounts, sessions, roles, Home dashboard, clock-in, app bar, search, themes |
| [chats.md](chats.md) | Chats, forward, share cards, the Share button |
| [create-library-profile.md](create-library-profile.md) | Create (AI image/video), Library (videos, images), Profile (attendance, Time, Team) |
| [edit.md](edit.md) | Edit inside the workspace, no-second-login, release flow |
| [design.md](design.md) | Design (Limelight Studio) and how the workspace uses it |
| [office.md](office.md) | Office: menu, pages, Overtime, Salary, embed styling |
| [limelight-ai.md](limelight-ai.md) | Limelight AI: modes, models, pictures, logins, deploy |
| [phone-speed-app.md](phone-speed-app.md) | Phone layout, caching and version stamps, installable app, Lighthouse.exe, English wording |
| [servers.md](servers.md) | PCs, ports, IPs, SSH, Cloudflare, failover, NAS, deploy paths |
| [CHANGELOG.md](CHANGELOG.md) | Every update, by day |
| [REBUILD.md](REBUILD.md) | Set the whole thing up again on a new PC, plus a checklist |
| [PENDING.md](PENDING.md) | Everything still open, by area, with who must do it |
| [RULES.md](RULES.md) | The owner's standing rules |
| `_notes/` | Raw notes taken from the build chats (source for this handbook; kept as they are) |

Where the raw notes and the current code disagree, these documents follow the code and say so.
