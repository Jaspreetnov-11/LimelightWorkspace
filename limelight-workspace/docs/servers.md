# PCs, servers and the public site

Which PC runs what, how the PCs are reached, the public domain, failover, the NAS and deploy paths. No passwords or keys here, only where they are kept.

---

## 1. Network at a glance

- Office LAN **192.168.0.0/24**, about 1 Gbps, 60+ devices. App firewall rules allow only this subnet.
- **JASPREET is the hub.** It runs the workspace and the Cloudflare tunnel. When JASPREET is off or signed out, every public link stops.

```
Internet ── Cloudflare (limelightcorp.net) ──► tunnel "limelight-ai" on JASPREET (192.168.0.210)
                                                ├─► limelightcorp.net, www  → workspace 127.0.0.1:3350
                                                ├─► lh-edit / lh-office / lh-team / lh-ai / lh-design → 3341-3345
                                                ├─► ai.limelightcorp.net     → NAYA B 192.168.0.205:8800
                                                └─► editor.limelightcorp.net → NAYA A 192.168.0.200:3100
Office PCs ──► Lighthouse.exe → http://192.168.0.210:3350 first, else https://www.limelightcorp.net
NAS 192.168.0.99 (Z:) ◄── per-person Office files, editor projects, exe updates, file hand-off to NAYA B
```

---

## 2. The PCs

