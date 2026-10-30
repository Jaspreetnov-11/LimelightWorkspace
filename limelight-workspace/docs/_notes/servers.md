# PCs and servers behind the Limelight Workspace

These notes describe which PC runs what, how the PCs are reached, failover, the NAS, and the owner's rules. They come from
Claude Code sessions on 27–30 Oct 2026 and the memory notes. App details for Limelight AI are in
[limelight-ai.md](limelight-ai.md). Times are IST. No passwords or keys are written here; only where they are kept.

---

## 1. Network at a glance

- Office LAN: **192.168.0.0/24**, about 1 Gbps, 60+ devices. Firewall rules for the apps allow only this subnet.
- The owner has about 10 PCs connected to the server, plus about 10 more. Only the PCs below have been checked in detail.
- **JASPREET is the hub.** It runs the Lighthouse workspace and the Cloudflare tunnel, so when JASPREET is off or logged out, every public link stops working.

```
Internet ──Cloudflare (limelightcorp.net)──► tunnel "limelight-ai" on JASPREET (192.168.0.210)
                                               ├─► limelightcorp.net / www  → Lighthouse 127.0.0.1:3350
                                               ├─► lh-edit / lh-office / lh-team / lh-ai / lh-design → 3341–3345
                                               ├─► ai.limelightcorp.net     → NAYA B 192.168.0.205:8800
                                               └─► editor.limelightcorp.net → NAYA A 192.168.0.200:3100
LAN PCs ──► Lighthouse.exe → http://192.168.0.210:3350 first, falls back to https://www.limelightcorp.net
NAS 192.168.0.99 (Z:) ◄── per-person storage, editor projects, file hand-off to NAYA B
```

---

## 2. The PCs

### JASPREET (owner's PC, 192.168.0.210)
- **Hardware:** Ryzen 9 5900X (12 cores), 64 GB DDR4-3200 (4 slots, 3 used: 32+16+16, max 128 GB), RTX 4060 8 GB.
- **Disks:** C: is an NVMe SSD. D: and E: are on **one Toshiba HDD**, which is slow and often saturated. That is why model cold loads take 140–190 s here.
- **Role:** development PC for all apps, render helper for the editor, hub for the workspace and the tunnel. Has internet. Cloudflare WARP is installed and intercepts DNS; the tunnel's "DNS local resolver" warning is harmless.

| Port | Service | Notes |
|---|---|---|
| 3350 | **Lighthouse workspace** (`limelight-workspace`, `node server.mjs`) | Runs hidden through `Lighthouse Server (no window).vbs` with `--lan` (since 30 Oct). Starter: `Start Lighthouse.bat`. |
| 3341–3345 | Lighthouse app proxies | 3341 Edit (NAYA A), 3342 Office, 3343 Lighthouse web app, 3344 Limelight AI, 3345 Design (Studio). |
| 3330 | Limelight Studio (design tool) | Studio's AI image tab and generative fill call the AI. |
| 3300 | Limelight Office (127.0.0.1, owner auto-login) | LAN: `https://192.168.0.210:3443`, self-signed. **The firewall rule for 3443 has not been added.** Office's own Lighthouse proxy: 3301 local, 3444 LAN. |
| 8787 | District Desk (Instagram automation) | Uses JASPREET's Ollama (qwen3:8b) and limelight-ai's venv for SDXL. Cloud dashboard on Vercel. |
| 8800 | **Limelight AI, local copy** (fallback and SDXL inpainting for Studio) | Started by hand; **does not auto-start**. LAN mode: `start.ps1 -Lan -Password …`. |
| 8811 | Limelight AI test instance | From `E:\Limelight Ai\.claude\launch.json`. |
| 11434 | Ollama (127.0.0.1 only) | `OLLAMA_MODELS=D:\AI Models\ollama\models`. Started by hand; the tray app was closed. |
| 3000 / 3100 | Video Editor (local instance, started from its tray) | Reserved; do not reuse. |

