# Limelight AI — private, offline AI for your own computer

Limelight AI runs completely on your machine. It uses **no cloud API**: prompts, files and images never leave the PC (or your office LAN if you turn that on).

| Mode | What it does |
|---|---|
| 💬 **Chat** | Normal AI chat (Hindi/English/Hinglish). You can attach PDF, Word, Excel and PPT files, and images (needs a vision model such as `gemma3`). |
| 🗂️ **Cowork** | The AI does office work inside your workspace folder: reads documents, makes reports (.docx), sheets (.xlsx) and images, and keeps a task list. |
| ⌨️ **Code** | A coding agent like Claude Code: reads code, edits files, runs commands and tests, fixes errors, follows `LIMELIGHT.md` project memory. |
| 🎨 **Images** | Local image generation with Stable Diffusion XL (Fast = SDXL Turbo, High quality = SDXL). |

Claude Code-style features you get: tool use (read/write/edit/glob/grep/shell), permission modes (ask / auto-edit / full auto) with Allow/Deny cards, a todo/task panel, a file browser, project memory (`LIMELIGHT.md`), slash commands (`/init`, `/review`, `/compact`, `/clear`, `/image`, `/help`), saved history, stop button, model switcher, and a "Think" toggle for reasoning models.

## Setup (one time)

```powershell
cd limelight-ai
.\setup.ps1 -Images
```

This creates a Python environment, installs Ollama (the local model engine), and downloads the `qwen3:8b` model (~5 GB). `-Images` also installs PyTorch with CUDA and diffusers. The first image you generate downloads the SDXL Turbo weights (~7 GB) once. After that everything works with the internet off.

## Start

```powershell
.\start.ps1
```

This opens http://127.0.0.1:8800.

For office LAN access (other PCs on the same network), use a password:

```powershell
.\start.ps1 -Lan -Password "your-strong-password"
```

## Recommended models (RTX 4060 8 GB)

| Model | Use |
|---|---|
| `gpt-oss:20b` | Default. Best on this PC: good Hinglish, reasoning and tool use, about 25 tok/s (half on CPU RAM). |
| `qwen3:8b` | Faster (about 44 tok/s, all on GPU) but weaker Hinglish |
| `gpt-oss:120b` | Needs 128 GB RAM on this PC (65 GB model). It won't run usefully with 64 GB. |
| `qwen2.5-coder:7b` | Code |
| `gemma3:12b` | Images/vision + good Hindi |
| `qwen3:14b` | Smarter but slower (some of it runs on CPU RAM) |

Download them from **Manage models** in the sidebar.

## Privacy notes

- Ollama is locked to `127.0.0.1`, so no other machine can reach it directly.
- Chats are stored in `data/limelight.db`, images in `data/images/`, uploads in `data/uploads/`. Delete these folders to erase everything.
- The agent can only touch files inside the workspace folder you give it.
- The internet is needed only for the first download of models.

## Settings (environment variables)

`LIMELIGHT_CHAT_MODEL`, `LIMELIGHT_AGENT_MODEL`, `LIMELIGHT_NUM_CTX` (default 16384), `LIMELIGHT_WORKSPACE`, `LIMELIGHT_PORT` (8800), `LIMELIGHT_IMAGE_FAST`, `LIMELIGHT_IMAGE_QUALITY`.

## Honest limits

Local 8B models are not as smart as cloud Claude/GPT. They handle chat, drafting, summaries and simple-to-medium coding and agent work well. For heavy work, use a bigger model (`qwen3:14b`/`32b`) or a bigger GPU later. The app stays the same; you only change the model.