| PC | IP | Role | Rule |
|---|---|---|---|
| **JASPREET** (owner's PC) | 192.168.0.210 | Workspace + proxies, Design, Office, Cloudflare tunnel, CorelDRAW exports, local fallback Limelight AI, editor source, editor render helper and standby | Must stay on and signed in |
| **NAYA A** (DESKTOP-39S6OC2) | 192.168.0.200 | Live Edit server for the team (renders, 4 workers, Whisper, NVENC); MeshLink VPN server (not finished) | **Never run Ollama or any AI here** |
| **NAYA B** (NAYA-B) | 192.168.0.205 | Limelight AI server; standby editor on :3100; trial target for every editor release | No internet; AI pauses while standby editor runs |
| NAS | 192.168.0.99 | Share "Team Editing" (Z:) | Cannot delete top-level folders from a PC |
| HR app | online | https://lighthouse.limelightcorp.in (source `D:\LimelightWebapp`) | Don't change without the owner's yes |

### JASPREET ports
| Port | Service | Notes |
|---|---|---|
| 3350 | **Workspace** (`node server.mjs --lan`) | Started hidden at sign-in by `start-all.ps1` (see below) |
| 3341-3345 | Workspace app proxies | 3341 Edit, 3342 Office, 3343 HR pages ("Team"), 3344 Limelight AI, 3345 Design |
| 3330 | Limelight Studio (Design) | |
| 3300 | Limelight Office (127.0.0.1, owner auto-login) | LAN https **3443** (self-signed; firewall rule not added yet). Office's own HR proxy 3301 local / 3444 LAN |
| 8787 | District Desk (Instagram automation) | Separate project |
| 8800 | Limelight AI, local copy (fallback + SDXL inpainting for Design) | Started by `start-all.ps1` (if `limelight-ai\.venv` exists) |
| 8811 | Limelight AI test instance | |
| 8830 | **Limelight AI engine** (llama.cpp router, 127.0.0.1 only) | `E:\Limelight Ai\tools\llama`, models `D:\AI Models\llama` (models.ini); started by start-all.ps1. Used by Office's Agent and the local Limelight AI |
| 11434 | Ollama (127.0.0.1 only) | **Being replaced by the engine (8830), 31 Oct**; nothing uses it on JASPREET any more. Remove after a few good days |
| 3000 / 3100 | Video Editor local instance (tray) | Reserved |

### JASPREET start-up (at sign-in)
| Startup entry (`shell:startup`) | Starts |
|---|---|
| `Limelight Workspace (start all).vbs` → `limelight-workspace\start-all.ps1` | In this order, each only if its port is not already listening: AI engine 8830 (`tools\llama\start-engine.ps1`), workspace 3350, Office 3300, Design 3330, local Limelight AI 8800. Log `limelight-workspace\start-all.log` ("started" / "already running" per app) |
| `Limelight AI Tunnel.vbs` | The Cloudflare tunnel |
| `Ollama.lnk` | Ollama 11434 - no longer needed since the engine (8830) replaced it; remove after a few good days |

The PC must still be **signed in** (Windows starts these at sign-in, not at boot). Run the `.vbs` by hand any time to bring back an app that stopped.

Hardware: Ryzen 9 5900X, 64 GB RAM, RTX 4060 8 GB. C: NVMe; **D: and E: share one slow HDD** (model cold loads 140-190 s).

### NAYA A
- Editor at `http://192.168.0.200` (workspace `editorUrl`) and its team sign-in app on **:3100** (tunnel target for editor.limelightcorp.net). RDP 3389, SSH 22.
- Keeps `workspace.key` in the editor's data folder so the workspace can open Edit without a login. Edit's team: 53 people (role editor); owners jaspreet and guri (30 Oct).
- Hardware: Ryzen 9 9900X, 31 GB RAM, RTX 5070 12 GB.

### NAYA B
| Port | Service | Notes |
|---|---|---|
| 8800 | Limelight AI (`D:\LimelightAI\app`) | Firewall "Limelight AI 8800" allows 192.168.0.0/24 only |
| 8830 | Limelight AI engine (llama.cpp), **127.0.0.1 only** | After `Switch NAYA B to llama.cpp.bat`: `D:\LimelightAI\llama\bin`, models `D:\LimelightAI\llama\models`; task "Limelight AI Engine" (`engine-guard.ps1`: stops while the standby editor holds 3100) |
| 11434 | Ollama, **127.0.0.1 only** | Program `D:\LimelightAI\ollama\prog`, models `D:\LimelightAI\ollama\models`. Replaced by the engine once the switch has run |
| 3100 | Standby editor | When it opens, the AI stops by itself |
| 22 / 3389 | SSH / RDP | SMB `\\192.168.0.205\D$` does not work (error 53) |

- Start-up: scheduled task "Limelight AI" at sign-in → `ai.vbs` → `run-ai.ps1` loop. Logs `D:\LimelightAI\ai.log`, `app.log`, `ollama.log`.
- Render-helper task "Limelight Helper" disabled since 28 Oct (undo: `Enable-ScheduledTask 'Limelight Helper'`).
- **Standby guard:** standby editor opens 3100 → AI stops within about 10 s; comes back when 3100 closes. Worked as designed during NAYA A's outage on 29 Oct.
- Keep B's desktop free of GPU-hungry apps (Edge, Copilot, Creative Cloud).
- Hardware: same as A; C: 623 GB free, D: about 935-999 GB free.

### Other PCs known
| PC | IP | GPU | RAM | Notes |
|---|---|---|---|---|
| CUR5ED-OFC | 192.168.0.175 | RTX 3060 12 GB | 64 GB | Second-best AI candidate; owner chose not to use it |
| DESKTOP-HMST6RF | unknown | RTX 4060 8 GB | 64 GB | |
| KASHISH | unknown | RTX 5060 8 GB | 32 GB | Not suitable for AI |

The other 10-20 PCs have not been surveyed.

### All ports (do not reuse)
3000, 3100, 3200, 3300, 3301, 3330, 3341-3345, 3350, 3443, 3444, 8787, 8800, 8830 (plus 8811 test, 11434 Ollama until removed).

---

## 3. How the PCs are reached

### SSH (from JASPREET, key-based, user ADMIN)
| Alias | Host |
|---|---|
| `limelight-a` | 192.168.0.200 (NAYA A) |
| `limelight-b` | 192.168.0.205 (NAYA B) |

The editor deploy and the AI deploy scripts use these aliases. The owner runs those .bat files himself (Claude was blocked from reading the SSH key and from killing processes over SSH).

### Domains and Cloudflare
- **limelightcorp.net**: bought at GoDaddy on 28 Oct, nameservers moved to Cloudflare (Free plan, owner's account).
- **limelightcorp.in**: stays at GoDaddy. `lighthouse.limelightcorp.in` is the HR app; its login API is the workspace login.
- **Named tunnel `limelight-ai`** runs on JASPREET. Config `C:\Users\user\.cloudflared\config.yml` with its credentials file (never share). Program copy `E:\Limelight Ai\tools\cloudflared.exe`. Started at sign-in by `E:\Limelight Ai\tools\Limelight AI Tunnel.vbs` (in `shell:startup`). Log `limelight-ai.log`.

| Public hostname | Goes to | Since |
|---|---|---|
| limelightcorp.net, www.limelightcorp.net | JASPREET 127.0.0.1:3350 (workspace) | www 29 Oct; apex 29 Oct about 13:25 |
| lh-edit / lh-office / lh-team / lh-ai / lh-design .limelightcorp.net | 127.0.0.1:3341 / 3342 / 3343 / 3344 / 3345 | 29 Oct 11:08 |
| ai.limelightcorp.net | NAYA B 192.168.0.205:8800 | 28 Oct about 09:00 |
| editor.limelightcorp.net | NAYA A 192.168.0.200:3100 | 28 Oct about 09:07 |
| lighthouse.limelightcorp.net | **removed** 29 Oct (tunnel entry and DNS record deleted) | – |
| anything else | 404 | – |

- `publish\Publish Lighthouse online.bat` (safe to run again): backs up the tunnel config, adds missing workspace hostnames, validates, creates DNS routes (`--overwrite-dns` for apex and www), restarts the tunnel, and starts the workspace if it is not answering. **The owner runs tunnel and DNS changes himself.**
- Adding any other hostname: an ingress entry in `config.yml` plus `cloudflared tunnel route dns limelight-ai <host>`.
- Cloudflare caches CSS/JS for 4 hours → apps must version asset links (`?v=`).
- Cloudflare cuts requests after **100 s** → long jobs must stream progress.
- History of the apex: first published as `lighthouse.limelightcorp.net`; owner wanted the bare domain; apex gave **525** because of old GoDaddy A records → owner deleted them and ran `cloudflared tunnel route dns --overwrite-dns limelight-ai limelightcorp.net`.

### https only
- `toHttps()` (`server/core.mjs`, used by the main server and every proxy) sends a **301 to https** for any `*.limelightcorp.net` request that arrived as plain http. It detects this from `x-forwarded-proto: http` or Cloudflare's `cf-visitor` `{"scheme":"http"}` (the tunnel does not send x-forwarded-proto). Deep links are kept. localhost is not affected.
- Not signed in → 302 to `/login` (the only other redirect).
- On the public domain the session cookie is `Domain=limelightcorp.net; Secure`, shared by every host.

### https on the office network
- Plain `http://192.168.0.210:3350` sends passwords, cookies and chats unencrypted over the office Wi-Fi. So every workspace port (3350 and the proxies 3341-3345) also answers **https** on the same port (`server/tls.mjs`): a TLS hello (first byte 0x16) goes to the https server, anything else to http. The tunnel (http to 127.0.0.1) and older Lighthouse.exe copies keep working unchanged.
- Name: **office.limelightcorp.net → 192.168.0.210**, a Cloudflare DNS record set to *DNS only* (grey cloud), so office traffic never passes through Cloudflare. Address on the office network: `https://office.limelightcorp.net:3350`.
- Certificate: Let's Encrypt, checked through Cloudflare DNS. The owner saves a Cloudflare API token (Zone → DNS → Edit, limelightcorp.net) in `Data\tls\cloudflare.token` and runs `tls\Get office certificate.bat` once; it creates the DNS record, gets the certificate into `Data\tls\` (`fullchain.pem`, `privkey.pem`) and adds a weekly renewal task. The server reloads a renewed certificate within 6 hours; the **first** certificate needs one workspace restart.
- No certificate files: http only, exactly as before.
- `lanHttpsOnly` (config.json, default false): office-network http visits get a 301 to `https://office.limelightcorp.net:<same port>`. 127.0.0.1 (the tunnel, this PC) is never redirected. Turn on once every office PC runs **Lighthouse.exe 1.4** (tries `https://office.limelightcorp.net:3350` first, then the old address, then online). Older copies would open the new name in the normal browser.
- If an office PC can't resolve office.limelightcorp.net (some routers drop public DNS answers that point to 192.168.x.x), add the name to the router's local DNS.

---

## 4. Standby and failover

| Service | Primary | Fallback | How |
|---|---|---|---|
| Edit | NAYA A (`editorUrl`) | NAYA B :3100 (`editorStandbyUrl`) | Workspace re-checks every 20 s |
| Limelight AI | NAYA B :8800 (`aiUrl`) | JASPREET 127.0.0.1:8800 (`aiLocalUrl`) | Same; the JASPREET copy must be running |
| AI on B vs standby editor | – | – | B's guard stops the AI while the standby editor holds 3100 |
| Design AI images | NAYA B | JASPREET local AI (generative fill) | Studio's `aiFetch` |
| Public links | JASPREET tunnel | none | JASPREET must be on and signed in |
| Workspace on office PCs | 192.168.0.210:3350 | www.limelightcorp.net | Lighthouse.exe 1.3 |

The editor's own standby script describes a line of standby PCs (JASPREET first, PC B second, helpers third). The workspace only knows NAYA A and NAYA B.

---

## 5. NAS (192.168.0.99)
| Path | What |
|---|---|
| `Z:\Limelight Storage\<email>\Office` | Each person's Office files (since 30 Oct). NAS off → old local folders |
| `Z:\Editor Projects\<id>` | A project folder per Edit team member (made by Edit) |
| `\\192.168.0.99\Team Editing\Limelight Apps\Limelight Workspace` | Lighthouse.exe update folder |
| `\\192.168.0.99\Team Editing\Limelight AI update\` | Older hand-off folder for NAYA B files |

- L: and Y: are also NAS drives.
- An empty `.dirtest` folder is left in `Z:\Limelight Storage`; delete it on the NAS itself.
- Design files, workspace chats and profile photos are still on JASPREET, not the NAS.

---

## 6. Deploy paths

| What | From | To | How | Who runs it |
|---|---|---|---|---|
| Workspace | `E:\Limelight Ai\limelight-workspace` (JASPREET) | runs in place | Edit files, then restart (stop port 3350, run `Limelight Workspace (start all).vbs`). Pages pick up new CSS/JS by themselves (version stamps) | Claude or owner |
| Office, Design | their folders on JASPREET | run in place | Restart their port (3300 / 3330) and `.vbs`; users reload (Ctrl+F5 for Studio) | Claude or owner |
| Edit | `D:\Video Editor Agent` (JASPREET) | NAYA B trial, then NAYA A `D:\Limelight Release\editor` | `tools\server\Deploy to server.bat` (tests → smoke trial on B → A takes it within about 15 s when idle). Run from PowerShell, never kill the editor | **Owner** |
| Limelight AI | `limelight-ai\deploy-naya-b\` | NAYA B `D:\LimelightAI\app` | `.bat` files over SSH (backups `*.bak-<time>`, log `deploy-log.txt`) | **Owner** |
| Lighthouse.exe | `browser\` | NAS update folder; other PCs self-update | `build.cmd`, copy `browser\app` | Owner or Claude |
| Tunnel / DNS | – | Cloudflare | `publish\Publish Lighthouse online.bat` | **Owner** |

---

## 7. Server rules (short; full list in [RULES.md](RULES.md))
1. Never install or run Ollama or any AI model on NAYA A.
2. AI lives on NAYA B; check B's helper and standby state first; if B is the standby editor, the AI stays stopped.
3. NAYA B stays off render-helper duty; JASPREET is the render helper.
4. The AI engine (llama.cpp, and Ollama while it is still there) on B listens on 127.0.0.1 only; no `OLLAMA_HOST=0.0.0.0`, no "Ollama LAN" rule.
5. Anything public must sit behind a password or the workspace login.
6. One login only; apps trust the workspace through shared keys.
7. NAYA B has no internet: download on JASPREET, copy over, `pip --no-deps`.
8. Write files as UTF-8 through Python or .NET, not PowerShell `Set-Content`.

## 8. Open items (servers)
See [PENDING.md](PENDING.md). Main ones: NAYA A health after the 29 Oct outage; JASPREET's local AI start-up task; firewall rule for 3443/3444; confirm Ollama LAN exposure removed on B; confirm old quick tunnels (`*.trycloudflare.com`, "LimelightTunnel") are stopped; reserve .210/.200/.205 on the router; survey the other PCs; backups of JASPREET's data.

Not confirmed: the editor's own README names `editor.limelightcorp.in` as its office link, while the tunnel serves `editor.limelightcorp.net`. Which one staff use was not checked.
