"""Chat + agent loop on a local Ollama model (Claude Code style tool use with approvals)."""
import asyncio
import json
import platform
import re
import uuid
from datetime import date
from pathlib import Path

import httpx

import db
import images as image_gen
import tools
from config import (DEFAULT_AGENT_MODEL, DEFAULT_CHAT_MODEL, DEFAULT_CODE_MODEL, KEEP_ALIVE, MAX_AGENT_STEPS, NUM_CTX,
                    OLLAMA_URL, VISION_MODEL)

# approval id -> Future[bool]
PENDING: dict[str, asyncio.Future] = {}
# conversation id -> stop flag
STOP: dict[str, bool] = {}
# conversation id -> permission mode (can be raised mid-run by "Allow all")
PERM: dict[str, str] = {}

BASE = (
    "You are Limelight AI, a private assistant running entirely on the user's own computer. "
    "No data leaves this machine. Always reply in the same language and script as the user's latest message. "
    "Write maths in plain text (e.g. 434 × 0.4 = 173.6), never LaTeX. Don't invent facts or statistics; "
    "if you're unsure, say so. "
    f"Today is {date.today().isoformat()}."
)

IMAGE_RULES = """

PICTURES: you can make and change pictures yourself with tools.
- When the user asks for an image, photo, poster, banner, post, thumbnail, illustration or "bana do" for anything visual, call generate_image. Don't ask questions first unless the request is truly unclear; pick sensible details.
- Write the prompt in rich ENGLISH, even if the user wrote Hindi or Hinglish: subject, setting, composition, colours, lighting, mood, style (photo, 3D, illustration, flat vector...), and camera/lens for photos. Indian context when it fits (people, places, clothing).
- The picture model can't write Hindi and spells badly. Keep words out of the prompt; when the user wants a headline, caption, date or any Hindi/English text on the picture, first make the picture (leave empty space for the text in the prompt, e.g. "empty sky at the top for a headline"), then call add_text_to_image with the exact words.
- "isko blue kar do", "background badlo", "is aadmi ko hata do" and other changes to a picture already in this chat (or a photo the user attached): call edit_image with one short English instruction. Leave image empty for the latest picture.
- Pick aspect from the use: Instagram post = square, story/reel/WhatsApp status = story, YouTube thumbnail/banner = wide, poster/flyer = portrait.
- If the new picture needs text, call generate_image and add_text_to_image together in the same response (leave image empty in add_text_to_image).
- Don't repeat the prompt or paste the image link; the picture is shown to the user automatically."""
# Said after picture tools in Chat mode instead of a model reply: the picture model has just pushed the language model
# off the GPU, and reloading it (10-40 s) only to say "here it is" isn't worth it.
PICTURE_DONE = {"english": "Here's your picture.", "hinglish": "Ye rahi aapki image.", "hindi": "यह रही आपकी तस्वीर।"}

PROMPTS = {
    "chat": BASE + " Be clear, direct and helpful. Use markdown for structure and code blocks for code.",
    "cowork": BASE + """
You are in WORK mode: you do real office work on files in the workspace folder — read PDFs, Word, Excel and PowerPoint files, write reports, letters, proposals, summaries, Excel sheets and images.
How to work:
- For any task with more than 2 steps, first call todo_write with a plan, then keep it updated.
- Look at the files first (list_dir, glob, read_file) before you write about them. Never invent file contents.
- Deliver finished files: use create_docx for documents, create_xlsx for spreadsheets, write_file for .md/.txt/.csv/.html, generate_image for visuals.
- When done, tell the user in 2-4 lines what you made and the file names.""",
    "code": BASE + """
You are in BUILD mode: an expert software engineer working inside the user's project folder (the workspace).
How to work:
- Explore before editing: list_dir, glob, grep, read_file. Read a file before you edit it.
- Make focused changes with edit_file (exact old_string copied from read_file output, without the line-number prefix). Use write_file for new files.
- Run builds/tests/scripts with run_command and fix errors you see. Do not claim something works unless you ran it.
- For multi-step work, call todo_write with the plan and update statuses as you go.
- Match the existing code style. Keep replies short; reference files as path:line.""",
}


