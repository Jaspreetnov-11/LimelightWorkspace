# Limelight Workspace ("Lighthouse")

Every Limelight app in one window, behind one login: Home, Chats, Create, Library, Profile, plus **Edit**, **Design**, **Office** and **Limelight AI**. People sign in once with their HR (Lighthouse) email and password. Local: http://localhost:3350 · Online: https://limelightcorp.net

**The handbook is in [docs/README.md](docs/README.md)** - what each area does, how it works, servers, how to rebuild it, what is pending and the owner's rules.

## Start

- Double-click **Start Lighthouse.bat** (or `node server.mjs --open`) → http://localhost:3350
- Normal way (hidden, office network too): **Lighthouse Server (no window).vbs** (`node server.mjs --lan`, log in `server.log`). Copy it into `shell:startup` to start at sign-in.
- Office (port 3300) and Design (Limelight Studio, port 3330) should also be running; the workspace's Start button can start them.
- Node.js only; no `npm install`.

## File layout

| Path | What |
|---|---|
| `server.mjs` | Startup, login/logout, login check, router |
| `server/config.mjs` | `config.json` + defaults, port, `--open` / `--lan`, folders |
| `server/core.mjs` | Replies, bodies, pages and files (cache rules, `?v=` stamps), https redirect, `OPEN` (no-login paths) |
| `server/app-list.mjs` | The apps and which PC answers for each (checked every 20 s) |
| `server/state.mjs` | The stores (auth, chat, activity, salary, overtime); owner / admin checks |
| `server/hr.mjs` | HR server as the signed-in person; staff (safe fields); photos |
| `server/apps-proxy.mjs` | App proxies 3341 Edit · 3342 Office · 3343 HR pages · 3344 AI · 3345 Design |
| `server/areas/` | One file per area: `account`, `ai`, `apps`, `chats`, `create`, `design`, `edit`, `home`, `library`, `office`, `profile`, `share`. Each `route()` answers its own paths or returns NEXT |
| `auth.mjs` | One login (via the HR server), sessions, encrypted HR token |
| `chat.mjs`, `activity.mjs`, `overtime.mjs`, `salary.mjs` | Stores: chats, work time, OT register, salary |
| `public/` | UI: `index.html`, `login.html`, `offline.html`, `sw.js`, `manifest.webmanifest`, `js/`, `css/`, `img/`, `fonts/` |
| `embed/` | Look put into Office and HR pages inside the workspace |
| `browser/` | Lighthouse.exe source (WebView2); `build.cmd` builds `browser\app` |
| `publish/` | `Publish Lighthouse online.bat` (Cloudflare tunnel hostnames) |
| `archive/` | Old mockups, editor app backup, original files (not used) |
| `docs/` | Handbook; `docs/_notes/` = raw notes from the build chats |
| `Data/` | Private: users, sessions, keys, chats, photos, work time, OT, salary (not in git) |
| `config.json` | Settings incl. secrets (not in git); template `config.example.json` |

## Online

`publish\Publish Lighthouse online.bat` (run by the owner) adds limelightcorp.net, www and the app hosts lh-edit / lh-office / lh-team / lh-ai / lh-design to the Cloudflare tunnel on this PC. The login cookie is shared across *.limelightcorp.net, so one login opens every app. Plain http is sent to https. Each person opens Office, Edit and Limelight AI as themselves (no second sign-in).

Edit and Limelight AI follow their PCs: Edit = NAYA A, else NAYA B's standby (:3100); AI = NAYA B, else this PC (:8800). Details: [docs/servers.md](docs/servers.md).
