"""Local image generation on the GPU: SDXL Turbo (fast), Qwen-Image (quality) and Qwen-Image-Edit (edits), plus
text overlays (overlay.py)."""
import json
import math
import threading
import time
from pathlib import Path

from config import ASPECTS, IMAGE_PRESETS, IMAGES_DIR, QWEN

_lock = threading.Lock()
_pipe = None
_pipe_model = None
_qwen_shared = {}  # text encoder + VAE, kept while switching between the Qwen generator and editor


_gpu = None


def status():
    # find_spec avoids importing torch (~9s) just to answer a status check.
    import importlib.util
    global _gpu
    if not (importlib.util.find_spec("torch") and importlib.util.find_spec("diffusers")):
        return {"available": False, "reason": "Image packages not installed. Run setup.ps1 -Images"}
    _probe_gpu()
    import overlay
    return {"available": True, "cuda": bool(_gpu), "gpu": _gpu or None, "loaded": _pipe_model,
            "presets": IMAGE_PRESETS, "quality_model": "Qwen-Image" if qwen_ready("gen") else "SDXL",
            "edit": qwen_ready("edit"), "text": overlay.available()}


def _hf_file(repo, filename=None):
    """Path of a file (or the snapshot folder) already in the local HF cache, else None. Never downloads."""
    try:
        from huggingface_hub import constants, hf_hub_download
        if filename:
            return Path(hf_hub_download(repo, filename, local_files_only=True))
        # snapshot_download(local_files_only) refuses repos fetched with allow_patterns; read refs/main ourselves.
        folder = Path(constants.HF_HUB_CACHE) / ("models--" + repo.replace("/", "--"))
        snap = folder / "snapshots" / (folder / "refs" / "main").read_text().strip()
        return snap if snap.is_dir() else None
    except Exception:
        return None


_vram_gb = 0.0


def _probe_gpu():
    """GPU name and memory from nvidia-smi, once (importing torch just to ask would take ~9 s)."""
    global _gpu, _vram_gb
    if _gpu is None:
        try:
            import subprocess
            name, mem = subprocess.run(["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader,nounits"],
                                       capture_output=True, text=True, timeout=5).stdout.strip().splitlines()[0].rsplit(",", 1)
            _gpu, _vram_gb = name.strip(), float(mem) / 1024
        except Exception:
            _gpu = ""


def qwen_ready(kind="gen"):
    import importlib.util
    _probe_gpu()
    # 4-bit text encoder (~5.5 GB) + streamed transformer + 1 MP activations: needs a 12 GB card; 8 GB cards keep SDXL.
    if _vram_gb < 11 or not (importlib.util.find_spec("gguf") and importlib.util.find_spec("bitsandbytes")):
        return False
    base = _hf_file(QWEN["repo"])
    need = [QWEN["gguf" if kind == "gen" else "edit_gguf"], QWEN["lora" if kind == "gen" else "edit_lora"]]
    ok = bool(base) and (base / "text_encoder").is_dir() and (base / "vae").is_dir()
    if kind == "edit":
        ok = ok and bool(_hf_file(QWEN["edit_repo"]))
    return ok and all(_hf_file(*f) for f in need)


def unload():
    """Release the image (and video) model so the language model gets the whole GPU."""
    global _pipe, _pipe_model
    import video
    video.unload()
    if _pipe is None:
        return
    # Never make a chat wait for an image job: if one is running, leave the image model alone.
    if not _lock.acquire(blocking=False):
        return
    try:
        import gc
        import torch
        _pipe, _pipe_model = None, None
        _qwen_shared.clear()
        gc.collect()
        torch.cuda.empty_cache()
    finally:
        _lock.release()


# Chat replies streaming right now (agent.py counts them). The GPU can't hold a chat model and a picture model
# together, so a picture job waits for these to finish, and chats wait while _lock is held.
llm_busy = 0


def busy():
    return _lock.locked()


def _unload_llms():
    """Wait for running chat replies, then make the AI engine drop its models and confirm they are gone."""
    try:
        import llm
        for _ in range(240):  # a long reply can take a while; give up waiting after 2 minutes
            if llm_busy <= 0:
                break
            time.sleep(0.5)
        for _ in range(20):
            if llm.unload_all():
                break
            time.sleep(0.5)
    except Exception:
        pass


