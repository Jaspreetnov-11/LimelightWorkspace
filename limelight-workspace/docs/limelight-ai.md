# Limelight AI

Limelight AI is the team's own private AI app for chat, office work, coding and pictures. It runs only on office PCs with local open-source models and **no cloud API**, because the company's work is confidential.

| | |
|---|---|
| Code (development copy) | `E:\Limelight Ai\limelight-ai` on JASPREET |
| Live server | **NAYA B** (192.168.0.205), port **8800**, app folder `D:\LimelightAI\app` |
| Fallback | JASPREET `127.0.0.1:8800` (must be started by hand) |
| Inside the workspace | proxy **3344**, `lh-ai.limelightcorp.net` |
| Public link of its own | https://ai.limelightcorp.net (tunnel on JASPREET → NAYA B:8800) |

---

## 1. What users can do

### Modes
Visible names changed on 29 Oct (the old ones looked like a copy of Claude). Internal keys stayed, so old chats still open.
| Name | Key | What it does |
|---|---|---|
| **Ask** | `chat` | Chat in Hindi, English or Hinglish; attach PDF, Word, Excel, PPT and photos; make and edit pictures and add text to them inside the chat |
| **Work** | `cowork` | Office agent inside a workspace folder: reads documents, writes .docx and .xlsx, makes images, keeps a task list |
| **Build** | `code` | Coding agent: reads/edits files, runs commands and tests, follows `LIMELIGHT.md` |
| **Images** | `images` | Image studio and gallery (Fast and High quality) |
| **Video** | `video` | "Video Studio" tab. **The engine has never produced a clip** |

- Agent tools: read, write, edit, glob, grep, shell, docx/xlsx, todo list, image tools. Permission modes: Ask first, Auto-accept edits, Full auto (Allow/Deny cards). Only files inside the given folder can be touched.
- Slash commands `/init`, `/review`, `/compact`, `/clear`, `/image`, `/help`; history, Stop, "Think" toggle; up to 40 agent steps.
- **Language rule:** the reply matches the user's language (English → English, Hindi → Devanagari, Hinglish → Roman Hinglish).
- Answer rules: no invented facts or numbers; no LaTeX; the model's thinking is never shown.
- Voice typing with local Whisper.
- `/compare.html`: a blind comparison of local models against Claude on 10 non-confidential prompts.

### Model picker (raw names hidden)
| Picker name | Model | Used for | Speed on NAYA B |
|---|---|---|---|
| Auto (default) | chosen by the server | photo → vision model; Build → coder model; else the mode's model | – |
| Fastest | `qwen3:8b` | **Ask default** (since 29 Oct) | about 107-111 tok/s |
| Deep thinking | `gpt-oss:20b` | **Work default**, hard questions | 72-77 tok/s with a clean GPU; about 19 tok/s when desktop apps hold VRAM |
| Best for code | `qwen3-coder:30b` | Build | about 57 tok/s |
| Best for photos | `qwen2.5vl:7b` | reading photos | about 103 tok/s |
| (hidden) | `nomic-embed-text` | future document search | – |

Model stays loaded 60 minutes; context 16384 tokens.

### Pictures
| Preset | Model | Speed (NAYA B, warm) |
|---|---|---|
| Fast | SDXL Turbo, 512 px | about 10 s |
| Quality (default in chat) | Qwen-Image (Q4_K_S GGUF + Lightning 8-step LoRA) | about 41 s (first load about 2 min) |
| Edit | Qwen-Image-Edit-2509 | about 64 s (first load about 2.5 min) |
| Hindi/English text on pictures | HTML rendered in headless Edge (`server/overlay.py`) | about 2-3 s |

- Qwen runs only on cards with at least 11 GB (NAYA B). JASPREET (8 GB) uses SDXL Turbo and SDXL Base.
- **SDXL Inpainting 0.1** on JASPREET's copy serves Design's generative fill (`/api/images/inpaint`).
- No local model writes Hindi inside a picture, so text is a separate layer drawn by Edge.

### Look
- Locked: "Limelight" theme, Aurora background, Inter font (stored offline), logo style 29 "Glass Dot". No theme or logo pickers (the owner said "no more options").
- Profile menu: Edit name, Settings, Log out. Mobile layout with a pinned typing box.

---

## 2. How it works with the workspace

