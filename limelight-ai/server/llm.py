"""The Limelight AI engine: llama.cpp's server (router mode, tools/llama/start-engine.ps1), in place of Ollama.

The rest of the app keeps its Ollama-shaped messages and chunks. This module translates both ways:
- out: history (assistant tool_calls with dict arguments, tool results by name, user images as base64) and options
  become an OpenAI-style request; thinking is switched with chat_template_kwargs / reasoning_effort
- in:  streamed deltas come back as {"message": {"content", "thinking", "tool_calls"}, "done", "eval_count", ...}
Model names: the app may still say "qwen3:8b"; the engine calls it "qwen3-8b" (engine_name).
"""
import json
import uuid

import httpx

from config import LLM_URL


class EngineError(RuntimeError):
    pass


def engine_name(model: str) -> str:
    """'qwen3:8b' -> 'qwen3-8b' (the engine's name has no ':'; old conversations keep working)."""
    return (model or "").strip().lower().replace(":", "-")


def _mime(b64: str) -> str:
    return "image/png" if b64.startswith("iVBOR") else "image/webp" if b64.startswith("UklGR") else "image/jpeg"


def to_openai(messages):
    """Ollama-shaped history -> OpenAI chat messages (tool calls get ids; tool results answer them in order)."""
    out, open_ids = [], []
    for m in messages:
        role = m.get("role")
        if role == "assistant":
            msg = {"role": "assistant", "content": m.get("content") or ""}
            if m.get("tool_calls"):
                open_ids = []
                msg["tool_calls"] = []
                for c in m["tool_calls"]:
                    fn = c.get("function", {})
                    args = fn.get("arguments") or {}
                    cid = c.get("id") or "call_" + uuid.uuid4().hex[:8]
                    open_ids.append(cid)
                    msg["tool_calls"].append({"id": cid, "type": "function", "function": {
                        "name": fn.get("name", ""), "arguments": args if isinstance(args, str) else json.dumps(args)}})
            out.append(msg)
        elif role == "tool":
            cid = open_ids.pop(0) if open_ids else "call_" + uuid.uuid4().hex[:8]
            out.append({"role": "tool", "tool_call_id": cid, "content": m.get("content") or ""})
        elif role == "user" and m.get("images"):
            parts = [{"type": "text", "text": m.get("content") or ""}]
            parts += [{"type": "image_url", "image_url": {"url": f"data:{_mime(b)};base64,{b}"}} for b in m["images"]]
            out.append({"role": "user", "content": parts})
        else:
            out.append({"role": role, "content": m.get("content") or ""})
    return out


def _body(model, messages, options=None, think=None, tools=None, stream=True):
    o = dict(options or {})
    body = {"model": engine_name(model), "messages": to_openai(messages), "stream": stream}
    if "num_predict" in o:
        body["max_tokens"] = o.pop("num_predict")
    o.pop("num_ctx", None)                      # set per model in the engine (models.ini)
    for k in ("temperature", "top_p", "top_k", "repeat_penalty", "presence_penalty", "min_p", "seed"):
        if k in o:
            body[k] = o[k]
    if tools:
        body["tools"] = tools
    name = engine_name(model)
    if "gpt-oss" in name:
        body["reasoning_effort"] = "high" if think else "low"       # gpt-oss always reasons, a little or a lot
    elif think is not None:
        body["chat_template_kwargs"] = {"enable_thinking": bool(think)}
    if stream:
        body["stream_options"] = {"include_usage": True}
    return body


