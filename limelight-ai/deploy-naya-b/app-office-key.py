"""Limelight AI local server. Run: python server/app.py  (then open http://127.0.0.1:8800)"""
import asyncio
import hashlib
import hmac
import json
import os
import sys
import time
from contextlib import asynccontextmanager
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import httpx
import uvicorn
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import agent
import db
import images
import tools
from config import (DEFAULT_AGENT_MODEL, DEFAULT_CHAT_MODEL, DEFAULT_CODE_MODEL, DEFAULT_WORKSPACE, FAST_MODEL, HOST,
                    IMAGES_DIR, OLLAMA_URL, PASSWORD, PORT, UPLOADS_DIR, VISION_MODEL, WEB_DIR)

@asynccontextmanager
async def lifespan(_app):
    asyncio.create_task(agent.warm(DEFAULT_CHAT_MODEL))  # first reply shouldn't wait for a cold load
    yield


app = FastAPI(title="Limelight AI", lifespan=lifespan)
db.init()
TOKEN = hashlib.sha256(("limelight:" + PASSWORD).encode()).hexdigest() if PASSWORD else ""


# the Limelight apps on JASPREET (Lighthouse, Studio) come in with the office key (data/workspace.key) instead of the password
def _key_ok(request):
    try:
        key = (Path(__file__).resolve().parent.parent / "data" / "workspace.key").read_text(encoding="utf-8").strip()
    except Exception:
        return False
    return bool(key) and hmac.compare_digest(request.headers.get("x-lh-key", ""), key)


@app.middleware("http")
async def auth(request: Request, call_next):
    p = request.url.path
    if TOKEN and p.startswith(("/api", "/images", "/uploads")) and p not in ("/api/login", "/api/auth", "/api/logout"):
        if request.cookies.get("ll_token") != TOKEN and not _key_ok(request):
            return JSONResponse({"detail": "login required"}, status_code=401)
    response = await call_next(request)
    if not p.startswith(("/api", "/images")):
        response.headers["Cache-Control"] = "no-cache"  # UI updates show up on a normal refresh
    return response


class Login(BaseModel):
    password: str


@app.get("/api/auth")
def auth_state(request: Request):
    return {"required": bool(TOKEN), "ok": not TOKEN or request.cookies.get("ll_token") == TOKEN or _key_ok(request)}


@app.post("/api/login")
def login(body: Login):
    if not TOKEN or body.password == PASSWORD:
        r = JSONResponse({"ok": True})
        if TOKEN:
            r.set_cookie("ll_token", TOKEN, httponly=True, samesite="strict", max_age=30 * 86400)
        return r
    raise HTTPException(401, "wrong password")


@app.post("/api/logout")
def logout():
    r = JSONResponse({"ok": True})
    r.delete_cookie("ll_token", httponly=True, samesite="strict")
    return r


# ------------------------------------------------------------------ status / models

@app.get("/api/status")
async def status():
    ollama = {"running": False, "models": []}
    try:
        async with httpx.AsyncClient(timeout=3) as c:
            r = await c.get(f"{OLLAMA_URL}/api/tags")
            ollama = {"running": True, "models": [m["name"] for m in r.json().get("models", [])]}
    except Exception:
        pass
    return {"ollama": ollama, "images": images.status(), "default_workspace": str(DEFAULT_WORKSPACE),
            "defaults": {"chat": DEFAULT_CHAT_MODEL, "cowork": DEFAULT_AGENT_MODEL, "code": DEFAULT_CODE_MODEL,
                         "agent": DEFAULT_AGENT_MODEL, "fast": FAST_MODEL, "vision": VISION_MODEL}}


class Pull(BaseModel):
    model: str


@app.post("/api/models/warm")
async def warm(body: Pull):
    asyncio.create_task(agent.warm(body.model))
    return {"ok": True}


