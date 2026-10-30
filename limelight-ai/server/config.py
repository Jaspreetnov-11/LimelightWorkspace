"""Limelight AI configuration. Everything runs on this machine; nothing is sent to any cloud API."""
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# All model engines live on D: (Ollama models are set via OLLAMA_MODELS; image/voice models via HF_HOME).
MODELS_DIR = Path(os.environ.get("LIMELIGHT_MODELS_DIR", r"D:\AI Models"))
os.environ.setdefault("HF_HOME", str(MODELS_DIR / "huggingface"))  # Limelight only; other tools keep their own cache
os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")
if (MODELS_DIR / "huggingface" / "hub" / "models--stabilityai--sdxl-turbo").exists():
    os.environ.setdefault("HF_HUB_OFFLINE", "1")  # already downloaded: never contact the internet
DATA_DIR = Path(os.environ.get("LIMELIGHT_DATA", ROOT / "data"))
IMAGES_DIR = DATA_DIR / "images"
UPLOADS_DIR = DATA_DIR / "uploads"
VIDEOS_DIR = DATA_DIR / "videos"
DEFAULT_WORKSPACE = Path(os.environ.get("LIMELIGHT_WORKSPACE", ROOT / "workspace"))
DB_PATH = DATA_DIR / "limelight.db"
WEB_DIR = ROOT / "web"

for d in (DATA_DIR, IMAGES_DIR, UPLOADS_DIR, VIDEOS_DIR, DEFAULT_WORKSPACE):
    d.mkdir(parents=True, exist_ok=True)

# Local LLM runtime (Ollama). Keep it on localhost so prompts never leave the machine.
OLLAMA_URL = os.environ.get("LIMELIGHT_OLLAMA_URL", "http://127.0.0.1:11434")
DEFAULT_CHAT_MODEL = os.environ.get("LIMELIGHT_CHAT_MODEL", "gpt-oss:20b")
DEFAULT_AGENT_MODEL = os.environ.get("LIMELIGHT_AGENT_MODEL", "gpt-oss:20b")      # Cowork
DEFAULT_CODE_MODEL = os.environ.get("LIMELIGHT_CODE_MODEL", "qwen3-coder:30b")     # Code mode
VISION_MODEL = os.environ.get("LIMELIGHT_VISION_MODEL", "qwen2.5vl:7b")            # used when images are attached
FAST_MODEL = os.environ.get("LIMELIGHT_FAST_MODEL", "qwen3:8b")                    # "Fastest" in the model picker
EMBED_MODEL = os.environ.get("LIMELIGHT_EMBED_MODEL", "nomic-embed-text")          # for document search
NUM_CTX = int(os.environ.get("LIMELIGHT_NUM_CTX", "16384"))
# How long a model stays in memory after use. Reloading gpt-oss:20b from disk costs 10-40s.
KEEP_ALIVE = os.environ.get("LIMELIGHT_KEEP_ALIVE", "60m")
MAX_AGENT_STEPS =int(os.environ.get("LIMELIGHT_MAX_STEPS", "40"))

# Optional password. When set, the web UI asks for it (useful when sharing on office LAN).
PASSWORD = os.environ.get("LIMELIGHT_PASSWORD", "")
HOST = os.environ.get("LIMELIGHT_HOST", "127.0.0.1")
PORT = int(os.environ.get("LIMELIGHT_PORT", "8800"))

# Image models are downloaded once from Hugging Face, then used fully offline.
IMAGE_PRESETS = {
    "fast": {
        "model": os.environ.get("LIMELIGHT_IMAGE_FAST", "stabilityai/sdxl-turbo"),
        "steps": 4, "guidance": 0.0, "width": 512, "height": 512,
    },
    "quality": {
        "model": os.environ.get("LIMELIGHT_IMAGE_QUALITY", "stabilityai/stable-diffusion-xl-base-1.0"),
        "steps": 30, "guidance": 7.0, "width": 1024, "height": 1024,
    },
}

# Qwen-Image family (Apache-2.0, no Hugging Face login): one text encoder + VAE shared by the generator and the
# editor, Q4 GGUF transformers that fit a 12 GB card with offload, and 8-step Lightning LoRAs. When these files are
# in the HF cache, "quality" uses Qwen-Image instead of SDXL and editing is switched on.
QWEN = {
    "repo": "Qwen/Qwen-Image",
    "edit_repo": "Qwen/Qwen-Image-Edit-2509",
    "gguf": ("QuantStack/Qwen-Image-GGUF", "Qwen_Image-Q4_K_S.gguf"),
    "edit_gguf": ("QuantStack/Qwen-Image-Edit-2509-GGUF", "Qwen-Image-Edit-2509-Q4_K_S.gguf"),
    "lora": ("lightx2v/Qwen-Image-Lightning", "Qwen-Image-Lightning-8steps-V2.0-bf16.safetensors"),
    "edit_lora": ("lightx2v/Qwen-Image-Lightning",
                  "Qwen-Image-Edit-2509/Qwen-Image-Edit-2509-Lightning-8steps-V1.0-bf16.safetensors"),
    "steps": 8,
}
# Picture shapes the chat can ask for (Qwen sizes; SDXL Turbo uses half).
ASPECTS = {"square": (1024, 1024), "portrait": (896, 1152), "landscape": (1152, 896),
           "story": (720, 1280), "wide": (1280, 720)}

# Video: Wan 2.2 TI2V-5B makes text->video and photo->video clips (24 fps). Downloaded once, then offline.
# Sizes are multiples of 32. "draft" fits 8 GB cards with CPU offload; "standard" is for 12 GB+ (NAYA B).
VIDEO = {
    "repo": os.environ.get("LIMELIGHT_VIDEO_MODEL", "Wan-AI/Wan2.2-TI2V-5B-Diffusers"),
    "fps": 24,
    "presets": {
        "draft":    {"steps": 25, "sizes": {"landscape": (832, 480), "portrait": (480, 832), "square": (640, 640)}},
        "standard": {"steps": 40, "sizes": {"landscape": (1280, 704), "portrait": (704, 1280), "square": (960, 960)}},
    },
    "max_seconds": 5,
}