# Common Hindi words written in Roman letters; used to tell Hinglish apart from English.
HINGLISH_WORDS = set("""hai hain ho hoon hu hun tha thi kya kyu kyun kyon kaise kaisa kaisi kaun kab kahan karo kar
karna karke karte kiya kiye mein mai mera meri mere mujhe mujhko tum tumhe tera teri aap aapka aapki apna apni yeh ye
woh vo wo toh bhi nahi nhi nahin ka ki ke ko se bana banao banado bata batao likh likho chahiye chaiye accha acha achha
theek thik bhai yaar namaste namaskar haan ji dedo dede raha rahi rahe gaya gayi sakta sakti sakte wala wali wale abhi
sab kuch bahut bhot bohot aur lekin kyunki matlab samjhao samjha jaldi isko usko isme usme hum humara""".split())

LANG_RULES = {
    "english": "LANGUAGE RULE: The user wrote in English. Reply only in English.",
    "hindi": "LANGUAGE RULE: The user wrote in Hindi (Devanagari script). Reply in Hindi, in Devanagari script.",
    "hinglish": "LANGUAGE RULE: The user wrote in Hinglish (Hindi words typed in English/Roman letters). "
                "Reply in Hinglish using only Roman letters, the way they write. Never use Devanagari script.",
}


def detect_language(text: str) -> str:
    letters = [c for c in text if c.isalpha()]
    if letters and sum("ऀ" <= c <= "ॿ" for c in letters) / len(letters) > 0.3:
        return "hindi"
    words = re.findall(r"[a-z]+", text.lower())
    if not words:
        return "english"
    hits = sum(w in HINGLISH_WORDS for w in words)
    return "hinglish" if hits >= 2 or (hits == 1 and len(words) <= 3) or hits / len(words) >= 0.15 else "english"


IMAGE_URL = re.compile(r"/images/img_\d+\.png")
# Words that mean "change this photo" (English + Hinglish); without them an attached photo goes to the vision model.
EDIT_WORDS = re.compile(r"\b(edit|change|replace|remove|erase|add|make it|turn|colou?r|background|bg|badal\w*|hata\w*|"
                        r"laga\w*|jod\w*|kar\s*do|kardo|bana\s*do|banado|rang|piche|peeche)\b", re.I)


# The user wants words on the picture (quoted words, or "likh do", "headline"...): don't stop after generate_image.
TEXT_ASK = re.compile(r"[\"'“‘][^\"'”’]{2,}[\"'”’]|\b(likh\w*|text|headline|heading|caption|title|tagline)\b|लिख", re.I)
FAST_ASK = re.compile(r"\b(fast|jaldi|quick|draft|rough|turbo)\b", re.I)


def _latest_image(history):
    """URL of the newest picture in this chat (made by a tool or attached by the user)."""
    for m in reversed(history):
        found = IMAGE_URL.findall(str(m.get("content", "")))
        if found:
            return found[-1]
    return ""


def _wants_edit(text):
    return bool(EDIT_WORDS.search(text.split("\n\n<file name=")[0]))


def _save_upload(b64):
    """Keep an attached photo in the gallery folder so the picture tools can use it; returns its /images/ URL."""
    import base64
    import time
    name = f"img_{int(time.time() * 1000)}.png"
    from PIL import Image
    import io
    with Image.open(io.BytesIO(base64.b64decode(b64.split(",")[-1]))) as im:
        im.convert("RGB").save(image_gen.IMAGES_DIR / name)
    time.sleep(0.002)  # unique names when several photos arrive together
    return f"/images/{name}"


