# Phones, speed, the installable app and Lighthouse.exe

---

## 1. Phone layout

File: `public/css/mobile.css` (loaded last, so it wins over the desktop layout).

| Part | On a phone |
|---|---|
| Navigation | Bottom tab bar with icons: Home, Chats, Create, Library, Profile (frosted glass) |
| Header | Slim: logo + round search / theme / account buttons; search expands across the bar |
| Inputs | 16 px text so phones do not zoom; no sideways overflow |
| Home | Smaller left-aligned greeting, Gita line on two quiet lines, app cards two per row, number tiles three per row, lists show a few rows with "All →" |
| Clock-in | Slide to clock in / slide to clock out (see [home.md](home.md)) |
| Library | The video list goes under the player |
| Office | The icon rail becomes a swipeable labelled tab strip on top; Mail/Calendar/Meetings/News fit the screen; task board swipes per column; the floating "← Workspace" button is hidden |
| Document / Grid / Deck | Templates two per row, compact title bar, swipeable tabs and toolbar (was 1,450 px wide); Document reflows (saved file stays A4); Grid keeps 100 px cells and scrolls like Excel (`width:max-content`); Deck shows the slide, a swipeable slide strip and "+" |
| iPhone | Status-bar safe area handled |

Tested at phone, tablet and desktop widths with the test account. **Not yet** tested with a real finger, typing or saving on a real phone. Staff and Events (old HR layout) fit but look narrow.

---

## 2. Speed and caching

### The rule: every file link carries a version stamp
- When the server sends `index.html` or `login.html`, it stamps each `css/…` and `js/…` link with `?v=<that file's last-change time>` (`servePage()` in `server/core.mjs`). An edited file gets a new link by itself; nobody has to bump numbers by hand. (The `?v=20261030v` / `?v=0` in the HTML files are placeholders that the server replaces.)
- Because the link changes when the file changes, the file itself can be cached for a long time.

| File type | Cache-Control |
|---|---|
| Any file requested with `?v=` | `max-age=31536000, immutable` (one year). `public` for no-login files, `private` for the rest (so Cloudflare does not keep login-only files) |
| `fonts/`, `img/` | `public, max-age=2592000` (30 days) |
| Everything else, and the pages | `no-cache`, with "304 not modified" support (`Last-Modified` / `If-Modified-Since`) |
| API replies | `no-store` |

- Office uses the same treatment. Framed app pages also load with `?v=` boot stamps.
- **Why:** Cloudflare kept stylesheets for 4 hours despite `no-cache`, so phones ran old code. From home one stylesheet took 2.1 s; now about 0.45 s, and not fetched at all on repeat visits.
- Other speed-ups: the 423 KB Hindi web font was dropped (phones use their built-in Hindi font); logos shrunk from 62 KB to about 5 KB (originals in `archive/originals/`).
- Home: each data source capped at 3 s and cached (see [home.md](home.md)).
- **Remaining limit:** everything is served from JASPREET through the office internet. If that PC or its upload is slow or off, everyone feels it.

---

## 3. Installable app (PWA)

| File | Job |
|---|---|
| `public/manifest.webmanifest` | Name "Limelight", black, opens on Home, standalone window |
| `public/img/` | Icon set: rounded icons for computers, full-bleed squares for iPhone/Android, a maskable icon |
| `public/sw.js` | Service worker. Its only jobs: make the app installable and show `offline.html` ("No connection — Try again") when there is no internet. **It never serves an old copy**: every page load goes to the server |
| `public/offline.html` | The no-connection page |

How to install (no app stores - they cost money, need reviews and rebuilds):
| Device | Steps |
|---|---|
| Android | Chrome ⋮ → Install app |
| iPhone | **Safari** → Share → Add to Home Screen |
| Mac | Chrome/Edge install icon, or Safari File → Add to Dock |
| Windows | Chrome/Edge install icon, or Lighthouse.exe |

"Install" has not yet been pressed on a real phone or Mac.

---

## 4. Lighthouse.exe (Windows window app)

