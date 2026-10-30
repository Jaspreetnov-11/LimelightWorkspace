# Limelight AI: project notes

Limelight AI is the team's own private AI app for chat, office work, coding and pictures. It runs entirely on office PCs with
local open-source models and uses no cloud API. The owner wanted it because the company's work is confidential and should
not go to ChatGPT, Grok or Gemini. Inside the Limelight Workspace ("Lighthouse") it is the **AI** app.

- Code: `E:\Limelight Ai\limelight-ai` on JASPREET (the development copy).
- Live server: **NAYA B** (192.168.0.205), port **8800**, app folder `D:\LimelightAI\app`.
- Public link: **https://ai.limelightcorp.net** (Cloudflare tunnel running on JASPREET, pointing to NAYA B:8800).
- Inside Lighthouse it is proxied at `127.0.0.1:3344` (and `lh-ai.limelightcorp.net`).
- Servers, PCs, ports and tunnels are described in [servers.md](servers.md).

Sources: Claude Code sessions from 27–30 Oct 2026, the memory notes `ai-pc-speed-test.md`, `image-generation-gpt-style.md`
and `limelight-workspace.md`, the project README, and the current code. Times are IST unless marked.

---

## 1. What exists

### Modes
The visible names were changed on 29 Oct because the old ones looked like a copy of Claude. The internal keys are unchanged,
so old chats still open.

| Visible name | Internal key | What it does |
|---|---|---|
| **Ask** | `chat` | Normal chat in Hindi, English or Hinglish. You can attach PDF, Word, Excel, PPT and photos. It can make, edit and add text to pictures from inside the chat. |
| **Work** | `cowork` | Office agent working inside a workspace folder: reads documents, writes .docx reports and .xlsx sheets, makes images, keeps a task list. |
| **Build** | `code` | Coding agent like Claude Code: reads and edits files, runs commands and tests, fixes errors, follows `LIMELIGHT.md` project memory. |
| **Images** | `images` | Image studio and gallery: Fast and High quality presets. |
| **Video** | `video` | "Video Studio" tab (text→video, photo→video). **The engine has never produced a clip.** Wan is stopped; see Pending. |

### Agent features (Claude Code style)
- Tools: read, write and edit files, glob, grep, shell commands, docx/xlsx creation, todo list, image tools.
- Permission modes: **Ask first**, **Auto-accept edits**, **Full auto**, with Allow/Deny cards. Auto-edit still asks before shell commands.
- The agent can only touch files inside the workspace folder it is given (outside paths are blocked, which was tested).
- Slash commands `/init`, `/review`, `/compact`, `/clear`, `/image`, `/help`. Saved history, Stop button, "Think" toggle.
- Task panel and file browser (the Files button is hidden on phones).
- Max agent steps 40 (`LIMELIGHT_MAX_STEPS`).

### Language rule
The reply matches the user's language: English gets English, Hindi gets Devanagari Hindi, Hinglish gets Roman Hinglish.
The app detects the language of each message (`HINGLISH_WORDS`, `LANG_RULES` in the agent) and tells the model. "the" was
removed from the Hindi word list because it caused false Hinglish matches.

### Answer-quality rules added to the system prompt
- Do not invent facts or numbers; say so when unsure. This reduces made-up facts but does not stop them.
- No LaTeX for maths: write `434 × 0.4 = 173.6`. Old LaTeX answers are cleaned by `delatex` in `web/markdown.js`.
- The model's thinking ("Thought process", "Need to respond in English…") is never shown, in new or old chats. While the model thinks, only a blinking cursor shows.
- The "Loading the model into memory…" note was removed on 28 Oct.

### Models and the model picker
The picker hides raw model names (decided 28 Oct). The default is **Auto**, where the server picks per message: photo
attached → vision model, Build mode → coder model, otherwise the mode's text model. Embedding models are hidden.