def _system(mode, ws: Path, todos, lang="english"):
    s = PROMPTS.get(mode, PROMPTS["chat"]) + "\n\n" + LANG_RULES[lang]
    if mode in ("chat", "cowork") and image_gen.status()["available"]:
        s += IMAGE_RULES
    if mode != "chat":
        s += f"\n\nEnvironment: OS {platform.system()} {platform.release()}; workspace folder: {ws}. All relative paths are inside it."
        mem = ws / "LIMELIGHT.md"
        if mem.is_file():
            s += "\n\nProject instructions from LIMELIGHT.md (follow them):\n" + mem.read_text(encoding="utf-8", errors="replace")[:6000]
        if todos:
            s += "\n\nCurrent todo list: " + json.dumps(todos, ensure_ascii=False)
    return {"role": "system", "content": s}


def _parse_inline_tool_calls(content: str):
    """Fallback for models that print tool calls as text instead of native tool_calls."""
    calls = []
    for m in re.finditer(r"<tool_call>\s*(\{.*?\})\s*</tool_call>", content, re.S):
        try:
            j = json.loads(m.group(1))
            calls.append({"function": {"name": j.get("name"), "arguments": j.get("arguments", {})}})
        except json.JSONDecodeError:
            pass
    return calls


def _trim(messages, keep_chars=60000):
    """Keep context within the local model window: shrink old tool outputs first, then drop old turns."""
    total = sum(len(str(m.get("content", ""))) for m in messages)
    i = 0
    while total > keep_chars and i < len(messages) - 6:
        m = messages[i]
        if m["role"] == "tool" and len(m.get("content", "")) > 400:
            total -= len(m["content"]) - 200
            m = {**m, "content": m["content"][:200] + "\n...[old output trimmed]"}
            messages[i] = m
        i += 1
    while total > keep_chars and len(messages) > 4:
        total -= len(str(messages[0].get("content", "")))
        messages.pop(0)
    return messages


def _needs_approval(name, perm, args=None):
    if perm == "auto":
        return False
    if name in tools.IMAGE_TOOLS and not (args or {}).get("path"):
        return False  # gallery only, nothing in the workspace changes
    if name in tools.SHELL_TOOLS:
        return True
    if name in tools.EDIT_TOOLS:
        return perm == "ask"
    return False


async def _ollama_stream(model, messages, tool_schemas, think):
    opts = {"num_ctx": NUM_CTX, "num_predict": 4096}
    if "coder" in model:
        # Qwen3-Coder guidance; a strong presence penalty would hurt code that legitimately repeats.
        opts.update(temperature=0.7, top_p=0.8, top_k=20, repeat_penalty=1.05)
    elif "qwen" in model:
        # Qwen's guidance; presence_penalty stops small quantized Qwen models from looping.
        opts.update(temperature=0.7, top_p=0.8, top_k=20, presence_penalty=1.5)
    elif "gpt-oss" in model:
        opts.update(temperature=1.0, top_p=1.0)
    body = {"model": model, "messages": messages, "stream": True, "options": opts, "keep_alive": KEEP_ALIVE}
    if tool_schemas:
        body["tools"] = tool_schemas
    if "gpt-oss" in model:
        # gpt-oss always reasons; "low" keeps simple replies fast, the Think toggle raises it.
        body["think"] = "high" if think else "low"
    elif think is not None and not ("coder" in model or is_vision(model)):
        body["think"] = think  # coder and vision models have no thinking mode; Ollama rejects the flag
    image_gen.llm_busy += 1  # a picture job waits for this reply before it takes the GPU
    try:
        async with httpx.AsyncClient(timeout=None) as c:
            async with c.stream("POST", f"{OLLAMA_URL}/api/chat", json=body) as r:
                if r.status_code != 200:
                    txt = (await r.aread()).decode(errors="replace")
                    raise RuntimeError(f"Ollama error {r.status_code}: {txt}")
                async for line in r.aiter_lines():
                    if line.strip():
                        chunk = json.loads(line)
                        yield chunk
                        if chunk.get("done"):  # end here so the busy count drops as soon as the reply is complete
                            break
    finally:
        image_gen.llm_busy -= 1