def _drop_pipe():
    global _pipe, _pipe_model, _inpaint
    if _pipe is not None:
        import gc
        import torch
        _pipe, _pipe_model, _inpaint = None, None, None
        gc.collect()
        torch.cuda.empty_cache()


def _load(model_id):
    global _pipe, _pipe_model
    _unload_llms()
    if _pipe_model == model_id:
        return _pipe
    import torch
    from diffusers import AutoPipelineForText2Image
    _drop_pipe()
    _qwen_shared.clear()
    cuda = torch.cuda.is_available()
    kw = {"torch_dtype": torch.float16, "variant": "fp16"} if cuda else {}
    try:
        pipe = AutoPipelineForText2Image.from_pretrained(model_id, use_safetensors=True, **kw)
    except Exception:
        pipe = AutoPipelineForText2Image.from_pretrained(model_id, **({"torch_dtype": torch.float16} if cuda else {}))
    if cuda:
        # 12 GB+ cards hold SDXL whole. 8 GB ones offload (one part on the GPU at a time): turbo whole is ~7 GB, which
        # with Windows' own ~2 GB spills into shared memory and runs ~10x slower.
        if torch.cuda.get_device_properties(0).total_memory >= 11 * 2**30:
            pipe.to("cuda")
        else:
            pipe.enable_model_cpu_offload()
        if hasattr(pipe.vae, "enable_slicing"):  # pipe.enable_vae_slicing() was removed in newer diffusers
            pipe.vae.enable_slicing()
    _pipe, _pipe_model = pipe, model_id
    return pipe


def _load_qwen(kind):
    """Qwen-Image ("gen") or Qwen-Image-Edit-2509 ("edit"). The 4-bit text encoder stays on the GPU; the Q4
    transformer (12 GB, bigger than the free VRAM) streams to the GPU block by block."""
    global _pipe, _pipe_model
    _unload_llms()
    key = "qwen-" + kind
    if _pipe_model == key:
        return _pipe
    _drop_pipe()
    import torch
    from diffusers import (AutoencoderKLQwenImage, FlowMatchEulerDiscreteScheduler, GGUFQuantizationConfig,
                           QwenImageEditPlusPipeline, QwenImagePipeline, QwenImageTransformer2DModel)
    from transformers import BitsAndBytesConfig, Qwen2_5_VLForConditionalGeneration
    base = _hf_file(QWEN["repo"])
    if "te" not in _qwen_shared:
        _qwen_shared["te"] = Qwen2_5_VLForConditionalGeneration.from_pretrained(
            base, subfolder="text_encoder", torch_dtype=torch.bfloat16, device_map={"": 0},
            quantization_config=BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4",
                                                   bnb_4bit_compute_dtype=torch.bfloat16))
        _qwen_shared["vae"] = AutoencoderKLQwenImage.from_pretrained(base, subfolder="vae",
                                                                    torch_dtype=torch.bfloat16).to("cuda")
    repo = base if kind == "gen" else _hf_file(QWEN["edit_repo"])
    transformer = QwenImageTransformer2DModel.from_single_file(
        str(_hf_file(*QWEN["gguf" if kind == "gen" else "edit_gguf"])), config=str(repo), subfolder="transformer",
        quantization_config=GGUFQuantizationConfig(compute_dtype=torch.bfloat16), torch_dtype=torch.bfloat16)
    # Lightning's own scheduler settings (from the LoRA's model card).
    scheduler = FlowMatchEulerDiscreteScheduler.from_config({
        "base_image_seq_len": 256, "base_shift": math.log(3), "invert_sigmas": False, "max_image_seq_len": 8192,
        "max_shift": math.log(3), "num_train_timesteps": 1000, "shift": 1.0, "shift_terminal": None,
        "stochastic_sampling": False, "time_shift_type": "exponential", "use_beta_sigmas": False,
        "use_dynamic_shifting": True, "use_exponential_sigmas": False, "use_karras_sigmas": False})
    cls = QwenImagePipeline if kind == "gen" else QwenImageEditPlusPipeline
    pipe = cls.from_pretrained(repo, transformer=transformer, text_encoder=_qwen_shared["te"],
                               vae=_qwen_shared["vae"], scheduler=scheduler, torch_dtype=torch.bfloat16)
    lora = _hf_file(*QWEN["lora" if kind == "gen" else "edit_lora"])
    pipe.load_lora_weights(str(lora.parent), weight_name=lora.name)
    pipe.transformer.enable_group_offload(onload_device=torch.device("cuda"), offload_device=torch.device("cpu"),
                                          offload_type="block_level", num_blocks_per_group=1)  # streams: OOM on 12 GB
    _pipe, _pipe_model = pipe, key
    return pipe