async def chat_stream(model, messages, options=None, think=None, tools=None):
    """Streams Ollama-shaped chunks. Tool calls arrive whole in the last chunk (their arguments as a dict)."""
    calls, stats = {}, {}
    async with httpx.AsyncClient(timeout=None) as c:
        async with c.stream("POST", f"{LLM_URL}/v1/chat/completions", json=_body(model, messages, options, think, tools)) as r:
            if r.status_code != 200:
                raise EngineError(f"AI engine error {r.status_code}: {(await r.aread()).decode(errors='replace')[:500]}")
            async for line in r.aiter_lines():
                if not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if data == "[DONE]":
                    break
                ev = json.loads(data)
                if ev.get("timings"):
                    t = ev["timings"]
                    stats = {"eval_count": t.get("predicted_n"), "eval_duration": int((t.get("predicted_ms") or 0) * 1e6)}
                if not ev.get("choices"):
                    continue
                d = ev["choices"][0].get("delta") or {}
                for tc in d.get("tool_calls") or []:
                    slot = calls.setdefault(tc.get("index", 0), {"name": "", "args": ""})
                    fn = tc.get("function") or {}
                    slot["name"] += fn.get("name") or ""
                    slot["args"] += fn.get("arguments") or ""
                msg = {}
                if d.get("reasoning_content"):
                    msg["thinking"] = d["reasoning_content"]
                if d.get("content"):
                    msg["content"] = d["content"]
                if msg:
                    yield {"message": msg, "done": False}
    done = {"message": {}, "done": True, **stats}
    if calls:
        out = []
        for slot in calls.values():
            try:
                args = json.loads(slot["args"] or "{}")
            except json.JSONDecodeError:
                args = slot["args"]                 # agent.py retries the parse and falls back to {}
            out.append({"function": {"name": slot["name"], "arguments": args}})
        done["message"]["tool_calls"] = out
    yield done


def complete(model, messages, options=None, think=False, timeout=120):
    """One whole reply, no streaming (short helper jobs: picture descriptions, prompt rewrites)."""
    r = httpx.post(f"{LLM_URL}/v1/chat/completions", json=_body(model, messages, options, think, stream=False),
                   timeout=timeout)
    if r.status_code != 200:
        raise EngineError(f"AI engine error {r.status_code}: {r.text[:300]}")
    return (r.json()["choices"][0]["message"].get("content") or "").strip()


async def acomplete(model, messages, options=None, think=False, timeout=120):
    async with httpx.AsyncClient(timeout=timeout) as c:
        r = await c.post(f"{LLM_URL}/v1/chat/completions", json=_body(model, messages, options, think, stream=False))
    if r.status_code != 200:
        raise EngineError(f"AI engine error {r.status_code}: {r.text[:300]}")
    return (r.json()["choices"][0]["message"].get("content") or "").strip()


# ---------------------------------------------------------------- models

def models(timeout=3):
    """{'running': bool, 'models': [names], 'loaded': [names]} - what the model picker shows."""
    try:
        data = httpx.get(f"{LLM_URL}/models", timeout=timeout).json().get("data", [])
    except Exception:
        return {"running": False, "models": [], "loaded": []}
    names = sorted(m["id"] for m in data)
    loaded = [m["id"] for m in data if (m.get("status") or {}).get("value") in ("loaded", "loading")]
    return {"running": True, "models": names, "loaded": loaded}


async def amodels(timeout=3):
    try:
        async with httpx.AsyncClient(timeout=timeout) as c:
            data = (await c.get(f"{LLM_URL}/models")).json().get("data", [])
    except Exception:
        return {"running": False, "models": [], "loaded": []}
    return {"running": True, "models": sorted(m["id"] for m in data),
            "loaded": [m["id"] for m in data if (m.get("status") or {}).get("value") in ("loaded", "loading")]}


async def load(model, timeout=300):
    async with httpx.AsyncClient(timeout=timeout) as c:
        await c.post(f"{LLM_URL}/models/load", json={"model": engine_name(model)})


def unload_all(timeout=30):
    """Free the GPU (before a picture job): every loaded model goes."""
    for name in models().get("loaded", []):
        httpx.post(f"{LLM_URL}/models/unload", json={"model": name}, timeout=timeout)
    return not models().get("loaded")


async def refresh():
    """Re-read the model folder (after a download)."""
    async with httpx.AsyncClient(timeout=10) as c:
        await c.get(f"{LLM_URL}/models", params={"reload": 1})
