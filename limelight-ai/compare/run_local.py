"""Run the comparison prompts on local models exactly as Limelight's Chat mode would (same system prompt,
language rule and sampling), and save answers + timing to compare/results.json.

Usage: python compare/run_local.py gpt-oss:20b qwen3:8b ...
"""
import asyncio
import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT.parent / "server"))
import agent  # noqa: E402

OUT = ROOT / "results.json"


async def ask(model, prompt):
    lang = agent.detect_language(prompt)
    msgs = [agent._system("chat", ROOT, [], lang), {"role": "user", "content": prompt}]
    text, t0, first, stats = "", time.time(), None, {}
    async for chunk in agent._ollama_stream(model, msgs, None, None):
        m = chunk.get("message", {})
        if m.get("content"):
            first = first or time.time()
            text += m["content"]
        if chunk.get("done"):
            stats = chunk
    dur = stats.get("eval_duration") or 1
    return {"answer": text.strip(), "seconds": round(time.time() - t0, 1),
            "first_token_s": round((first or time.time()) - t0, 1),
            "tok_per_s": round(stats.get("eval_count", 0) / (dur / 1e9), 1)}


async def main(models):
    prompts = json.loads((ROOT / "prompts.json").read_text(encoding="utf-8"))
    results = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {}
    for model in models:
        await agent.warm(model)
        for p in prompts:
            key = str(p["id"])
            if results.get(model, {}).get(key, {}).get("answer"):
                continue  # resume: skip answers we already have
            try:
                r = await ask(model, p["prompt"])
            except Exception as e:
                r = {"answer": f"(error: {e})", "seconds": 0, "first_token_s": 0, "tok_per_s": 0}
            results.setdefault(model, {})[key] = r
            OUT.write_text(json.dumps(results, ensure_ascii=False, indent=1), encoding="utf-8")
            print(f"{model} #{key}: {r['seconds']}s, {r['tok_per_s']} tok/s", flush=True)


asyncio.run(main(sys.argv[1:]))