### Sign-in (no visible login)
- The workspace proxy (3344) sends `x-lh-user` (email), `x-lh-admin` (1/0) and `x-lh-key` (the value of `Data/ai.key`) on every request (`aiAs()` in `server/areas/ai.mjs`).
- On NAYA B, `D:\LimelightAI\app\data\workspace.key` holds the same value. If it matches (`hmac.compare_digest`), the request passes without the password and `who()` knows the person.
- **Per-person chats** (live since 30 Oct 19:44): each conversation has an `owner`. Staff see only their own chats. Admins and owners also see the older shared chats that have no owner.
- The proxy also writes the signed-in person's name into localStorage `ll_name`, so the AI shows the right name in its corner.
- **Office AI password (older way, still in the code):** an admin can type the AI's own password once in the account menu ("Limelight AI" field, `POST /api/settings/ai`). It is saved as `aiPassword` in `config.json`, sent to Studio too, and used to get an `ll_token` cookie for each person. Only admins see this box. **Where the code differs from the notes:** the workspace notes call the key method "planned / partly built"; the code sends the key on every request and NAYA B accepts it since 30 Oct, so the password is no longer needed inside the workspace. The box is still shown (removing it is pending).
- Design's generative fill uses the same office key (`x-lh-user: studio`).

### Failover
- `aiUrl` NAYA B `http://192.168.0.205:8800` first, `aiLocalUrl` `http://127.0.0.1:8800` on JASPREET second; re-checked every 20 s.
- NAYA B **pauses the AI** while its standby editor holds port 3100 (standby guard, within about 10 s). Then the JASPREET copy is used - but only if someone started it.

### Tech stack (in `limelight-ai`)
| Part | Detail |
|---|---|
| Frontend `web/` | Plain HTML/CSS/JS (`index.html`, `app.js`, `markdown.js`, `style.css`, `themes.css`), no CDN |
| Backend `server/` | Python FastAPI + Uvicorn, SSE streaming. `app.py` (routes, auth, `who()`), `agent.py`, `tools.py`, `images.py` (GPU lock), `overlay.py`, `video.py` (not working), `db.py`, `config.py` |
| Data | `data/limelight.db` (chats), `data/images/`, `data/uploads/`, `data/videos/` |
| Engine | Ollama on `127.0.0.1:11434` only |
| GPU sharing | One GPU job at a time; picture models unloaded before every LLM step; LLMs unloaded before a picture job |

Settings are environment variables: `LIMELIGHT_CHAT_MODEL`, `LIMELIGHT_AGENT_MODEL`, `LIMELIGHT_CODE_MODEL`, `LIMELIGHT_VISION_MODEL`, `LIMELIGHT_FAST_MODEL`, `LIMELIGHT_EMBED_MODEL`, `LIMELIGHT_NUM_CTX`, `LIMELIGHT_KEEP_ALIVE`, `LIMELIGHT_MAX_STEPS`, `LIMELIGHT_HOST`, `LIMELIGHT_PORT`, `LIMELIGHT_PASSWORD`, `LIMELIGHT_WORKSPACE`, `LIMELIGHT_MODELS_DIR`, `LIMELIGHT_IMAGE_FAST`, `LIMELIGHT_IMAGE_QUALITY`, `LIMELIGHT_VIDEO_MODEL`, `LIMELIGHT_DATA`.

### Starting it
**NAYA B (live):**
- Scheduled task "Limelight AI" runs at sign-in, hidden: `ai.vbs` → `run-ai.ps1` loop (starts Ollama and the app, restarts them if they crash). Logs: `D:\LimelightAI\ai.log`, `app.log`, `ollama.log`.
- The password is in `D:\LimelightAI\password.txt` and is read only when the loop starts. The chat model (`LIMELIGHT_CHAT_MODEL=qwen3:8b`) is set in `run-ai.ps1`.
- `schtasks /end` does **not** stop the hidden loop. Clean restart: kill processes whose command line contains `run-ai.ps1` or `LimelightAI\app\server\app.py`, plus `ollama` and `llama-server`, then `schtasks /run /tn "Limelight AI"`.

