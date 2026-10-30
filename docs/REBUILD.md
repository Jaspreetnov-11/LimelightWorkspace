# Rebuild the workspace on a new PC

Step by step, from an empty Windows PC to the full workspace online. The new PC takes JASPREET's role as the **hub**. NAYA A (Edit) and NAYA B (Limelight AI) are separate PCs; their own setup is summarised in steps 9 and 10.

Before you start, read [RULES.md](RULES.md). Steps marked **Owner** must be done by the owner himself (passwords, Cloudflare, firewall, deploys over SSH).

---

## 0. What the hub PC needs

| Software | Why | Notes |
|---|---|---|
| Windows 10/11 | Everything | WebView2 and .NET Framework 4.8 are already in Windows |
| **Node.js 24** | Workspace, Office, Studio | Office uses `node:sqlite` (needs 24). Tested with v24.19 |
| Git | Code history | The workspace folder is a git repo |
| Microsoft Office | Office's Document / Grid / Deck save real files through COM | |
| CorelDRAW 2025 (optional) | Design's CDR / AI / vector-PDF export | Without it, the other formats still work |
| .NET SDK (8 or newer) | Building Lighthouse.exe | Tested with 10.0 |
| Python 3 + NVIDIA driver (optional) | The local Limelight AI fallback and Design's generative fill | |
| cloudflared | The public site | Kept as `E:\Limelight Ai\tools\cloudflared.exe` |

Keep the projects on a **short path** (long paths broke PyTorch and python-docx once).

---

## 1. Folders

Use the same drive and names; several paths are written into the code (see the table below).

```
E:\Limelight Ai\
  limelight-workspace\   the workspace (this repo)
  limelight-office\      Office
  limelight-studio\      Design
  limelight-ai\          Limelight AI (development copy + deploy scripts)
  tools\                 cloudflared.exe, "Limelight AI Tunnel.vbs"
D:\Video Editor Agent\   Edit's source (only on the coding PC)
```