- Editor source code: `D:\Video Editor Agent` (git). Editor releases go to NAYA A through `tools\server\Deploy to server.bat`, which **the owner runs** because Claude was blocked. NAYA A pulls from `D:\Limelight Release\editor` when it is idle.
- Model folders: `D:\AI Models\ollama\models`, `D:\AI Models\huggingface` (SDXL, Qwen, Whisper, Wan 2.2 34 GB). `qwen3:30b-a3b` is kept here only.
- Tunnel tools: `E:\Limelight Ai\tools\cloudflared.exe` (a copy, because the AppData path is invisible to the app's terminal under MSIX) and `E:\Limelight Ai\tools\Limelight AI Tunnel.vbs`, which is in `shell:startup` (done 28 Oct).

### NAYA A (DESKTOP-39S6OC2, 192.168.0.200): live Video Editor server
- **Hardware:** Ryzen 9 9900X (Zen 5), 31 GB RAM, RTX 5070 12 GB, ~1.5 TB free.
- **Role:** the live **Limelight Video Editor ("Edit")** server for the team: renders, 4 workers, Whisper, NVENC. It also runs the **MeshLink VPN** server (client setup and router forwarding not finished).
- **Ports:** editor at `http://192.168.0.200` (workspace `editorUrl`) and the sign-in app on **:3100** (the tunnel target for editor.limelightcorp.net). RDP 3389. SSH 22.
- Keeps `<editor DATA>\workspace.key` so Lighthouse can open Edit without a login. Edit's team holds 53 people (role editor), and owners are jaspreet and guri (30 Oct).
- **Rule: nothing AI on this PC. Never install or run Ollama here.** Claude has never touched it beyond read-only checks and the editor's own team API.
- On 29 Oct around 09:00 A did not answer ping or HTTP; around 11:00 it answered RDP only and NAYA B took over as standby. Whether A is fully back was not re-checked in these notes.

### NAYA B (NAYA-B, 192.168.0.205): AI server plus standby editor
- **Hardware:** same as A. Ryzen 9 9900X, 31 GB DDR5 (AM5), RTX 5070 12 GB (12,227 MiB). C: 623 GB free, D: ~935–999 GB free. **No internet.**
- **Roles:**
  - **Limelight AI server.**
  - **Standby editor** (takes over on :3100 when A is down).
  - Bridge, gateway, Flow, and office watch keep running.
  - **No longer a render helper:** the "Limelight Helper" scheduled task has been disabled since 28 Oct. Undo with `Enable-ScheduledTask 'Limelight Helper'`.

| Port | Service | Notes |
|---|---|---|
| 8800 | **Limelight AI** (`D:\LimelightAI\app`) | Firewall "Limelight AI 8800" allows 192.168.0.0/24 only. Own password or Lighthouse office key. |
| 11434 | Ollama, **127.0.0.1 only** | Program `D:\LimelightAI\ollama\prog`, models `D:\LimelightAI\ollama\models`. Must not be open on the LAN. |
| 3100 | Standby Video Editor | When it opens, the AI stops by itself. |
| 22 / 3389 | SSH / RDP | SMB (`\\192.168.0.205\D$`) does not work (error 53). |

- **Start-up:** the scheduled task "Limelight AI" runs at sign-in, hidden: `ai.vbs` → `run-ai.ps1` loop → Ollama plus the app, restarted if they crash. Logs are `D:\LimelightAI\ai.log`, `app.log` and `ollama.log`.
- Other B folders: `D:\LimelightAI\models\huggingface` (SDXL Turbo and Base, Whisper, Qwen-Image and Edit with Lightning LoRAs); wheel folders `wheels`, `wheels-img`, `wheels-qwen`, `wheels-peft`, `wheels-tv`; `password.txt` (backup `password-old.txt`); `C:\Users\ADMIN\restart-app.ps1`.
- **Standby guard:** if B's standby editor opens port 3100, the AI shuts down within about 10 s so the editor gets the whole GPU and RAM, and it comes back when 3100 closes. This was checked in code only, not with a real takeover, until 29 Oct, when it worked as designed during A's outage.
- **Measured speeds** (warm, 400-token answer):

| Model | Speed on B | GPU share |
|---|---|---|
| qwen3:8b | 107–111 tok/s | 100% GPU |
| gpt-oss:20b | 72–77 tok/s with a clean GPU; ~19 tok/s when desktop apps hold VRAM | – |
| qwen3-coder:30b | 57 tok/s | – |
| qwen2.5vl:7b | 103 tok/s | – |

  B is about 2.8× JASPREET on gpt-oss:20b and about 4× on qwen3:8b. Cold loads take 3–40 s.
- **Keep B's desktop free of GPU-hungry apps** (Edge, Copilot, Creative Cloud). gpt-oss:20b is 13.1 GB on a 12 GB card, and every MB counts.
- Suggested upgrade (not done): 128 GB RAM (2×64 GB DDR5), optionally a second GPU (RTX 3060 from CUR5ED-OFC, needs a 2-slot board and ~850 W PSU).

### Other PCs known so far
| PC | IP | GPU | RAM | Notes |
|---|---|---|---|---|
| CUR5ED-OFC | 192.168.0.175 | RTX 3060 12 GB | 64 GB | Second-best AI candidate. The owner chose not to use it ("PC mera hi rakhna"). |
| DESKTOP-HMST6RF | unknown | RTX 4060 8 GB | 64 GB | Same class as JASPREET. |
| KASHISH | unknown | RTX 5060 8 GB | 32 GB | Not suitable for AI. |

The other ~10–20 PCs' GPU, RAM and network speed (1G or 2.5G/10G) have not been collected yet. That information is needed before any multi-PC AI plan.

---

## 3. NAS (192.168.0.99)

- Share **"Team Editing"**, mapped as **Z:**. L: and Y: are also NAS drives.
- `Z:\Limelight Storage\<email>\Office`: each person's Office files (since 30 Oct, `storageDir` in Office's config). If the NAS is off, files fall back to the old local folders. Admins can open anyone's folder.
- `Z:\Editor Projects\<id>`: a project folder per Edit team member, created by Edit.
- `\\192.168.0.99\Team Editing\Limelight AI update\`: the older hand-off folder for copying web and server files to NAYA B (B then runs `robocopy`/`copy`).
- The NAS lets this PC create, rename and delete files, but **not delete top-level folders**. An empty `.dirtest` folder is left in `Z:\Limelight Storage`; delete it on the NAS itself.
- Studio designs, workspace chat files and profile photos are still on JASPREET, not the NAS (moving them was offered).

---

## 4. How the PCs are reached

### SSH (from JASPREET, key-based, user ADMIN)
| Alias | Host |
|---|---|
| `limelight-a` | 192.168.0.200 (NAYA A) |
| `limelight-b` | 192.168.0.205 (NAYA B) |

The deploy scripts in `limelight-ai\deploy-naya-b\` use `ssh -o BatchMode=yes limelight-b "powershell -NoProfile -Command -"`.
Claude was blocked from reading the SSH key and config and from killing processes on B over SSH, so the owner runs those .bat files.

### Domains and Cloudflare
- **limelightcorp.net:** bought at GoDaddy on 28 Oct, nameservers moved to Cloudflare (Free plan). The Cloudflare account is the owner's.
- **limelightcorp.in:** stays on GoDaddy. `lighthouse.limelightcorp.in` is the Lighthouse staff/attendance/projects web app (source `D:\LimelightWebapp`). Its login API is used for the single workspace login.
- **Named tunnel "limelight-ai"** runs on JASPREET. Config is in `C:\Users\user\.cloudflared\config.yml` (with its credentials file; do not share it). Log: `limelight-ai.log`. It connects to Cloudflare's Mumbai edge.

| Public hostname | Goes to | Since |
|---|---|---|
| ai.limelightcorp.net | NAYA B 192.168.0.205:8800 (Limelight AI) | 28 Oct ~09:00 |
| editor.limelightcorp.net | NAYA A 192.168.0.200:3100 (editor sign-in) | 28 Oct ~09:07 |
| limelightcorp.net, www.limelightcorp.net | JASPREET 127.0.0.1:3350 (Lighthouse) | www 29 Oct; bare domain 29 Oct ~13:25 after `route dns --overwrite-dns` (old GoDaddy A records gave 525) |
| lh-edit / lh-office / lh-team / lh-ai / lh-design .limelightcorp.net | 127.0.0.1:3341 / 3342 / 3343 / 3344 / 3345 | 29 Oct 11:08 |
| lighthouse.limelightcorp.net | **removed** on 29 Oct (tunnel entry and DNS record deleted) | – |
| anything else | 404 | – |

- Adding a hostname needs `cloudflared tunnel route dns limelight-ai <host>` plus an ingress entry. **The owner runs these himself**, because Claude was blocked from public exposure. The helper `limelight-workspace\publish\Publish Lighthouse online.bat` is idempotent.
- Cloudflare caches CSS and JS for 4 hours, so apps must version their asset URLs (`?v=`).
- Cloudflare cuts requests after **100 s**, so long jobs must stream progress (this is why `/image` now runs inside the chat).
- **Old quick tunnels** (random `*.trycloudflare.com` links: one for AI to 192.168.0.205:8800, the "LimelightTunnel" one for the editor to 192.168.0.200:3100) were meant to be stopped once the named tunnel worked. The owner said he would stop them; check that no `cloudflared … --url` process is left.

### Desktop app on other PCs
- `limelight-workspace\dist\Lighthouse` (plus "Lighthouse - doosre PC ke liye.zip", also on the NAS) contains **Lighthouse.exe 1.3** (WebView2, frameless).
- `Lighthouse.json`: `officeUrl` (default `http://192.168.0.210:3350/`; set to "" to turn it off) is tried first, then `url` `https://www.limelightcorp.net/`.
- Why LAN first: on 30 Oct Edit lagged on other PCs because video went NAYA A → JASPREET → Cloudflare → PC.
- **If JASPREET's IP changes**, edit `officeUrl` on each PC or reserve .210 on the router.
- Node is already allowed in JASPREET's firewall (Private profile).