@app.post("/api/models/pull")
async def pull(body: Pull):
    async def gen():
        try:
            async with httpx.AsyncClient(timeout=None) as c:
                async with c.stream("POST", f"{OLLAMA_URL}/api/pull", json={"model": body.model, "stream": True}) as r:
                    async for line in r.aiter_lines():
                        if line.strip():
                            yield f"data: {line}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        yield "data: {\"status\":\"done\"}\n\n"
    return StreamingResponse(gen(), media_type="text/event-stream")


# ------------------------------------------------------------------ conversations

class NewConv(BaseModel):
    mode: str = "chat"
    model: str = ""
    workspace: str = ""


@app.get("/api/conversations")
def list_convs(mode: str | None = None):
    return db.list_all(mode)


@app.post("/api/conversations")
def new_conv(body: NewConv):
    ws = body.workspace.strip() or str(DEFAULT_WORKSPACE)
    if body.mode != "chat":
        Path(ws).mkdir(parents=True, exist_ok=True)
    model = body.model or "auto"
    return db.create(body.mode, model, str(Path(ws).resolve()))


@app.get("/api/conversations/{cid}")
def get_conv(cid: str):
    c = db.get(cid)
    if not c:
        raise HTTPException(404)
    for m in c["messages"]:  # don't ship base64 images back to the UI
        if "images" in m:
            m["images"] = [f"[{len(m['images'])} image(s)]"]
    return c


class Patch(BaseModel):
    title: str | None = None
    model: str | None = None
    workspace: str | None = None


@app.patch("/api/conversations/{cid}")
def patch_conv(cid: str, body: Patch):
    fields = {k: v for k, v in body.model_dump().items() if v is not None}
    if "workspace" in fields:
        Path(fields["workspace"]).mkdir(parents=True, exist_ok=True)
        fields["workspace"] = str(Path(fields["workspace"]).resolve())
    if fields:
        db.save(cid, **fields)
    return db.get(cid)


@app.delete("/api/conversations/{cid}")
def del_conv(cid: str):
    db.delete(cid)
    return {"ok": True}


@app.post("/api/conversations/{cid}/clear")
def clear_conv(cid: str):
    db.save(cid, messages=[], todos=[])
    return {"ok": True}


# ------------------------------------------------------------------ chat / agent

class ChatReq(BaseModel):
    message: str
    images: list[str] = []          # base64 (for vision models)
    model: str = ""
    permission: str = "ask"         # ask | auto-edit | auto
    think: bool | None = None


@app.post("/api/conversations/{cid}/chat")
async def chat(cid: str, body: ChatReq):
    if not db.get(cid):
        raise HTTPException(404)
    if body.model:
        db.save(cid, model=body.model)

    async def gen():
        async for ev in agent.run(cid, body.message, body.images or None, body.model or None,
                                  body.permission, body.think):
            yield f"data: {json.dumps(ev, ensure_ascii=False)}\n\n"
    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


class Approve(BaseModel):
    id: str
    approved: bool
    conversation: str = ""
    permission: str = ""            # set by "Allow all" to switch mode for the running task


@app.post("/api/approve")
def approve(body: Approve):
    if body.permission and body.conversation in agent.PERM:
        agent.PERM[body.conversation] = body.permission
    fut = agent.PENDING.get(body.id)
    if fut and not fut.done():
        fut.get_loop().call_soon_threadsafe(fut.set_result, body.approved)
        return {"ok": True}
    return {"ok": False}


@app.post("/api/conversations/{cid}/stop")
def stop(cid: str):
    agent.STOP[cid] = True
    for fut in list(agent.PENDING.values()):
        if not fut.done():
            fut.get_loop().call_soon_threadsafe(fut.set_result, False)
    return {"ok": True}


# ------------------------------------------------------------------ files

@app.post("/api/upload")
async def upload(file: UploadFile = File(...)):
    name = f"{int(time.time() * 1000)}_{Path(file.filename).name}"
    dest = UPLOADS_DIR / name
    dest.write_bytes(await file.read())
    text = ""
    if not (file.content_type or "").startswith("image/"):
        try:
            text = await asyncio.to_thread(tools.extract_text, dest)
        except Exception as e:
            text = f"(could not read file: {e})"
    return {"name": file.filename, "path": str(dest), "text": text[:100000]}


_whisper = None


def _transcribe(path):
    # Local Whisper ("small" handles Hindi + English) on CPU, so it doesn't compete with the LLM for VRAM.
    global _whisper
    if _whisper is None:
        from faster_whisper import WhisperModel
        _whisper = WhisperModel(os.environ.get("LIMELIGHT_WHISPER", "small"), device="cpu", compute_type="int8")
    segs, info = _whisper.transcribe(str(path), beam_size=5, vad_filter=True)
    return " ".join(s.text.strip() for s in segs).strip(), info.language


@app.post("/api/transcribe")
async def transcribe(file: UploadFile = File(...)):
    dest = UPLOADS_DIR / f"voice_{int(time.time() * 1000)}.webm"
    dest.write_bytes(await file.read())
    try:
        text, lang = await asyncio.to_thread(_transcribe, dest)
    except ImportError:
        raise HTTPException(400, "Voice typing not installed: pip install faster-whisper")
    finally:
        dest.unlink(missing_ok=True)  # don't keep voice recordings
    return {"text": text, "language": lang}


@app.get("/api/compare")
def compare_data():
    """Side-by-side test: prompts, Claude's reference answers and local model results (compare/ folder)."""
    d = Path(__file__).resolve().parent.parent / "compare"
    load = lambda n: json.loads((d / n).read_text(encoding="utf-8")) if (d / n).exists() else {}
    local = load("results.json")
    answers = {m: v for m, v in local.items()}
    answers["Claude Opus 5.5"] = {k: {"answer": a} for k, a in load("claude.json").items()}
    return {"prompts": load("prompts.json") or [], "answers": answers}


@app.get("/api/files")
def files(workspace: str, path: str = "."):
    ws = Path(workspace).resolve()
    try:
        p = tools._resolve(ws, path)
    except tools.ToolError as e:
        raise HTTPException(400, str(e))
    if p.is_file():
        return FileResponse(p)
    items = []
    for c in sorted(p.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower())):
        if c.name in tools.SKIP_DIRS or c.name.startswith("."):
            continue
        items.append({"name": c.name, "dir": c.is_dir(), "path": tools._rel(ws, c)})
    return items