def is_vision(model: str) -> bool:
    return any(k in model for k in ("vl", "llava", "gemma3", "vision", "minicpm-v"))


async def warm(model):
    """Load a model into memory ahead of the first message (cold load of a 13 GB model is ~10-40s)."""
    if image_gen.busy():
        return  # a picture is being made; the chat model loads on the next message instead
    try:
        image_gen.unload()
        async with httpx.AsyncClient(timeout=300) as c:
            await c.post(f"{OLLAMA_URL}/api/generate",
                         json={"model": model, "keep_alive": KEEP_ALIVE, "options": {"num_ctx": NUM_CTX}})
    except Exception:
        pass


async def run(conv_id, user_text, images=None, model=None, perm="ask", think=None):
    """Async generator of events: dicts with a 'type' key."""
    conv = db.get(conv_id)
    mode = conv["mode"]
    model = model or conv["model"]
    auto = model == "auto"
    if auto:  # "Auto" in the picker: the best model for this mode; attached images switch to the vision model below
        model = {"chat": DEFAULT_CHAT_MODEL, "code": DEFAULT_CODE_MODEL}.get(mode, DEFAULT_AGENT_MODEL)
    ws = Path(conv["workspace"]).resolve()
    ws.mkdir(parents=True, exist_ok=True)
    history = conv["messages"]
    todos = conv["todos"]
    STOP[conv_id] = False
    PERM[conv_id] = perm
    await asyncio.to_thread(image_gen.unload)  # free the GPU for the language model

    # Detect from the user's own words, not from attached file text.
    lang = detect_language(user_text.split("\n\n<file name=")[0])
    user_msg = {"role": "user", "content": user_text}
    if images:
        user_msg["images"] = images
    history.append(user_msg)
    turn_start = len(history)
    if conv["title"] == "New chat":
        db.save(conv_id, title=user_text.strip().splitlines()[0][:60] or "New chat")

    pictures = image_gen.status()["available"]
    schemas = tools.SCHEMAS if mode != "chat" else (tools.CHAT_SCHEMAS if pictures else None)
    steps = MAX_AGENT_STEPS if mode != "chat" else (4 if pictures else 1)
    if images and pictures and _wants_edit(user_text):
        # "Is photo ka background badlo": keep the tool-using model and hand it the photo as the picture to edit.
        saved = [_save_upload(b) for b in images]
        user_msg.pop("images", None)
        user_msg["content"] += "\n\n[Attached photo: " + ", ".join(saved) + "]"
        images = None
    if images and not is_vision(model):
        # The text models can't see images; answer this turn with the local vision model.
        model, schemas, steps = VISION_MODEL, None, 1
        if not auto:
            yield {"type": "notice", "text": "Reading the image with the photo model"}
    # Text-only models reject image payloads, so old images stay out of their context.
    drop = {"thinking"} if is_vision(model) else {"thinking", "images"}

    try:
        for _ in range(steps):
            msgs = [_system(mode, ws, todos, lang)] + _trim([{k: v for k, v in m.items() if k not in drop} for m in history])
            if image_gen.busy():  # the picture model has the GPU; loading the chat model now would crash both
                yield {"type": "notice", "text": "A picture is being made on this PC; the reply starts right after it."}
                while image_gen.busy():
                    await asyncio.sleep(1)
            # A picture made in the previous step still holds the GPU; Ollama crashes loading next to it.
            await asyncio.to_thread(image_gen.unload)
            content, thinking, calls = "", "", []
            async for chunk in _ollama_stream(model, msgs, schemas, think):
                if STOP.get(conv_id):
                    break
                m = chunk.get("message", {})
                if m.get("thinking"):
                    thinking += m["thinking"]
                    yield {"type": "thinking", "text": m["thinking"]}
                if m.get("content"):
                    content += m["content"]
                    yield {"type": "token", "text": m["content"]}
                if m.get("tool_calls"):
                    calls.extend(m["tool_calls"])
                if chunk.get("done"):
                    yield {"type": "stats", "eval_count": chunk.get("eval_count"),
                           "eval_duration": chunk.get("eval_duration")}
            if not calls and schemas:
                calls = _parse_inline_tool_calls(content)
                if calls:
                    content = re.sub(r"<tool_call>.*?</tool_call>", "", content, flags=re.S).strip()
            asst = {"role": "assistant", "content": content}
            if thinking:
                asst["thinking"] = thinking
            if calls:
                asst["tool_calls"] = calls
            history.append(asst)
            db.save(conv_id, messages=history)
            if STOP.get(conv_id) or not calls:
                break

            results = []
            for call in calls:
                fn = call.get("function", {})
                name = fn.get("name", "")
                args = fn.get("arguments") or {}
                if isinstance(args, str):
                    try:
                        args = json.loads(args)
                    except json.JSONDecodeError:
                        args = {}
                cid = uuid.uuid4().hex[:8]
                yield {"type": "tool_call", "id": cid, "name": name, "args": args}

                if name == "todo_write":
                    todos = [{"content": t.get("content") or t.get("task") or t.get("title") or "",
                              "status": t.get("status", "pending")}
                             for t in args.get("todos", []) if isinstance(t, dict)]
                    db.save(conv_id, todos=todos)
                    yield {"type": "todos", "todos": todos}
                    result, ok = "Todo list updated.", True
                else:
                    approved = True
                    if mode == "chat" and name in tools.IMAGE_TOOLS:
                        args.pop("path", None)  # Chat has no project folder: pictures go to the gallery
                        if name == "generate_image":  # local models pick "fast" on their own; quality unless asked
                            args["preset"] = "fast" if FAST_ASK.search(user_text) else "quality"
                    if name in ("edit_image", "add_text_to_image") and not args.get("image"):
                        args["image"] = _latest_image(history)
                    if _needs_approval(name, PERM.get(conv_id, perm), args):
                        fut = asyncio.get_running_loop().create_future()
                        PENDING[cid] = fut
                        yield {"type": "approval", "id": cid, "name": name, "args": args}
                        try:
                            approved = await fut
                        finally:
                            PENDING.pop(cid, None)
                    if not approved:
                        result, ok = "The user denied this action. Ask them what to do instead, or try another approach.", False
                    else:
                        try:
                            result = await asyncio.to_thread(tools.execute, ws, name, args)
                            ok = True
                        except tools.ToolError as e:
                            result, ok = f"Error: {e}", False
                        except Exception as e:  # keep the agent alive on unexpected errors
                            result, ok = f"Error ({type(e).__name__}): {e}", False
                yield {"type": "tool_result", "id": cid, "name": name, "ok": ok, "result": result[:4000]}
                history.append({"role": "tool", "tool_name": name, "content": result})
                db.save(conv_id, messages=history)
                results.append((name, ok))
                if STOP.get(conv_id):
                    break
            if STOP.get(conv_id):
                break
            text_due = (any(n == "generate_image" for n, _ in results) and TEXT_ASK.search(user_text)
                        and not any(m.get("tool_name") == "add_text_to_image" for m in history[turn_start:]))
            if mode == "chat" and results and all(n in tools.IMAGE_TOOLS and ok for n, ok in results) and not text_due:
                done = PICTURE_DONE[lang]
                yield {"type": "token", "text": done}
                history.append({"role": "assistant", "content": done})
                break
    except httpx.ConnectError:
        yield {"type": "error", "text": "Ollama is not running. Start it (run start.ps1) and try again."}
    except Exception as e:
        yield {"type": "error", "text": str(e)}
    finally:
        db.save(conv_id, messages=history)
        STOP.pop(conv_id, None)
        PERM.pop(conv_id, None)
    yield {"type": "done"}