---

## 5. Standby and failover

| Service | Primary | Fallback | How |
|---|---|---|---|
| Edit (video editor) | NAYA A (`editorUrl`) | NAYA B standby :3100 (`editorStandbyUrl`) | Lighthouse re-checks targets every 20 s |
| Limelight AI | NAYA B :8800 (`aiUrl`) | JASPREET 127.0.0.1:8800 (`aiLocalUrl`) | same; the JASPREET copy must be running (it is not auto-started) |
| AI on B vs standby editor | – | – | B's guard stops the AI while the standby editor holds 3100 |
| Studio AI images | NAYA B only | none (generative fill uses JASPREET's local AI) | open item |
| Public links | JASPREET tunnel | none | JASPREET must be on and logged in (startup-folder VBS) |
| Lighthouse on LAN PCs | 192.168.0.210:3350 | www.limelightcorp.net | Lighthouse.exe 1.3 |

---

## 6. Owner's rules for the servers

1. **Never install or run Ollama, or any AI model, on NAYA A.** It is the live editor; editing must see zero harm.
2. AI lives on **NAYA B**. Before changing AI things on B, check B's helper and standby state. If B is acting as the standby editor, the AI must stay stopped.
3. NAYA B stays off render-helper duty while it is the AI server; JASPREET is the render helper.
4. Ollama on B listens on **127.0.0.1 only**. Do not set `OLLAMA_HOST=0.0.0.0` or keep the "Ollama LAN" firewall rule, because that exposes the raw model API without a password.
5. Anything public (`*.limelightcorp.net`) must sit behind a password or the Lighthouse login, because Work and Build modes can run commands on B.
6. **One login only** (Lighthouse). No per-app logins or "connect accounts", and no new accounts are made in Edit, Office or AI. Inside Lighthouse, Edit, Office and AI trust the workspace through shared keys (`x-lh-key`).
7. Editor deploys only through `Deploy to server.bat`, run by the owner. Do not copy `Limelight Editor.exe` for other apps (it re-registers `limelight://` and shortcuts to itself).
8. Do not reuse the ports 3000, 3100, 3200, 3300, 3301, 3330, 3341–3345, 3350, 3443, 3444, 8787 and 8800.
9. NAYA B has no internet: download on JASPREET and copy over. Install Python wheels with `--no-deps` so CUDA torch is not replaced.
10. Confidential data never goes to cloud AI. Only non-confidential prompts are used for Claude comparisons.
11. Video and reel outputs go to `C:\Users\user\Downloads`, not `E:\Limelight Ai`.
12. Do not type the AI password for the owner. An admin sets it once in Lighthouse's account menu (and in Studio's AI settings).
13. Write files as UTF-8 through Python or .NET, not with PowerShell `Set-Content`; that broke characters once.