### What it is
- A frameless Windows window around the workspace (WebView2, WinForms, .NET Framework 4.8). Current version **1.3.0**.
- The workspace's own header is the title bar: drag to move, double-click to maximise; themed ─ ▢ ✕ buttons drawn by `public/js/frame.js`. F11 is full screen but keeps the Windows taskbar visible (uses the screen's working area).
- Icon "L ▶", title "Limelight". Own data folder per host under `%LOCALAPPDATA%\Limelight Lighthouse`, so sign-in and theme stay in this window.
- The root domain and all its subdomains stay in the app; other links open in the normal browser.

### What it does
| Job | Detail |
|---|---|
| Starts the server | On the hub PC, if nothing answers on 127.0.0.1:3350 it starts `server.mjs` hidden (`serverDir`) and waits. Uses 127.0.0.1, not `localhost` (which resolved to IPv6 and hung) |
| Office network first | If `url` is the online address, it first tries `officeUrl` (default `http://192.168.0.210:3350/`; `""` turns it off) and falls back to `url`. Reason: on 30 Oct Edit lagged on other PCs because video went NAYA A → JASPREET → Cloudflare → PC |
| `limelight://` links | Registers `limelight://` on every start and handles **Open in Premiere / DaVinci** itself |
| Collect | Checks Premiere/Resolve is installed, copies all timeline footage to the PC's biggest non-C: drive under `Limelight Projects\<project>` with progress and Stop, then opens with nothing offline. Re-opens copy only changes. Asks if the drive is too full |
| DaVinci (free) | Cannot be driven from outside: the script goes into Resolve's Workspace → Scripts menu and the XML path into `%APPDATA%\Limelight\resolve-next.txt`; the user clicks Workspace → Scripts → Limelight Timeline once |
| Self-update | On every start it compares its version with the copy on the NAS `\\192.168.0.99\Team Editing\Limelight Apps\Limelight Workspace` and replaces itself if newer (a second or two). NAS unreachable → starts as it is |

### Source and build (`browser/`)
| File | What |
|---|---|
| `Program.cs` | Window, settings, server start, link handling, F11 |
| `Nle.cs` | Open in Premiere / DaVinci and Collect |
| `Updater.cs` | Self-update from the NAS |
| `Lighthouse.csproj` | Project (version number here) |
| `Lighthouse.json` | Settings next to the exe: `url`, `serverDir`, optional `officeUrl`, `updateDir`. Change without rebuilding |
| `build.cmd` | `dotnet publish Lighthouse.csproj -c Release -o app` → `browser\app` |
| `app.ico` | Icon |

- The hub PC uses `browser\app` (Desktop shortcut) with `url` = `http://localhost:3350/`.
- Other PCs: `dist\Lighthouse` (opens https://www.limelightcorp.net, `serverDir` empty) + `Desktop shortcut banao.vbs` + a read-me text, zipped as `dist\Lighthouse - doosre PC ke liye.zip` (file names kept as they are), also on the NAS.
- To publish an update: raise `<Version>` in `Lighthouse.csproj`, run `build.cmd`, copy `browser\app` to the NAS update folder.
- **Decision:** `Limelight Editor.exe` was not copied for this, because it re-registers the editor shortcut and `limelight://` links to itself on every start.
- If JASPREET's IP changes, edit `officeUrl` on each PC or reserve .210 on the router.

### Known issues
- The read-me in `dist\Lighthouse` is in Hinglish and says Office opens from outside for admins only; that is out of date (every person now has their own Office).
- `browser/bin`, `browser/obj`, `browser/app` and `dist/` are build outputs and are not in git.

---

## 5. English wording rule

- **All visible text is English.** About 130 strings were changed in the workspace, 18 in Office and 1 in Studio (for example the Hinglish "Today", "All caught up" and "Wrong email or password" lines).
- Kept on purpose: the Hindi line of the Gita verse; Office's AI Agent answers in the user's language; Design's generative fill still understands a typed Hindi "remove"; Limelight AI replies in the user's language.
- The word **"Lighthouse" is removed** from titles, header, login, messages and the window title. The brand is **Limelight** with the Limelight logo. Staff IDs like LH0001 are real data and stay.
- Replies from Claude to the owner are in English (the owner writes Hinglish).
- Still to fix: two Hinglish strings in `chat.mjs` (see [chats.md](chats.md)) and the `dist\Lighthouse` read-me.