| Picker name | Model | Used for | Speed on NAYA B |
|---|---|---|---|
| Auto (default) | resolved by the server | everything | – |
| **Fastest** | `qwen3:8b` | **Ask (chat) default since 29 Oct** | ~107–111 tok/s |
| **Deep thinking** (was "Best for text") | `gpt-oss:20b` | **Work (cowork) default**, hard questions | 72–77 tok/s when it fits; ~19 tok/s when the GPU is crowded (see Decisions) |
| **Best for code** | `qwen3-coder:30b` | Build mode | ~57 tok/s |
| **Best for photos** | `qwen2.5vl:7b` | reading attached photos and screenshots | ~103 tok/s |
| (hidden) | `nomic-embed-text` | future document search; not used yet | – |
| Voice typing (mic) | Whisper small (faster-whisper, CPU) | speech to text, local | – |

- The model stays loaded for 60 minutes (`KEEP_ALIVE=60m`) and is warmed up when the server starts or the picker changes.
- Context is 16384 tokens (`LIMELIGHT_NUM_CTX`).
- The chat model is set by the `run-ai.ps1` loop on NAYA B (`LIMELIGHT_CHAT_MODEL=qwen3:8b`). Changing it needs the loop restarted (`Start-ScheduledTask "Limelight AI"`), not just the app. A backup of the old script is `run-ai.ps1.bak-model`.
- The JASPREET copy still has `qwen3:30b-a3b` in `D:\AI Models` (the owner asked to keep it there); it was removed from NAYA B.

### Pictures ("GPT-style" images, built 28–29 Oct)
The owner asked for all 4 steps:

1. **Pictures from chat.** Ask mode has the tools `generate_image`, `edit_image` and `add_text_to_image`. The text model writes the detailed English prompt itself from a short Hinglish request.
   - Chat always uses the quality preset unless the user says fast, jaldi or draft.
   - It removes any `path` argument (pictures go to the gallery only) and edits the latest `/images/img_*.png` in that chat by default.
   - If a photo is attached together with edit words ("isko peela kar do"), the photo is saved to the gallery and edited instead of being sent to the vision model.
   - After picture tools the chat ends with a fixed short line instead of loading the LLM again, unless text on the picture was asked for and not yet added.
   - Shapes: square 1024², portrait 896×1152, landscape 1152×896, story 720×1280, wide 1280×720.
2. **Better quality model: Qwen-Image.** It uses the Q4_K_S GGUF transformer with the Lightning 8-step LoRA. Apache-2.0, no Hugging Face login needed.
3. **Edit by talking: Qwen-Image-Edit-2509.** Q4_K_S with its own Lightning 8-step LoRA. It changes only what is asked; face, pose and objects stay the same.
4. **Hindi and English text on pictures.** `server/overlay.py` renders HTML in **headless Edge**, because Pillow on these PCs cannot shape Devanagari (no raqm). Matras and conjuncts come out correct. Fonts are in `web/fonts/hindi`: Mukta (bold/regular), Rozha One (display), Yatra One (playful), all OFL. Takes about 2–3 s.

| Preset | Model | Speed (NAYA B, warm) |
|---|---|---|
| Fast | SDXL Turbo, 512 px | ~10 s |
| Quality (default) | Qwen-Image | ~41 s (first load ~2 min) |
| Edit | Qwen-Image-Edit-2509 | ~64 s (first load ~2.5 min) |
| Text overlay | Edge HTML render | ~2–3 s |

- Qwen is used only on cards with at least 11 GB VRAM, so only on NAYA B. JASPREET (8 GB) uses SDXL Turbo and SDXL Base 1.0 for quality.
- Peak VRAM is about 10.3 GB. The shared Qwen2.5-VL text encoder is 4-bit (bitsandbytes nf4) and stays on the GPU. The transformer is group-offloaded block by block **without** CUDA streams (streams ran out of memory on 12 GB).
- FLUX was skipped because its VAE and text encoder are gated on Hugging Face.
- SDXL Inpainting 0.1 is available on JASPREET's local copy for Limelight Studio's generative fill (`/api/images/inpaint`).
- Known limit: no local model writes Hindi inside a picture, which is why the text is added as a separate layer.