---

## 7. Open items (servers)

- NAYA A health after the 29 Oct outage (only RDP answered at the time); confirm the editor is back and B has left standby.
- JASPREET's local Limelight AI and Ollama need a startup task, or a decision not to keep the fallback.
- Office LAN firewall rule for port 3443 on JASPREET (owner to add).
- Confirm the "Ollama LAN" firewall rule and `OLLAMA_HOST` are removed on B.
- Confirm the old quick tunnels are stopped.
- Edit project tabs inside Lighthouse: the fix (`framedByOther` in `D:\Video Editor Agent\public\index.html`) is uncommitted and not deployed.
- Whether B's standby has the new 53-person Edit team list (B did not answer when it was checked on 30 Oct).
- Collect the specs and network speed of the other PCs; consider reserving .210, .200 and .205 on the router.
- Optional upgrades: RAM for NAYA B, a bigger GPU or Mac Studio for larger models (see limelight-ai.md).

---

## 8. Update log

| Date (IST) | Change |
|---|---|
| 28 Oct ~05:50–06:20 | Specs collected for JASPREET, NAYA A and NAYA B; Ollama and models copied to B (`D:\LimelightAI\ollama`, 19.8 GB) for offline install; real speed tests. |
| 28 Oct ~06:30–06:55 | B's helper disabled; "Limelight AI" task, firewall 8800 and standby guard set up; AI live at 192.168.0.205:8800. |
| 28 Oct ~06:35–07:20 | The owner also ran Ollama by hand on B with LAN exposure (`OLLAMA_HOST=0.0.0.0`, flash attention, q8_0 KV cache, "Ollama LAN" rule). Clean-up was given; 11434 was later found closed from the LAN. |
| 28 Oct ~07:10 | All models, SDXL and torch cu128 put on B. |
| 28 Oct ~08:30 | Temporary quick tunnel for AI (owner ran cloudflared; copy placed in `E:\Limelight Ai\tools`). |
| 28 Oct ~08:50–09:10 | limelightcorp.net bought (GoDaddy) and moved to Cloudflare; named tunnel `limelight-ai` created by the owner; ai. and editor. hostnames live; VBS in the startup folder. |
| 29 Oct ~09:00–11:00 | NAYA A and B unreachable, then A down (RDP only) and B on standby; JASPREET local AI started as fallback; Lighthouse failover lists added. |
| 29 Oct 11:08 | lh-* hostnames live (owner ran the publish .bat). |
| 29 Oct ~13:25 | Bare limelightcorp.net and www point to Lighthouse; lighthouse.limelightcorp.net dropped later that day. |
| 30 Oct | Lighthouse runs with `--lan`; Lighthouse.exe 1.3 prefers the LAN address; per-person Office storage on the NAS; whole team added to Edit on NAYA A; guri made an Edit owner. |
| 30 Oct 19:44 | Office-key login and per-person chats deployed to NAYA B over SSH (owner ran the .bat). |