def _size(aspect, fast):
    w, h = ASPECTS.get(aspect or "square", ASPECTS["square"])
    return (w // 128 * 64, h // 128 * 64) if fast else (w, h)


def _save(img, **meta):
    name = f"img_{int(time.time() * 1000)}.png"
    path = IMAGES_DIR / name
    img.save(path)
    meta = {"file": name, "url": f"/images/{name}", "path": str(path), "width": img.width, "height": img.height,
            "created": time.time(), **meta}
    (IMAGES_DIR / (name + ".json")).write_text(json.dumps(meta, ensure_ascii=False), encoding="utf-8")
    return meta


def generate(prompt, negative="", preset="fast", width=None, height=None, steps=None, guidance=None, seed=None,
             aspect=None):
    import torch
    seed = int(seed) if seed not in (None, "", -1) else int(time.time() * 1000) % 2**31
    if preset == "quality" and qwen_ready("gen"):
        if aspect or not (width and height):
            width, height = _size(aspect, False)
        with _lock:
            pipe = _load_qwen("gen")
            t0 = time.time()
            img = pipe(prompt=prompt, negative_prompt=negative or " ", width=int(width), height=int(height),
                       num_inference_steps=QWEN["steps"], true_cfg_scale=1.0,
                       generator=torch.Generator("cpu").manual_seed(seed)).images[0]
        return _save(img, prompt=prompt, negative=negative, preset=preset, model=QWEN["repo"], steps=QWEN["steps"],
                     guidance=1.0, seed=seed, seconds=round(time.time() - t0, 1))
    cfg = IMAGE_PRESETS.get(preset, IMAGE_PRESETS["fast"])
    if aspect:
        width, height = _size(aspect, preset != "quality")
    width = int(width or cfg["width"])
    height = int(height or cfg["height"])
    steps = int(steps or cfg["steps"])
    guidance = float(cfg["guidance"] if guidance is None else guidance)
    with _lock:
        pipe = _load(cfg["model"])
        gen = torch.Generator("cpu").manual_seed(seed)
        t0 = time.time()
        kw = dict(prompt=prompt, width=width, height=height, num_inference_steps=steps,
                  guidance_scale=guidance, generator=gen)
        if negative and guidance > 1:
            kw["negative_prompt"] = negative
        img = pipe(**kw).images[0]
    return _save(img, prompt=prompt, negative=negative, preset=preset, model=cfg["model"], steps=steps,
                 guidance=guidance, seed=seed, seconds=round(time.time() - t0, 1))


_inpaint = None  # (model id, inpainting pipe sharing the loaded text-to-image pipe's weights)


PROGRESS = {"step": 0, "total": 0, "busy": False, "cancel": False}  # the running fill, for Studio's bar / Cancel


class Cancelled(Exception):
    pass


def _blend(orig, gen, hard):
    """The painted picture put into the original: its colours matched to the original just around the area (no colour
    jump at the seam), then mixed in through a feathered mask - outside the area the original stays exactly."""
    import numpy as np
    from PIL import Image, ImageFilter
    W, H = orig.size
    r = max(2, round(min(W, H) * 0.012))
    o = np.asarray(orig.convert("RGB"), dtype=np.float32)
    g = np.asarray(gen.convert("RGB"), dtype=np.float32)
    m = np.asarray(hard, dtype=np.float32) / 255
    ring = (np.asarray(hard.filter(ImageFilter.MaxFilter(2 * r + 1)), dtype=np.float32) / 255 - m) > 0.5
    if ring.sum() > 50:
        g = g + (o[ring].mean(0) - g[ring].mean(0))  # (the same shift everywhere: the painting keeps its own shading)
    soft = np.asarray(hard.filter(ImageFilter.GaussianBlur(r)), dtype=np.float32)[..., None] / 255
    soft = np.maximum(soft, m[..., None])  # (inside the area: all new; the feather goes outward over the seam)
    return Image.fromarray(np.clip(o * (1 - soft) + g * soft, 0, 255).astype("uint8"))


# A real inpainting model (its UNet sees the picture and the mask): SDXL Inpainting 0.1's UNet with SDXL base's text
# encoders and VAE. Used for Studio's Generative Fill / Expand when it is downloaded, else SDXL Turbo from_pipe.
INPAINT_REPO = "diffusers/stable-diffusion-xl-1.0-inpainting-0.1"
INPAINT_KEY = "sdxl-inpainting-0.1"


def inpaint_ready():
    return bool(_hf_file(INPAINT_REPO, "unet/diffusion_pytorch_model.fp16.safetensors"))


def _load_inpaint():
    """The SDXL inpainting pipeline, loaded once and kept (it takes the place of any other image model)."""
    global _pipe, _pipe_model
    _unload_llms()
    if _pipe_model == INPAINT_KEY:
        return _pipe
    import torch
    from diffusers import StableDiffusionXLInpaintPipeline, UNet2DConditionModel
    _drop_pipe()
    _qwen_shared.clear()
    cuda = torch.cuda.is_available()
    dt = torch.float16 if cuda else torch.float32
    unet = UNet2DConditionModel.from_pretrained(INPAINT_REPO, subfolder="unet", variant="fp16", torch_dtype=dt)
    pipe = StableDiffusionXLInpaintPipeline.from_pretrained(IMAGE_PRESETS["quality"]["model"], unet=unet, torch_dtype=dt,
                                                            **({"variant": "fp16"} if cuda else {}))
    if cuda:
        if torch.cuda.get_device_properties(0).total_memory >= 11 * 2**30:
            pipe.to("cuda")
        else:
            pipe.enable_model_cpu_offload()  # (8 GB: one part on the GPU at a time)
        pipe.vae.enable_slicing()
    _pipe, _pipe_model = pipe, INPAINT_KEY
    return pipe


def warm(preset="fast"):
    """Load the fill model ahead of the first request (kept loaded after)."""
    global _inpaint
    from diffusers import AutoPipelineForInpainting
    with _lock:
        if inpaint_ready():
            _load_inpaint()
            return
        cfg = IMAGE_PRESETS.get(preset, IMAGE_PRESETS["fast"])
        base = _load(cfg["model"])
        if not _inpaint or _inpaint[0] != cfg["model"]:
            _inpaint = (cfg["model"], AutoPipelineForInpainting.from_pipe(base))


def inpaint(image, mask, prompt, negative="", preset="fast", count=3, seed=None, steps=None, strength=None, guidance=None):
    """Generative fill / expand: paint the white part of the mask new, matching the rest of the picture (SDXL
    inpainting, in place, like Photoshop's). image / mask: PIL pictures of the same size. All `count` variations come
    from one pass; each is returned already blended into the picture."""
    global _inpaint
    import torch
    from diffusers import AutoPipelineForInpainting
    from PIL import Image, ImageFilter
    seed = int(seed) if seed not in (None, "", -1) else int(time.time() * 1000) % 2**31
    real = inpaint_ready()  # (the real inpainting model: 1024 px, ~20 steps; else SDXL Turbo, 640 px, 4 steps)
    cfg = {"model": INPAINT_KEY} if real else IMAGE_PRESETS.get(preset, IMAGE_PRESETS["fast"])
    fast = not real and "turbo" in cfg["model"]
    # the model's own size: ~0.6 MP (turbo) / ~1 MP, multiples of 64; the result goes back to the picture's size
    W, H = image.size
    # (the inpainting model at ~0.7 MP: three variations in one pass still fit an 8 GB card)
    k = math.sqrt((640 * 640 if fast else 832 * 832) / (W * H))
    w, h = max(256, round(W * k / 64) * 64), max(256, round(H * k / 64) * 64)
    orig = image.convert("RGB")
    im = orig.resize((w, h), Image.LANCZOS)
    hard = mask.convert("L").point(lambda v: 255 if v > 24 else 0)
    mk = hard.resize((w, h), Image.LANCZOS).point(lambda v: 255 if v > 24 else 0).filter(ImageFilter.MaxFilter(5))
    steps = int(steps or (4 if fast else 18))
    guidance = float(guidance if guidance is not None else (0.0 if fast else 7.5))
    strength = 0.99 if real else float(strength if strength is not None else 1.0)  # (it sees the picture itself)
    words = prompt.strip() or "seamless continuation of the surrounding picture, same scene, same style and lighting, high detail"
    neg = negative or ("" if fast else "text, watermark, letters, frame, border, blurry, lowres, deformed, cut off")
    n = max(1, min(int(count or 1), 4))
    with _lock:
        if real:
            pipe = _load_inpaint()
        else:
            base = _load(cfg["model"])
            if not _inpaint or _inpaint[0] != cfg["model"]:
                _inpaint = (cfg["model"], AutoPipelineForInpainting.from_pipe(base))
            pipe = _inpaint[1]
        t0 = time.time()
        per = max(1, int(steps * strength))
        # (all variations in one pass: on an 8 GB card the model is moved onto the GPU once, not once per variation)
        runs = [n]
        PROGRESS.update(step=0, total=per * len(runs), busy=True, cancel=False)
        done = [0]

        def tick(p, i, t, kw):
            PROGRESS["step"] = done[0] + i + 1
            if PROGRESS["cancel"]:
                p._interrupt = True
            return kw
        pics = []
        try:
            for r, cnt in enumerate(runs):
                kw = dict(prompt=words, image=im, mask_image=mk, width=w, height=h, num_inference_steps=steps,
                          strength=strength, guidance_scale=guidance, num_images_per_prompt=cnt, callback_on_step_end=tick,
                          generator=[torch.Generator("cpu").manual_seed(seed + r + i) for i in range(cnt)])
                if neg and guidance > 1:
                    kw["negative_prompt"] = neg
                pics += pipe(**kw).images
                done[0] += per
                if PROGRESS["cancel"]:
                    break
        finally:
            cancelled = PROGRESS["cancel"]
            PROGRESS.update(busy=False, cancel=False)
            pipe._interrupt = False
        if cancelled:
            raise Cancelled()
    secs = round(time.time() - t0, 1)
    return [_save(_blend(orig, p.resize((W, H), Image.LANCZOS), hard), prompt=prompt, preset="inpaint-" + preset,
                  model=cfg["model"], steps=steps, strength=strength, seed=seed + i, seconds=secs)
            for i, p in enumerate(pics)]


def edit(src: Path, instruction, seed=None):
    """Change an existing picture by instruction ("make the sky blue", "remove the person on the left")."""
    if not qwen_ready("edit"):
        raise RuntimeError("Image editing model is not installed on this PC")
    import torch
    from PIL import Image
    seed = int(seed) if seed not in (None, "", -1) else int(time.time() * 1000) % 2**31
    with Image.open(src) as im:
        im = im.convert("RGB")
        # ~1 megapixel keeps the edit fast and in memory; the editor works in multiples of 16 px.
        k = math.sqrt(1024 * 1024 / (im.width * im.height))
        im = im.resize((max(256, round(im.width * k / 16) * 16), max(256, round(im.height * k / 16) * 16)))
    with _lock:
        pipe = _load_qwen("edit")
        t0 = time.time()
        img = pipe(image=[im], prompt=instruction, negative_prompt=" ", num_inference_steps=QWEN["steps"],
                   true_cfg_scale=1.0, generator=torch.Generator("cpu").manual_seed(seed)).images[0]
    return _save(img, prompt=instruction, preset="edit", model=QWEN["edit_repo"], source=src.name, seed=seed,
                 seconds=round(time.time() - t0, 1))


def add_text(src: Path, texts):
    import overlay
    from PIL import Image
    t0 = time.time()
    tmp = IMAGES_DIR / f"_text_{int(time.time() * 1000)}.png"
    overlay.render(src, tmp, texts)
    with Image.open(tmp) as im:
        img = im.copy()
    tmp.unlink(missing_ok=True)
    return _save(img, prompt=" / ".join(str(t.get("text", "")) for t in texts), preset="text", source=src.name,
                 texts=texts, seconds=round(time.time() - t0, 1))


def gallery():
    out = []
    for f in sorted(IMAGES_DIR.glob("*.png.json"), reverse=True):
        try:
            out.append(json.loads(f.read_text(encoding="utf-8")))
        except Exception:
            pass
    return out
