"""Local video generation with Wan 2.2 TI2V-5B (text -> video and photo -> video).

A clip takes minutes, so each request becomes a background job with progress. Video and image jobs share
images._lock: the GPU runs one of them at a time, and chat models are unloaded first.
"""
import json
import threading
import time
import uuid
from pathlib import Path

import images
from config import FAST_MODEL, OLLAMA_URL, VIDEO, VIDEOS_DIR

_pipes = {}           # "t2v" / "i2v" -> pipeline (they share all weights)
JOBS: dict[str, dict] = {}

NEGATIVE = ("blurry, low quality, worst quality, jpeg artifacts, distorted, deformed hands, extra fingers, "
            "bad anatomy, flicker, static frame, text, subtitles, watermark, logo")


_ready = False


def ready():
    """True only when every weight shard listed by the model's index files is on disk (not just the folder)."""
    global _ready
    if _ready:
        return True
    snap = images._hf_file(VIDEO["repo"])
    if not snap:
        return False
    for part in ("transformer", "text_encoder"):
        idx = next((snap / part).glob("*.index.json"), None)
        if not idx:
            return False
        shards = set(json.loads(idx.read_text(encoding="utf-8"))["weight_map"].values())
        if not all((snap / part / s).exists() for s in shards):
            return False
    _ready = (snap / "vae" / "diffusion_pytorch_model.safetensors").exists()
    return _ready


def status():
    images._probe_gpu()
    return {"available": ready(), "gpu": images._gpu, "vram_gb": round(images._vram_gb, 1),
            "presets": list(VIDEO["presets"]), "max_seconds": VIDEO["max_seconds"],
            "reason": None if ready() else "Video model not downloaded yet"}


def _load(kind):
    """Load Wan once; the photo->video pipeline reuses the same weights."""
    if kind in _pipes:
        return _pipes[kind]
    import torch
    from diffusers import AutoencoderKLWan, WanImageToVideoPipeline, WanPipeline
    if "t2v" not in _pipes:
        path = images._hf_file(VIDEO["repo"])
        vae = AutoencoderKLWan.from_pretrained(path, subfolder="vae", torch_dtype=torch.float32)
        pipe = WanPipeline.from_pretrained(path, vae=vae, torch_dtype=torch.bfloat16)
        # Text encoder (~11 GB) and transformer (~10 GB) are each bigger than an 8-12 GB card. Moving a whole model
        # spills into shared memory and the driver resets the GPU, so stream them in a few blocks at a time.
        from diffusers.hooks import apply_group_offloading
        gpu = torch.device("cuda")
        for m in (pipe.text_encoder, pipe.transformer):
            apply_group_offloading(m, onload_device=gpu, offload_type="block_level", num_blocks_per_group=2,
                                   use_stream=True, low_cpu_mem_usage=True)
        pipe.vae.to(gpu)
        pipe.vae.enable_tiling()
        _pipes["t2v"] = pipe
    if kind == "i2v":
        _pipes["i2v"] = WanImageToVideoPipeline.from_pipe(_pipes["t2v"])
    return _pipes[kind]


def unload():
    if _pipes and images._lock.acquire(blocking=False):
        try:
            import gc
            import torch
            _pipes.clear()
            gc.collect()
            torch.cuda.empty_cache()
        finally:
            images._lock.release()


def _enhance(prompt):
    """Wan follows long, concrete English prompts best; let the fast local model write one (any input language)."""
    try:
        import httpx
        ask = ("Rewrite this idea as one prompt for a text-to-video model. English only, 60-90 words, one continuous "
               "shot: subject, action, setting, lighting, camera movement, style. No lists, no quotes, no title.\n\n"
               f"Idea: {prompt}")
        r = httpx.post(f"{OLLAMA_URL}/api/generate", timeout=120,
                       json={"model": FAST_MODEL, "prompt": ask, "stream": False, "think": False, "keep_alive": 0,
                             "options": {"temperature": 0.6, "num_predict": 200}})
        text = r.json().get("response", "").strip().strip('"')
        return text if len(text) > 20 else prompt
    except Exception:
        return prompt