**JASPREET (development and fallback):**
- `cd "E:\Limelight Ai\limelight-ai"; .\start.ps1` (sets `OLLAMA_MODELS=D:\AI Models\ollama\models`, starts Ollama). LAN: `.\start.ps1 -Lan -Password "…"`.
- Test instance on port 8811 (`E:\Limelight Ai\.claude\launch.json`, open http://127.0.0.1:8811).
- **It does not start by itself after a reboot.**

### Deploying to NAYA B
NAYA B has **no internet**, and SMB to it fails. Reachable from JASPREET: SSH 22, RDP 3389, 8800.
| Script (`limelight-ai\deploy-naya-b\`) | Job |
|---|---|
| `Deploy to NAYA B.ps1` / `Per-person AI chats (run once).bat` | Push `app.py`, `db.py` and `workspace.key`; back up B's files and database as `*.bak-<time>`; restart; log to `deploy-log.txt` |
| `AI without password (run once).bat` | Push the office-key version of `app.py` |
| `Restart AI on NAYA B.bat` | Restart the app and check the key |

- They use the SSH alias `limelight-b` (`ssh -o BatchMode=yes limelight-b "powershell -NoProfile -Command -"`). **The owner runs them** (Claude's SSH kill commands were blocked).
- Older way: copy files to `\\192.168.0.99\Team Editing\Limelight AI update\`, then `robocopy` on B.
- Models and Python wheels: download on JASPREET, copy to B, install with `pip --no-deps` (otherwise a CPU-only torch replaces CUDA torch).
- Change the `?v=` number in `index.html` whenever CSS or JS changes (Cloudflare caches 4 hours).
- **Code drift resolved 31 Oct:** B now runs the same `server\*.py` and `web\` files as JASPREET (video routes, inpaint, faulthandler `data\crash.log`, office-key login `_key_ok` merged back into the E: copy). `deploy-naya-b\app.py` and `app-office-key.py` were replaced with the same file, so re-running the old .bat files no longer downgrades B. B-only setting kept in `run-ai.ps1`: `LIMELIGHT_WARM_FILL=0` (no SDXL fill model preloaded at start). Backup of B's code before the update: `D:\LimelightAI\app-backup-20261031-0218`. Video tab shows "Video model not downloaded yet" on B (Wan not copied).

## 3. Decisions and why
- **Local only, no cloud API** (client data is confidential). No Ollama `:cloud` models or telemetry tools.
- **Server on NAYA B, never NAYA A** (NAYA A is the live editor).
- **NAYA B taken off render-helper duty** (28 Oct): renders and Whisper competed for VRAM. Undo: `Enable-ScheduledTask 'Limelight Helper'`.
- **Default models:** gpt-oss:20b first; on 29 Oct the owner chose qwen3:8b for Ask (about 1.5× faster) and kept gpt-oss:20b for Work. qwen3:30b-a3b tested and removed from B; qwen3:14b declined for now.
- **Qwen-Image for quality, SDXL Turbo for fast**; FLUX skipped (gated files).
- **Hindi text drawn by Edge**, not by the image model.
- **No more UI options.**
- **Kimi K3 not usable locally** (needs 4× H100 and about 1 TB RAM); a paid cloud option was offered and not chosen.
- **Not splitting one model across PCs** (3-10 tok/s on 1 Gbps; fails if one PC drops).
- **Video:** Wan 2.2 TI2V-5B tried on JASPREET and stopped by the owner on 30 Oct; files kept.
- **Public access always behind a password or the workspace login**, because Work and Build can run commands on B.

## 4. Fixes worth knowing
- "hello" took 60 s → preload at start, keep 60 min, warm on picker change, light `/api/status`: 2.2 s.
- Garbled characters after a PowerShell edit → always write files as UTF-8 through Python or .NET.
- Ollama showed no models (a C: junction it cannot follow) → `OLLAMA_MODELS` points straight at D:.
- High-quality SDXL took 580 s on B → full GPU on cards ≥ 11 GB: 11 s.
- gpt-oss at 19.7 tok/s → unload idle picture models before every chat.
- Unlock screen still shown in the workspace (30 Oct) → fixed `/api/auth`; owner ran the deploy.
- `/image prompt` did nothing → fixed; `/image` now makes the picture inside the chat (Cloudflare's 100 s limit broke the Images page on first load).
- (Full list in `docs/_notes/limelight-ai.md`.)

## 5. Known issues / pending
- Remove the AI password box from the workspace account menu now that NAYA B accepts the key (code).
- **Fixed 31 Oct:** "cannot generate image". The picture was made on B, but the chat stream sent nothing while it ran (cold Qwen load + render = 150-200 s; the picture model is dropped before every chat step, so most chat pictures are cold). Cloudflare cuts a silent stream after 100 s, so users on `*.limelightcorp.net` got an error. `agent.py` now sends a keep-alive (`: ping` SSE comment) every 15 s while any tool runs. Still open: the Images page (`/api/images/generate`, one plain request) can still time out behind Cloudflare on a cold load.
- The AI footer showed a fixed owner name outside the workspace (inside the workspace the proxy now sets the right name; the frontend itself is not fixed).
- Video: no working clip; B's `app.py` has no video routes.
- JASPREET's local AI and Ollama do not auto-start (needs a startup task or a decision to drop the fallback).
- Confirm the "Ollama LAN" firewall rule and `OLLAMA_HOST=0.0.0.0` are really gone on B.
- The password copy on JASPREET did not match B's file at last check.
- Vision model sometimes answers Hinglish questions in English.
- Not built (proposed): document search over folders/NAS, skill playbooks, memory across chats, calculator/date tools.
- Bigger model (gpt-oss-120b) needs more RAM or new hardware; no decision.
