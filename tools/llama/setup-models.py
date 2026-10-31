"""Limelight AI engine (llama.cpp): builds the model folder and models.ini from what Ollama already downloaded.

    python setup-models.py                         this PC   (Ollama store: D:\\AI Models\\ollama\\models)
    python setup-models.py --ollama X --models Y   another PC (e.g. NAYA B)

Each usable Ollama model file is hard-linked into the models folder under a readable name: no copy, no extra
space, and it stays after Ollama is removed. Models llama.cpp can't read the way Ollama stored them (vision models,
some converted by Ollama itself) are listed as "download" instead. Safe to run again.
"""
import argparse
import json
import os
import struct
from pathlib import Path

INT = {0: "<B", 1: "<b", 2: "<H", 3: "<h", 4: "<I", 5: "<i", 6: "<f", 7: "<?", 10: "<Q", 11: "<q", 12: "<d"}
SIZE = {0: 1, 1: 1, 2: 2, 3: 2, 4: 4, 5: 4, 6: 4, 7: 1, 10: 8, 11: 8, 12: 8}
# llama.cpp's names for architectures Ollama stores under its own name (none needed today; kept for clarity)
LLAMA_ARCHS = {"qwen3", "qwen3moe", "qwen2", "llama", "gemma3", "nomic-bert", "bert", "granite", "granitehybrid",
               "mistral3", "phi3", "bailingmoe2", "gpt-oss"}
EMBEDDING_ARCHS = {"nomic-bert", "bert"}


def gguf_info(path):
    """architecture and whether the file carries its own chat template (needed for tool calling)."""
    info = {"arch": None, "template": False}
    with open(path, "rb") as f:
        if f.read(4) != b"GGUF":
            return info
        f.read(4)
        _, n_kv = struct.unpack("<QQ", f.read(16))

        def s():
            n, = struct.unpack("<Q", f.read(8))
            return f.read(n).decode("utf-8", "replace")

        for _ in range(n_kv):
            k = s()
            t, = struct.unpack("<I", f.read(4))
            if t == 8:
                v = s()
            elif t == 9:
                et, = struct.unpack("<I", f.read(4)); n, = struct.unpack("<Q", f.read(8))
                if et == 8:
                    for _ in range(n): s()
                else:
                    f.seek(SIZE[et] * n, 1)
                v = None
            else:
                v = struct.unpack(INT[t], f.read(SIZE[t]))[0]
            if k == "general.architecture":
                info["arch"] = v
            elif k == "tokenizer.chat_template":
                info["template"] = True
    return info


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ollama", default=r"D:\AI Models\ollama\models")
    ap.add_argument("--models", default=r"D:\AI Models\llama")
    ap.add_argument("--ctx", type=int, default=16384)
    a = ap.parse_args()
    store, out = Path(a.ollama), Path(a.models)
    out.mkdir(parents=True, exist_ok=True)

    sections, todo = [], []
    lib = store / "manifests" / "registry.ollama.ai" / "library"
    for model_dir in sorted(lib.iterdir()) if lib.exists() else []:
        for tag in sorted(model_dir.iterdir()):
            name = f"{model_dir.name}:{tag.name}" if tag.name != "latest" else model_dir.name
            m = json.loads(tag.read_text())
            kinds = {l["mediaType"].rsplit(".", 1)[-1]: l for l in m["layers"]}
            blob = store / "blobs" / kinds["model"]["digest"].replace(":", "-")
            info = gguf_info(blob)
            embed = info["arch"] in EMBEDDING_ARCHS
            if "projector" in kinds or info["arch"] not in LLAMA_ARCHS or not (info["template"] or embed):
                why = ("vision model stored Ollama's way" if info["arch"] not in LLAMA_ARCHS or "projector" in kinds
                       else "no chat template in Ollama's copy")
                todo.append((name, why))
                continue
            target = out / (name.replace(":", "-") + ".gguf")
            if not target.exists():
                os.link(blob, target)                       # same drive: a second name for the same file
            # (engine names have no ":": its router reads "name:tag" as a download tag and mangles it;
            #  the apps keep using Ollama-style names, translated by llm.engine_name)
            sec = [f"[{name.replace(':', '-')}]", f"model = {target}"]
            if embed:
                sec += ["embeddings = true", "c = 8192"]
            sections.append("\n".join(sec))
            print(f"  ready     {name.replace(':', '-'):<24} {info['arch']:<11} (was {name} in Ollama)")

    # models downloaded for llama.cpp directly (folder per model: model + mmproj-*.gguf for vision)
    for d in sorted(p for p in out.iterdir() if p.is_dir()):
        main_file = next((f for f in sorted(d.glob("*.gguf")) if not f.name.startswith("mmproj")), None)
        if not main_file:
            continue
        sec = [f"[{d.name}]", f"model = {main_file}"]
        mm = next(iter(d.glob("mmproj*.gguf")), None)
        if mm:
            sec.append(f"mmproj = {mm}")
        sections.append("\n".join(sec))
        print(f"  ready     {d.name:<24} (downloaded{' + vision' if mm else ''})")

    ini = ["; Limelight AI engine (llama.cpp router). Made by setup-models.py - run it again after adding models.",
           "[*]", "jinja = true", f"c = {a.ctx}", "sleep-idle-seconds = 3600", "", *[s + "\n" for s in sections]]
    (out / "models.ini").write_text("\n".join(ini), encoding="utf-8")
    print(f"\n  {out / 'models.ini'}: {len(sections)} models")
    for name, why in todo:
        print(f"  download  {name:<24} ({why})")


if __name__ == "__main__":
    main()