def _run(job):
    job.update(state="queued", note="Waiting for the GPU")
    with images._lock:
        try:
            job.update(state="running", note="Freeing the GPU")
            images._unload_llms()
            if job["enhance"]:
                job["note"] = "Writing a detailed video prompt"
                job["final_prompt"] = _enhance(job["prompt"])
                images._unload_llms()
            images._drop_pipe()  # the picture model must leave the GPU too
            kind = "i2v" if job.get("image") else "t2v"
            job["note"] = "Loading the video model (first time takes a few minutes)"
            pipe = _load(kind)

            import torch
            from diffusers.utils import export_to_video
            from PIL import Image
            preset = VIDEO["presets"][job["preset"]]
            w, h = preset["sizes"][job["aspect"]]
            frames = int(job["seconds"] * VIDEO["fps"]) // 4 * 4 + 1  # Wan wants 4k+1 frames
            steps = preset["steps"]
            gen = torch.Generator("cpu").manual_seed(job["seed"])

            def on_step(_pipe, i, _t, kw):
                job.update(progress=round((i + 1) / steps, 3), note=f"Generating frames, step {i + 1} of {steps}")
                if job.get("cancel"):
                    _pipe._interrupt = True
                return kw

            args = dict(prompt=job["final_prompt"], negative_prompt=NEGATIVE, height=h, width=w, num_frames=frames,
                        num_inference_steps=steps, guidance_scale=5.0, generator=gen, callback_on_step_end=on_step)
            if kind == "i2v":
                src = Image.open(job["image"]).convert("RGB")
                # Crop the photo to the clip's aspect so it isn't stretched.
                sr, tr = src.width / src.height, w / h
                if sr > tr:
                    nw = int(src.height * tr); src = src.crop(((src.width - nw) // 2, 0, (src.width + nw) // 2, src.height))
                else:
                    nh = int(src.width / tr); src = src.crop((0, (src.height - nh) // 2, src.width, (src.height + nh) // 2))
                args["image"] = src.resize((w, h))
            t0 = time.time()
            out = pipe(**args).frames[0]
            if job.get("cancel"):
                job.update(state="cancelled", note="Cancelled"); return
            job["note"] = "Saving the video"
            name = f"vid_{int(time.time() * 1000)}"
            mp4 = VIDEOS_DIR / f"{name}.mp4"
            export_to_video(out, str(mp4), fps=VIDEO["fps"])
            first = out[0]
            if not hasattr(first, "save"):
                import numpy as np
                first = Image.fromarray((np.asarray(first) * 255).clip(0, 255).astype("uint8"))
            first.save(VIDEOS_DIR / f"{name}.jpg", quality=88)
            meta = {"file": f"{name}.mp4", "url": f"/videos/{name}.mp4", "poster": f"/videos/{name}.jpg",
                    "prompt": job["prompt"], "final_prompt": job["final_prompt"], "from_photo": kind == "i2v",
                    "preset": job["preset"], "aspect": job["aspect"], "width": w, "height": h, "frames": frames,
                    "seconds": round(frames / VIDEO["fps"], 1), "seed": job["seed"],
                    "took": round(time.time() - t0), "created": time.time()}
            (VIDEOS_DIR / f"{name}.json").write_text(json.dumps(meta, ensure_ascii=False), encoding="utf-8")
            job.update(state="done", progress=1, note="Done", result=meta)
        except Exception as e:
            import traceback
            traceback.print_exc()
            job.update(state="error", note=f"{type(e).__name__}: {e}")
        finally:
            job["finished"] = time.time()
            if job.get("image"):
                Path(job["image"]).unlink(missing_ok=True)


def start(prompt, preset="draft", aspect="landscape", seconds=3, seed=None, image_path=None, enhance=True):
    preset = preset if preset in VIDEO["presets"] else "draft"
    aspect = aspect if aspect in ("landscape", "portrait", "square") else "landscape"
    seconds = max(1, min(float(seconds or 3), VIDEO["max_seconds"]))
    jid = uuid.uuid4().hex[:10]
    job = {"id": jid, "prompt": prompt, "final_prompt": prompt, "preset": preset, "aspect": aspect, "seconds": seconds,
           "seed": int(seed) if seed not in (None, "") else int(time.time()) % 2**31, "image": image_path,
           "enhance": enhance, "state": "queued", "progress": 0, "note": "Queued", "created": time.time()}
    JOBS[jid] = job
    # Torch kernels need far more native stack than Windows gives a worker thread; too little crashes c10.dll.
    prev = threading.stack_size(64 * 1024 * 1024)
    try:
        threading.Thread(target=_run, args=(job,), daemon=True).start()
    finally:
        threading.stack_size(prev)
    return job


def public(job):
    return {k: v for k, v in job.items() if k not in ("image", "cancel")}


def gallery():
    out = []
    for f in sorted(VIDEOS_DIR.glob("vid_*.json"), reverse=True):
        try:
            out.append(json.loads(f.read_text(encoding="utf-8")))
        except Exception:
            pass
    return out


def delete(name):
    stem = Path(name).stem
    for ext in (".mp4", ".jpg", ".json"):
        (VIDEOS_DIR / f"{stem}{ext}").unlink(missing_ok=True)