### Logins and per-person chats
- **Own password (LAN/public).** The password lives in `D:\LimelightAI\password.txt` on NAYA B. It is read only when the `run-ai.ps1` loop starts. An empty file means no password. A login is remembered on a device for 30 days. There is a **Log out** button at the bottom of the profile menu, added 28 Oct; it only shows when a password is set.
- **Login screen** (28 Oct) uses the same theme: Aurora background, glass card, logo with "AI" pill, a password box with a show/hide eye, a yellow "Unlock →" button, and a shake plus "Wrong password, try again" on a wrong password.
- **Through Lighthouse (no password, one login).** The workspace proxy sends `x-lh-user` (email), `x-lh-admin` and `x-lh-key`. If the key matches `D:\LimelightAI\app\data\workspace.key` on B (copied from the workspace's `Data\ai.key`), the request passes without the password and `who()` identifies the person.
- **Per-person chats** (live 30 Oct 19:44). Each conversation has an `owner` column. Staff see only their own chats. Admins also see the 32 older chats that have no owner. Without the workspace headers it is the office's shared view, as before.
- Limelight Studio's generative fill uses the same office key.

### Look (final, 28 Oct)
- "Limelight" theme: ChatGPT-style sidebar (New chat, modes, Projects, collapsible Recents, profile at the bottom) and a ChatGPT-style composer (+, "Ask Limelight", Think pill, mic, round send button).
- **Aurora** background: blue glow at the top and soft magenta below. Font is Inter, stored inside the app so it works offline.
- Logo: the real Limelight wordmark (from `D:\LimelightWebapp\public\logo.png`, tagline cropped off into `logo-mark.png`) plus **style 29 "Glass Dot"**, a glass pill with a glowing yellow dot and "AI". It was made the default for every browser on 28 Oct.
- The profile shows the name plus a small light only: green when the engine is ready, red when it is off. "Ready" and "Local" were removed.
- **No theme or logo pickers in the UI.** The owner said "no more options" after trying 6 themes, 5 backgrounds and 30 logo styles. The profile menu has Edit name, Settings and Log out.
- **Settings** (replaced "Manage models"): default model for new chats, Think harder by default, Work/Build edit permission, default workspace folder, and a status line.
- **Mobile UI** (28 Oct): hamburger side menu, one-line top bar (menu, title, model, new chat), a typing box pinned to the bottom (no iPhone zoom), finger-size buttons, one-column suggestions, and "Add to Home Screen". In Work/Build the toolbar is one line: model, 📁 folder pop-out, permission.

### Side tools
- `/compare.html` is a blind side-by-side comparison of local models against Claude on 10 non-confidential prompts: press release, Hindi radio script, Hinglish captions, email, Excel formula, maths trick, Python, summary, Panchayati Raj facts, 7-day calendar. Answers are rated 1–5 stars and "Reveal names" shows which model wrote what. Files are in `compare/` (`prompts.json`, `claude.json`, `results.json`, `run_local.py`).

---

## 2. How it works

### Tech stack
- **Frontend** `web/`: plain HTML, CSS and vanilla JS (`index.html`, `app.js`, `markdown.js`, `style.css`, `themes.css`). No framework and no CDN, so it works fully offline.
- **Backend** `server/`: Python **FastAPI + Uvicorn**, SSE streaming (events token, tool_call, tool_result, notice, stats, done).
  - `app.py`: routes, auth middleware, `who()`, and a crash log in `data/crash.log` through faulthandler.
  - `agent.py`: tool loop, prompts, Auto model choice, image rules.
  - `tools.py`: tool functions and their schemas.
  - `images.py`: SDXL and Qwen pipelines, GPU lock.
  - `overlay.py`: Hindi text through Edge.
  - `video.py`: Wan pipeline (not working).
  - `db.py`: SQLite. `config.py`: settings.
- **Data**: `data/limelight.db` (SQLite chats), `data/images/`, `data/uploads/`, `data/videos/`. Deleting these erases everything.
- File libraries: pypdf, python-docx, openpyxl, python-pptx, faster-whisper. Images: diffusers 0.42.1, torch 2.11.0+cu128, gguf, bitsandbytes, peft, torchvision 0.26.0+cu128.
- **Ollama** 0.40.11 on `127.0.0.1:11434` only, so prompts never leave the PC.

### Main API routes
`/api/auth`, `/api/login`, `/api/logout`, `/api/status`, `/api/models/warm`, `/api/models/pull`, `/api/conversations` (CRUD,
`/chat`, `/clear`, `/stop`), `/api/approve`, `/api/upload`, `/api/transcribe`, `/api/compare`, `/api/files`, `/api/open-folder`,
`/api/images/generate`, `/api/images/inpaint` (with progress and cancel), `/api/images`, and `/api/videos` (jobs and gallery).
Static routes: `/images`, `/videos`, `/uploads`.

### GPU sharing (important on a 12 GB card)
- Only one GPU job runs at a time (`images._lock`).
- Before every LLM step the agent calls `images.unload()` (non-blocking), so a picture model never sits idle on the GPU. An idle SDXL pipe once cut gpt-oss from 72 to 19.7 tok/s.
- Before a picture job, `_unload_llms()` waits for running LLM replies (`llm_busy`) and unloads Ollama models.
- Chat never waits for an image job to finish unloading. While a picture is being made (40 s – 2 min), other people's chats wait and see "picture ban rahi hai…".

### Settings (environment variables)
`LIMELIGHT_CHAT_MODEL`, `LIMELIGHT_AGENT_MODEL`, `LIMELIGHT_CODE_MODEL`, `LIMELIGHT_VISION_MODEL`, `LIMELIGHT_FAST_MODEL`,
`LIMELIGHT_EMBED_MODEL`, `LIMELIGHT_NUM_CTX` (16384), `LIMELIGHT_KEEP_ALIVE` (60m), `LIMELIGHT_MAX_STEPS` (40),
`LIMELIGHT_HOST` (127.0.0.1; 0.0.0.0 for LAN), `LIMELIGHT_PORT` (8800), `LIMELIGHT_PASSWORD`, `LIMELIGHT_WORKSPACE`,
`LIMELIGHT_MODELS_DIR` (default `D:\AI Models`), `LIMELIGHT_IMAGE_FAST`, `LIMELIGHT_IMAGE_QUALITY`, `LIMELIGHT_VIDEO_MODEL`, `LIMELIGHT_DATA`.
`HF_HOME` is set to `<models dir>\huggingface`, and `HF_HUB_OFFLINE=1` once SDXL Turbo is downloaded.

### Where models live
| PC | Ollama models | Hugging Face models (SDXL, Qwen, Whisper, Wan) |
|---|---|---|
| JASPREET | `D:\AI Models\ollama\models` (set `OLLAMA_MODELS`; the old C: junction breaks Ollama 0.40.11) | `D:\AI Models\huggingface` |
| NAYA B | `D:\LimelightAI\ollama\models` (program in `D:\LimelightAI\ollama\prog`) | `D:\LimelightAI\models\huggingface` |

### How it is started

**NAYA B (live).**
- Scheduled task **"Limelight AI"** runs at sign-in, hidden: `ai.vbs` → `run-ai.ps1`, a loop that restarts things if they crash.
- The loop starts Ollama (127.0.0.1, B's model folder) and the app (`D:\LimelightAI\app`, venv built from offline wheels).
- **Standby guard:** when NAYA B's standby Video Editor opens port 3100, the AI stops within about 10 s. It comes back when 3100 closes.
- Logs: `D:\LimelightAI\ai.log`, `app.log`, `ollama.log`.
- Firewall rule "Limelight AI 8800" allows only 192.168.0.0/24.
- `schtasks /end` does **not** stop the hidden PowerShell loop. To restart cleanly, kill the processes whose command line contains `run-ai.ps1` or `LimelightAI\app\server\app.py`, plus `ollama` and `llama-server`, then run `schtasks /run /tn "Limelight AI"`. Killing only `app.py` makes the loop start it again within seconds, with the env it already had.

**JASPREET (dev and fallback).**
- `cd "E:\Limelight Ai\limelight-ai"; .\start.ps1`, or `.\start.ps1 -Lan -Password "..."` for LAN use (prints `http://<ip>:8800`).
- `start.ps1` sets `OLLAMA_MODELS=D:\AI Models\ollama\models` and starts Ollama if it is not running.
- A test instance on port 8811 is in `E:\Limelight Ai\.claude\launch.json` ("limelight-ai-test"). Open `http://127.0.0.1:8811`, not localhost.
- **It does not start by itself after a reboot.**

**First-time setup on a new PC.**
- `.\setup.ps1 -Images` creates the Python venv, installs Ollama and pulls `qwen3:8b`. `-Images` adds CUDA PyTorch (cu128, works on 50-series cards) and diffusers.
- Keep the project on a short path. A long path broke PyTorch and python-docx because of the 260-character limit.

### Deploying to NAYA B
NAYA B has **no internet** and SMB to it fails (error 53). Ports reachable from JASPREET are 22 (SSH), 3389 and 8800.
- **Models and packages:** download on JASPREET, then copy to B (≈1 Gbps, ~4–10 min per 20–40 GB). Install wheels on B with `pip --no-deps`; otherwise bitsandbytes or another dependency pulls in a CPU-only torch 2.14 and breaks CUDA. Wheel folders on B: `D:\LimelightAI\wheels`, `wheels-img`, `wheels-qwen`, `wheels-peft`, `wheels-tv`.
- **Code over SSH:** scripts in `limelight-ai\deploy-naya-b\` use the SSH alias `limelight-b` with JASPREET's key:
  - `Deploy to NAYA B.ps1` / `Per-person AI chats (run once).bat` push `app.py` and `db.py` plus `workspace.key`. They back up B's files and database as `*.bak-<time>`, restart the app and log to `deploy-log.txt`.
  - `AI without password (run once).bat` pushes the office-key version of `app.py`.
  - `Restart AI on NAYA B.bat` restarts the app and checks the key.
  - Claude's own SSH kill commands on B were blocked by the permission check, so the owner runs these .bat files.
- **Code through the NAS (older way):** put files in `\\192.168.0.99\Team Editing\Limelight AI update\` (Z:), then on B run `robocopy "\\192.168.0.99\Team Editing\Limelight AI update" "D:\LimelightAI\app\web" index.html app.js style.css`. Server files need a copy plus a restart.
- **Cache-busting:** Cloudflare tells phones to cache CSS and JS for 4 hours, so `index.html` loads `style.css?v=<version>`. **Change the `?v=` number whenever CSS or JS changes.** The server also sends `Cache-Control: no-cache` for non-API files.
- **Code drift warning:** B's `server\app.py` (= `deploy-naya-b\app.py`, ~390 lines) is older than `E:\...\server\app.py` (~509 lines, which has video and inpaint). Do not copy the E: file over B's blindly. Two Claude sessions once overwrote each other's web files on B, and the mode names had to be put back.

---

## 3. Decisions (and why)

- **Local only, no cloud API**, because client data is confidential. Avoid Ollama `:cloud` models and third-party agents that send telemetry. Comparison prompts against Claude used only non-confidential text.
- **Server on NAYA B, never NAYA A.** NAYA A is the live Video Editor server (renders, 4 workers, Whisper, NVENC). Any AI there would slow the team's editing. NAYA B has the same hardware. The owner's rule: **never install or run Ollama on NAYA A.**
- **NAYA B taken off helper duty** (28 Oct, owner's own idea). The "Limelight Helper" task is disabled because renders and Whisper compete for the 12 GB of VRAM; JASPREET stays the render helper. Standby and bridge keep running on B. Undo with `Enable-ScheduledTask 'Limelight Helper'`.
- **"Sab daal NAYA B mein"** (28 Oct): every model plus image generation goes on B.
- **Default models.**
  - gpt-oss:20b replaced qwen3:8b as the default on 27–28 Oct, because qwen3:8b's Hinglish was weak and it repeated lines.
  - Then on 29 Oct the owner chose **qwen3:8b for Ask** (about 1.5× faster) and kept **gpt-oss:20b for Work**.
  - `qwen3:30b-a3b` was tested and rejected (57 vs 73 tok/s, leaks English reasoning even with think off, eats B's RAM) and removed from B on the owner's OK.
  - qwen3:14b was declined for now.
- **gpt-oss:20b speed on B:** it is 13.1 GB and the card is 12 GB, so speed depends on free VRAM. 72–77 tok/s was measured with a clean GPU. ~19 tok/s was measured when desktop apps (Edge, Copilot, Creative Cloud) held ~3 GB. Keep B's desktop free of GPU-hungry apps.
- **Qwen-Image is the quality model and SDXL Turbo stays for "fast"**, because Qwen gives correct hands and faces, follows the prompt better and allows editing. FLUX was skipped (gated files).
- **Hindi text is drawn by Edge, not by the image model.** No local model writes Devanagari correctly.
- **No more UI options.** Look and logo are locked (Aurora + style 29). Mode names are Ask/Work/Build.
- **Kimi K3 is not usable locally** (28 Oct). It is 2.8T parameters and needs 4× H100 plus ~1 TB RAM at minimum. The small Kimi models are no better than the current set. If its quality is wanted, the only route is a paid API "cloud" option, which was offered and not chosen.
- **Hardware advice given (not decided):**
  - An i9-14900K / Z790 / 128 GB / RTX 5070 build quoted at about ₹5.18 lakh was judged poor value: same 12 GB GPU, the RAM is the most expensive part, 4 DDR5 sticks drop below 6000 MHz, and "Samsung 990 Gen5" does not exist (the Gen5 model is the 9100 Pro).
  - For about ₹6 lakh the options given were a Mac Studio with 96–256 GB unified memory, or a PC with 2× used RTX 3090 and 128 GB RAM. The suggested target model was gpt-oss-120b (needs 128 GB RAM).
  - No local model reaches Claude Opus 5.5.
- **Splitting one model across many PCs** (llama.cpp RPC, exo) was advised against: about 3–10 tok/s on 1 Gbps, and it fails if one PC goes down. The advice was to give each PC its own model behind a router, or to buy one bigger GPU.
- **Video generation:** none of the current models can make video. Wan 2.2 TI2V-5B was tried on JASPREET and **stopped by the owner on 30 Oct**. The files are kept.
- **Public access:** first a temporary quick tunnel, then the permanent `ai.limelightcorp.net`. MeshLink VPN (on NAYA A) was suggested as the safer route but not set up. Because Work and Build can run commands on B, a public link must always be behind a password or the Lighthouse login.

---

## 4. Fixes (problem → cause → fix)

| Date | Problem | Cause | Fix |
|---|---|---|---|
| 28 Oct | Model wrote 9,000+ tokens | repetition loop | protections added in the app |
| 28 Oct | First image crashed the app | newer diffusers removed a function | `images.py` updated |
| 28 Oct | gpt-oss gave empty answers | `run()` parameter named `images` hid the `images` module | import renamed |
| 28 Oct | Tool failed on bad arguments | model sent extra arguments | extra arguments are ignored |
| 28 Oct | "hello" took 60 s | model unloaded after 5 min / after images; `/api/status` imported torch (9.4 s) | preload at start, keep 60 min, warm on picker change, light status (0.2 s) → 2.2 s |
| 28 Oct | "Chinese" characters in the UI | PowerShell edit saved files in the wrong encoding | HTML rewritten; emojis replaced by line icons. **Always write files as UTF-8 (Python or .NET), not with PowerShell** |
| 28 Oct | Ollama showed no models | someone moved models to `D:\AI Models` and left a C: junction that Ollama cannot follow; the tray app never started the server | `OLLAMA_MODELS` points straight at D: |
| 28 Oct | Everything slow | D: and E: are one busy HDD (~7 MB/s while copying) | known limit; keep models on SSD where possible |
| 28 Oct | Chat stalled during an image job | chat waited to unload the image model | unload made non-blocking |
| 28 Oct | Compare page text in narrow columns | `.body` class clash with the app CSS | renamed |
| 28 Oct | High-quality SDXL took 580 s on B | SDXL was split CPU/GPU as for an 8 GB card | full GPU on cards ≥11 GB → 11 s |
| 28 Oct | CPU torch installed on B | pip picked torch 2.14 CPU from PyPI | reinstalled cu128 with `--no-deps` |
| 28 Oct | gpt-oss at 19.7 tok/s | idle SDXL pipe left on the GPU | `images.unload()` before every Ollama chat or warm-up |
| 28 Oct | Old logo for other users | logo choice was saved per browser; `logo-ai.png` did not exist | style 29 is the default in `index.html` |
| 28 Oct | Password not applied or removed | the loop reads the password only at start; a second hidden loop kept the old value | kill all `run-ai.ps1` and `app.py` processes, then `schtasks /run` |
| 28 Oct | Phone showed old CSS | Cloudflare 4-hour cache | `?v=` version on assets |
| 28 Oct | Work/Build toolbar took 3 lines on phone | big controls | one-line toolbar, folder pop-out |
| 28 Oct | Qwen "not ready" on B | `snapshot_download(local_files_only)` rejects repos fetched with allow_patterns | `_hf_file` reads `refs/main` itself |
| 28–29 Oct | Qwen out of memory / Ollama "CUDA error: shared object initialization failed" | CUDA streams; picture model and LLM loaded together | no streams; GPU turn-taking; unload the picture model before each LLM step |
| 28–29 Oct | Qwen LoRA and edit failed | `peft` and `torchvision` missing | installed (torchvision 0.26.0+cu128, `--no-deps`) |
| 29 Oct | `/image prompt` did nothing | Enter picked "/image" from the command list and dropped the prompt | list closes after a space. In Ask mode `/image` now makes the picture inside the chat, because the Images page timed out behind Cloudflare's 100 s limit on the first load |
| 29 Oct | Mode names reverted on B | another session copied older files to B | correct files redeployed |
| 30 Oct | Unlock screen still shown in Lighthouse | B's app process was still from 29 Oct, and `/api/auth` ignored the key | fixed `/api/auth`; owner ran the deploy .bat |
| 30 Oct | Old deploy scripts never stopped the app | `-match '\a..\s'` pattern never matched | scripts use `-like` |
| 30 Oct | Wan video crashed the server on JASPREET | NVIDIA driver reset (event 153): ~11 GB text encoder and ~10 GB transformer loaded onto an 8 GB card. (A thread-stack fix of 64 MB was tried first; 256 MB is rejected by Windows Python.) | group offloading added; later runs still died silently (exit 127); work stopped |

---

## 5. Pending / open

1. ~~Image generation reported failing on 29 Oct~~ **fixed 31 Oct** (silent chat stream cut by Cloudflare after 100 s; keep-alive added, see update log). Remaining: the Images page's plain `/api/images/generate` request can still hit the 100 s limit on a cold load when opened through `*.limelightcorp.net`.
2. **AI footer shows a fixed "Jaspreet Singh"** instead of the logged-in person (frontend not fixed yet).
3. **Video:** no working clip. Options are to finish Wan 2.2 TI2V-5B on NAYA B (12 GB) by copying the 34 GB model, the `naya-b-video\wheels-video` wheels (`--no-deps`) and the code, or to try LTX-Video. B's `app.py` has no video routes yet. Phase 3 (clips into the FFmpeg video editor) has not started.
4. **Not model-only features** (proposed 28 Oct, never chosen): office knowledge/RAG over folders and NAS using `nomic-embed-text`, Limelight skill playbooks (scripts, press releases, CBC justification), memory across chats, calculator/date tools with answer checking.
5. **JASPREET's local AI and Ollama** were started by hand on 29 Oct as a fallback and do not auto-start after a reboot.
6. **Raw Ollama on the LAN:** a firewall rule "Ollama LAN" (port 11434) and `OLLAMA_HOST=0.0.0.0` were set by hand on B on 28 Oct. The clean-up commands were given and the port was later found closed, but check that the rule and the `OLLAMA_HOST` user variable are really gone.
7. The password copy on JASPREET (`E:\Limelight Ai\NAYA-B AI password.txt`) did not match B's file at last check.
8. Vision model sometimes answers Hinglish questions in English.
9. Bigger model (gpt-oss-120b) needs a RAM or hardware upgrade; no decision yet.
10. A "Kimi K3 (cloud)" API option was offered and not chosen.

---

## 6. Update log

| Date (IST) | Change |
|---|---|
| 28 Oct ~01:50 | App built on JASPREET: Chat, Cowork, Code and Images modes, agent tools, approvals, LAN password mode. Tested with a fake model server. |
| 28 Oct ~02:30–03:15 | Ollama and qwen3:8b installed (44 tok/s); PyTorch CUDA and SDXL Turbo working offline; project moved to `E:\Limelight Ai\limelight-ai` (path length). gpt-oss-120b would not fit (65 GB vs 64 GB RAM); **gpt-oss:20b made the default**. |
| 28 Oct ~03:15–05:00 | Speed fix (60 s → 2.2 s); emojis → line icons; language matching; 6 themes → Limelight theme, Inter font, Aurora background; 30 logo options → locked. Ollama junction fixed; all engines on D:. Voice typing (local Whisper). |
| 28 Oct ~05:40–07:05 | Downloaded qwen3-coder:30b, qwen2.5vl:7b, nomic-embed-text, SDXL Base. Mode-based model choice; compare page; no-LaTeX and no-made-up-facts rules; thinking hidden. |
| 28 Oct ~06:00–06:55 | Real speed tests on 3 PCs; **NAYA B made the AI server** (helper off, standby guard, "Limelight AI" task, firewall 8800, LAN password). |
| 28 Oct ~07:10–07:40 | All models and image generation put on B; SDXL quality fix (580 s → 11 s); idle-pipe unload fix. |
| 28 Oct ~07:30–08:30 | Logo style 29 made the default; password removed, then restored; mobile UI; themed login screen; Auto model picker with friendly names; Settings dialog; qwen3:30b-a3b tested and removed from B. |
| 28 Oct ~08:30 | Temporary public quick tunnel (trycloudflare.com) run by the owner. |
| 28 Oct ~09:00 | **ai.limelightcorp.net** live (named tunnel `limelight-ai` on JASPREET). editor.limelightcorp.net added. |
| 28 Oct ~09:20–09:30 | Phone toolbar fix, `?v=` cache-busting, **Log out** button. |
| 28 Oct ~09:00 – 29 Oct ~06:30 | GPT-style pictures: chat image tools, Qwen-Image, Qwen-Image-Edit-2509, Hindi text through Edge; live on B and tested through chat. |
| 28 Oct ~10:20–19:50 | Kimi K3 and hardware purchase questions answered (no changes). |
| 29 Oct ~07:30 | Ask default → qwen3:8b; Work stays gpt-oss:20b; picker shows one row per model ("Deep thinking"); modes renamed **Ask / Work / Build**; redeployed after being overwritten. `/image` fix; Log out server part deployed on B. |
| 29 Oct ~08:40 | Video Studio tab and `video.py` (Wan 2.2 TI2V-5B, 34 GB) built and tested on JASPREET. |
| 29 Oct ~11:00 | NAYA A editor down → B became the standby editor → B's AI paused by the guard. Lighthouse falls back to JASPREET's local AI (127.0.0.1:8800), which Claude started by hand. |
| 29 Oct | Limelight AI added to the Lighthouse workspace (proxy 3344). The office AI password is set once by an admin in Lighthouse. Studio generative fill uses the local AI on JASPREET for SDXL inpainting. |
| 30 Oct ~19:00–20:00 | Wan crash debugging (driver reset on 8 GB); **Wan stopped on the owner's request**. |
| 30 Oct 19:44 | Owner ran "Per-person AI chats (run once).bat": office-key login (no password inside Lighthouse) plus per-person chats live on B. |
| 31 Oct ~02:22 | "Cannot generate image" root cause found: the chat stream was silent for 150-200 s while a cold Qwen picture was made (measured 190.9 s), and Cloudflare drops a stream after 100 s of silence. Fix: keep-alive `: ping` every 15 s while a tool runs (measured after: longest silence 15.6 s). B brought up to JASPREET's code (video + inpaint routes, faulthandler); `_key_ok` office-key login merged into the E: copy; `?v=20261031-video`; B's `run-ai.ps1` got `LIMELIGHT_WARM_FILL=0`. Backup `D:\LimelightAI\app-backup-20261031-0218`. Restarted via the "Limelight AI" task; health, chat, chat picture, Studio inpaint and the 3344 proxy (401 without session) checked. |