Paths that are written into files (change them if you use another drive):
| File | Path inside |
|---|---|
| `Lighthouse Server (no window).vbs` | `E:\Limelight Ai\limelight-workspace` |
| `server/app-list.mjs` | Start buttons: `E:\Limelight Ai\limelight-studio\…vbs`, `E:\Limelight Ai\limelight-office\…vbs` |
| `server/areas/office.mjs` | Office key: `E:/Limelight Ai/limelight-office/data/workspace.key`; Office address `127.0.0.1:3300` |
| `publish/Publish Lighthouse online.bat` | `E:\Limelight Ai\tools\…`, the workspace `.vbs` |
| `browser/Lighthouse.json` and `Program.cs` default | `serverDir` = `E:\Limelight Ai\limelight-workspace` |
| Studio `server.mjs` | Reads the AI key from `..\limelight-workspace\Data\ai.key` (or `aiKeyFile` in Studio's config) |

---

## 2. Get the code

1. Copy (or clone) the four project folders into `E:\Limelight Ai\`.
2. Workspace: **no `npm install`** needed (no dependencies).
3. Studio: no `npm install` needed (vendor libraries are in `public/vendor`).
4. Office: run `npm install` in `limelight-office` (imapflow, mailparser, nodemailer).
5. Never copy the old PC's `Data\`, `data\` or `config.json` through chat, email or a cloud service. If you move them, copy the folders directly (USB or the NAS) - they hold everyone's sessions, chats, mail and keys.

---

## 3. Workspace settings (`config.json`)

1. Copy `config.example.json` to `config.json` (if you skip this, the server writes one with defaults on first start).
2. Check these keys (defaults are in `server/config.mjs`):

| Key | Set to |
|---|---|
| `port` | 3350 |
| `studioUrl` | `http://127.0.0.1:3330` |
| `lighthouseUrl` | `https://lighthouse.limelightcorp.in` |
| `editorUrl` | `http://192.168.0.200` (NAYA A) |
| `editorStandbyUrl` | `http://192.168.0.205:3100` (NAYA B) |
| `aiUrl` | `http://192.168.0.205:8800` (NAYA B) |
| `aiLocalUrl` | `http://127.0.0.1:8800` (this PC) |
| `aiPassword` | Leave empty. The key method (step 4) replaces it. Never type it for the owner |
| `owners` | `["jaspreet", "gurpreet"]` |
| `keepSignedIn` | `["gurpreet"]` |
| `editNames` | Only for people whose Edit name is not their email start or unique first name |
| `publicDomain`, `publicHost`, `appHosts` | `limelightcorp.net`, the `lh-*` hosts |

---

## 4. Keys that must be created (and where each copy goes)

Each key is a random secret that two apps share. Create each one **with Node** (not PowerShell `>`/`Set-Content`, which adds a byte-order mark or UTF-16 and breaks the match):

```
cd "E:\Limelight Ai\limelight-workspace"
node -e "require('fs').mkdirSync('Data',{recursive:true});for(const f of ['edit.key','ai.key'])require('fs').writeFileSync('Data/'+f,require('crypto').randomBytes(32).toString('hex'))"
node -e "require('fs').writeFileSync('../limelight-office/data/workspace.key',require('crypto').randomBytes(32).toString('hex'))"
```

| Key file (workspace side) | Same value must also be in | Without it |
|---|---|---|
| `Data\secret.key` | nowhere (made automatically on first start; encrypts saved HR tokens) | Made for you. If lost, everyone signs in again |
| `Data\edit.key` | NAYA A: `workspace.key` in the editor's data folder; NAYA B: the standby editor's data (`StandbyLive`) | Edit shows "Edit is not on for you yet" |
| `Data\ai.key` | NAYA B: `D:\LimelightAI\app\data\workspace.key`; this PC's local AI: `limelight-ai\data\workspace.key` (for the fallback) | Limelight AI shows its own unlock screen; Design's generative fill is refused by B |
| `limelight-office\data\workspace.key` | (the workspace reads Office's file directly) | Office shows "offline" inside the workspace |

Copying `edit.key` and `ai.key` to NAYA A and NAYA B: **Owner** (over SSH or the deploy scripts, e.g. `limelight-ai\deploy-naya-b\Per-person AI chats (run once).bat` pushes the AI key). If you keep the old PCs' keys, copy the old `Data\edit.key` and `Data\ai.key` instead of making new ones.

---

## 5. Start each app on the hub

| Order | App | How | Check |
|---|---|---|---|
| 1 | Office | `limelight-office\Start Limelight Office.bat` (or the `.vbs`) | http://127.0.0.1:3300 opens |
| 2 | Design | `limelight-studio\Start Limelight Studio.bat` (or the `.vbs`) | http://localhost:3330 opens |
| 3 | Workspace | `limelight-workspace\Start Lighthouse.bat` (first time), then `Lighthouse Server (no window).vbs` | http://127.0.0.1:3350/api/health answers `{"ok":true}` |
| 4 | Local AI (optional fallback) | `cd limelight-ai; .\setup.ps1 -Images` once, then `.\start.ps1` | http://127.0.0.1:8800 opens |

Then:
1. **Owner:** sign in at http://localhost:3350 with the HR email and password.
2. **Owner:** in Office (http://127.0.0.1:3300) → Office setup → My account → sign in with the HR account once (brings the staff list).
3. Keep the workspace running after reboots: copy `Lighthouse Server (no window).vbs` into `shell:startup` (Win+R → `shell:startup`). Office and Design can be started from the workspace's Start button, or also put their `.vbs` in `shell:startup`.

---

## 6. Office network access

1. The `.vbs` starts the workspace with `--lan` (listens on 0.0.0.0).
2. **Owner:** in Windows Firewall allow Node on the Private network, and ports 3350 and 3341-3345 for `192.168.0.0/24` only. For Office's own LAN https, also 3443 and 3444.
3. **Owner:** reserve the hub's IP on the router (Lighthouse.exe on other PCs expects `192.168.0.210`; if it changes, edit `officeUrl` in each PC's `Lighthouse.json`).

---

## 7. Cloudflare tunnel and the public site (Owner)

1. Put `cloudflared.exe` in `E:\Limelight Ai\tools\`.
2. Either copy the existing tunnel's folder `C:\Users\<user>\.cloudflared\` (config + credentials) from the old hub, or run `cloudflared tunnel login` and `cloudflared tunnel create limelight-ai`.
3. `config.yml` must have an `ingress:` list ending with `- service: http_status:404`, plus the AI and editor hosts:
   - `ai.limelightcorp.net` → `http://192.168.0.205:8800`
   - `editor.limelightcorp.net` → `http://192.168.0.200:3100`
4. Run `limelight-workspace\publish\Publish Lighthouse online.bat`. It adds `limelightcorp.net`, `www` and the five `lh-*` hosts (→ 3350 and 3341-3345), validates, creates the DNS records and restarts the tunnel.
5. Start the tunnel at sign-in: put `E:\Limelight Ai\tools\Limelight AI Tunnel.vbs` in `shell:startup`.
6. Open https://limelightcorp.net. http must jump to https; not signed in must go to `/login`.

---

## 8. Lighthouse.exe (Windows window app)

1. `cd browser` → `build.cmd` (runs `dotnet publish Lighthouse.csproj -c Release -o app`). Result: `browser\app\Lighthouse.exe`.
2. On the hub: `browser\app\Lighthouse.json` has `url` = `http://localhost:3350/` and `serverDir` = the workspace folder. Make a Desktop shortcut to `browser\app\Lighthouse.exe`. It registers `limelight://` on first start.
3. For other PCs: copy `browser\app` to `dist\Lighthouse`, set its `Lighthouse.json` to `url` = `https://www.limelightcorp.net/`, `serverDir` = `""` (it tries `http://192.168.0.210:3350/` first inside the office). Add `Desktop shortcut banao.vbs` and the read-me, zip it.
4. Put the built app in the NAS update folder `\\192.168.0.99\Team Editing\Limelight Apps\Limelight Workspace`. Every installed copy updates itself from there on start. For each new version, raise `<Version>` in `Lighthouse.csproj` first.

---

## 9. Edit connection (NAYA A / NAYA B)

1. Edit runs on NAYA A (`http://192.168.0.200`, team app on :3100) and as standby on NAYA B :3100. Its code is deployed only by `D:\Video Editor Agent\tools\server\Deploy to server.bat` (**Owner**). See [edit.md](edit.md).
2. **Owner:** put the workspace's `Data\edit.key` value into `workspace.key` in the editor's data folder on NAYA A and in NAYA B's standby data.
3. Every person who should use Edit must be a member of **Edit's team** with a name that matches their email start, their unique first name, or an `editNames` entry.
4. For Open in Premiere / DaVinci on staff PCs: install Lighthouse.exe (step 8). Free DaVinci needs one click: Workspace → Scripts → Limelight Timeline.

## 10. Limelight AI connection (NAYA B)

1. NAYA B has no internet: download on the hub, copy over, install wheels with `pip --no-deps`. See [limelight-ai.md](limelight-ai.md).
2. On B: scheduled task "Limelight AI" (at sign-in) → `ai.vbs` → `run-ai.ps1`; firewall "Limelight AI 8800" for `192.168.0.0/24`; Ollama on 127.0.0.1 only; "Limelight Helper" task disabled.
3. **Owner:** push the AI key and the current `app.py`/`db.py` with `limelight-ai\deploy-naya-b\Per-person AI chats (run once).bat`.
4. SSH aliases `limelight-a` / `limelight-b` (key-based, user ADMIN) must exist on the hub for the deploy scripts.

## 11. Design connection

1. Studio on 3330 reads the AI key from `..\limelight-workspace\Data\ai.key` - keep both folders side by side, or set `aiKeyFile` in Studio's `config.json`.
2. Studio's `config.json`: `aiUrl` = NAYA B, `aiLocalUrl` = `http://127.0.0.1:8800`.
3. For generative fill Add/Expand, the local AI (step 5.4) must be running with SDXL Inpainting 0.1 in `D:\AI Models\huggingface`.
4. For CDR/AI export, CorelDRAW must be installed on the hub.
5. Install the fonts in `limelight-studio\public\fonts` (Mukta, Rozha One, Yatra One) on any PC that opens exported PSDs.

## 12. Installable app (PWA)

Nothing to build. It works once the site is on https. Each person installs it from the browser (see [phone-speed-app.md](phone-speed-app.md)).

---

## Checklist - does it work?

| # | Check | Expected |
|---|---|---|
| 1 | http://127.0.0.1:3350/api/health | `{"ok":true,"app":"Lighthouse",…}` |
| 2 | http://localhost:3350 without signing in | Goes to `/login` |
| 3 | Sign in with an HR account | Home with greeting, date, Gita line; Pure Black theme |
| 4 | Wrong password | "Wrong email or password" |
| 5 | Home app cards | Edit, Design, Office, AI show Live |
| 6 | Open Office | Dashboard opens signed in as you (your name, your mail), no login |
| 7 | Office → Staff / Notifications | HR pages open signed in, glass look, no HR sidebar or splash |
| 8 | Open Design | Studio opens, no login |
| 9 | Open Edit | Edit opens as your Edit user, project tabs visible, no login (or "not on for you yet" if not on Edit's team) |
| 10 | Open Limelight AI | No unlock screen; your name in the corner; only your chats |
| 11 | Chats | Send a message and a file between two test accounts; ticks and typing work |
| 12 | Library → Videos | Your Edit renders play and seek |
| 13 | Create → AI Image | A picture appears and lands in Library → Images |
| 14 | Profile | Your details, Time tab; Team list with photos |
| 15 | https://limelightcorp.net | Login page over https; `http://` jumps to `https://` |
| 16 | Sign in on the public site, then open an `lh-*` app | Already signed in (shared cookie) |
| 17 | Phone | Bottom tab bar, slide to clock in shown (do not complete a real punch while testing) |
| 18 | Lighthouse.exe | Opens, frameless, F11 keeps the taskbar; `limelight://` link opens Collect |
| 19 | Change a CSS file, reload | New style shows at once (new `?v=` stamp in the page source) |
| 20 | Stop NAYA B's AI | Workspace falls back to the local AI within 20 s (if it is running) |