@app.post("/api/open-folder")
def open_folder(body: dict):
    p = Path(body.get("path", "")).resolve()
    if p.exists() and sys.platform == "win32":
        os.startfile(str(p))
    return {"ok": True}


# ------------------------------------------------------------------ images

class ImgReq(BaseModel):
    prompt: str
    negative: str = ""
    preset: str = "fast"
    width: int | None = None
    height: int | None = None
    steps: int | None = None
    guidance: float | None = None
    seed: int | None = None
    count: int = 1


@app.post("/api/images/generate")
async def gen_images(body: ImgReq):
    if not images.status()["available"]:
        raise HTTPException(400, images.status()["reason"])
    out = []
    for i in range(max(1, min(body.count, 4))):
        seed = None if body.seed in (None, -1) else body.seed + i
        out.append(await asyncio.to_thread(images.generate, body.prompt, body.negative, body.preset,
                                           body.width, body.height, body.steps, body.guidance, seed))
    return out


@app.get("/api/images")
def list_images():
    return images.gallery()


@app.delete("/api/images/{name}")
def delete_image(name: str):
    for f in (IMAGES_DIR / Path(name).name, IMAGES_DIR / (Path(name).name + ".json")):
        if f.exists():
            f.unlink()
    return {"ok": True}


app.mount("/images", StaticFiles(directory=IMAGES_DIR), name="images")
app.mount("/", StaticFiles(directory=WEB_DIR, html=True), name="web")

if __name__ == "__main__":
    print(f"\n  Limelight AI running at http://{'127.0.0.1' if HOST == '0.0.0.0' else HOST}:{PORT}\n")
    uvicorn.run(app, host=HOST, port=PORT, log_level="warning")
