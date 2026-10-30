"""Agent tools (Claude Code style): files, search, shell, documents, todos, images.

Every path is confined to the conversation's workspace folder.
"""
import fnmatch
import os
import re
import subprocess
import sys
from pathlib import Path

MAX_OUT = 12000
SKIP_DIRS = {".git", "node_modules", "__pycache__", ".venv", "venv", "dist", "build", ".next"}

# Which tools change things (and so need approval in "ask" mode).
EDIT_TOOLS = {"write_file", "edit_file", "create_docx", "create_xlsx", "generate_image", "edit_image", "add_text_to_image"}
SHELL_TOOLS = {"run_command"}


class ToolError(Exception):
    pass


def _clip(s, n=MAX_OUT):
    return s if len(s) <= n else s[:n] + f"\n... [truncated {len(s) - n} chars]"


def _resolve(ws: Path, p: str) -> Path:
    target = (ws / (p or ".")).resolve() if not os.path.isabs(p or "") else Path(p).resolve()
    if target != ws and ws not in target.parents:
        raise ToolError(f"Path '{p}' is outside the workspace {ws}")
    return target


def _rel(ws, p):
    try:
        return str(p.relative_to(ws)).replace("\\", "/") or "."
    except ValueError:
        return str(p)


def _walk(ws: Path, base: Path):
    for root, dirs, files in os.walk(base):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for f in files:
            yield Path(root) / f


def extract_text(path: Path) -> str:
    """Read text from plain files and common office formats."""
    ext = path.suffix.lower()
    if ext == ".pdf":
        from pypdf import PdfReader
        r = PdfReader(str(path))
        return "\n\n".join(f"--- page {i + 1} ---\n{p.extract_text() or ''}" for i, p in enumerate(r.pages))
    if ext == ".docx":
        import docx
        d = docx.Document(str(path))
        parts = [p.text for p in d.paragraphs]
        for t in d.tables:
            for row in t.rows:
                parts.append(" | ".join(c.text for c in row.cells))
        return "\n".join(parts)
    if ext in (".xlsx", ".xlsm"):
        import openpyxl
        wb = openpyxl.load_workbook(str(path), data_only=True, read_only=True)
        out = []
        for ws in wb.worksheets:
            out.append(f"--- sheet: {ws.title} ---")
            for row in ws.iter_rows(values_only=True):
                if any(v is not None for v in row):
                    out.append(" | ".join("" if v is None else str(v) for v in row))
        return "\n".join(out)
    if ext == ".pptx":
        from pptx import Presentation
        prs = Presentation(str(path))
        out = []
        for i, s in enumerate(prs.slides, 1):
            out.append(f"--- slide {i} ---")
            for sh in s.shapes:
                if sh.has_text_frame:
                    out.append(sh.text_frame.text)
        return "\n".join(out)
    return path.read_text(encoding="utf-8", errors="replace")


# ---------------------------------------------------------------- tool impls

def list_dir(ws, path="."):
    p = _resolve(ws, path)
    if not p.is_dir():
        raise ToolError(f"Not a directory: {path}")
    rows = []
    for c in sorted(p.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower())):
        if c.name in SKIP_DIRS:
            continue
        rows.append(f"{c.name}/" if c.is_dir() else f"{c.name}  ({c.stat().st_size} bytes)")
    return "\n".join(rows) or "(empty)"


def read_file(ws, path, offset=1, limit=400):
    p = _resolve(ws, path)
    if not p.is_file():
        raise ToolError(f"File not found: {path}")
    text = extract_text(p)
    lines = text.splitlines()
    offset = max(1, int(offset or 1))
    limit = int(limit or 400)
    chunk = lines[offset - 1: offset - 1 + limit]
    body = "\n".join(f"{i:>5}\t{l}" for i, l in enumerate(chunk, offset))
    more = f"\n... ({len(lines)} lines total; use offset to read more)" if offset - 1 + limit < len(lines) else ""
    return _clip(body + more)


def write_file(ws, path, content):
    p = _resolve(ws, path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    return f"Wrote {len(content)} chars to {_rel(ws, p)}"


def edit_file(ws, path, old_string, new_string, replace_all=False):
    p = _resolve(ws, path)
    if not p.is_file():
        raise ToolError(f"File not found: {path}")
    text = p.read_text(encoding="utf-8")
    n = text.count(old_string)
    if n == 0:
        raise ToolError("old_string not found in file. Read the file again and copy the exact text.")
    if n > 1 and not replace_all:
        raise ToolError(f"old_string appears {n} times; add more context or set replace_all=true.")
    text = text.replace(old_string, new_string) if replace_all else text.replace(old_string, new_string, 1)
    p.write_text(text, encoding="utf-8")
    return f"Edited {_rel(ws, p)} ({n if replace_all else 1} replacement)"


def glob_files(ws, pattern, path="."):
    base = _resolve(ws, path)
    pat = pattern.replace("\\", "/")
    hits = []
    for f in _walk(ws, base):
        rel = _rel(base, f)
        if fnmatch.fnmatch(rel, pat) or fnmatch.fnmatch(f.name, pat):
            hits.append(_rel(ws, f))
        if len(hits) >= 300:
            break
    return "\n".join(hits) or "No files matched."


def grep(ws, pattern, path=".", glob="*", ignore_case=False):
    base = _resolve(ws, path)
    rx = re.compile(pattern, re.I if ignore_case else 0)
    out = []
    files = [base] if base.is_file() else _walk(ws, base)
    for f in files:
        if not fnmatch.fnmatch(f.name, glob or "*"):
            continue
        try:
            with open(f, encoding="utf-8", errors="strict") as fh:
                for i, line in enumerate(fh, 1):
                    if rx.search(line):
                        out.append(f"{_rel(ws, f)}:{i}: {line.rstrip()[:300]}")
                        if len(out) >= 200:
                            return "\n".join(out) + "\n... (more matches truncated)"
        except (UnicodeDecodeError, OSError):
            continue
    return "\n".join(out) or "No matches."


def run_command(ws, command, timeout=120):
    timeout = min(int(timeout or 120), 600)
    cwd = str(ws)
    if sys.platform == "win32":
        if len(cwd) > 240:  # CreateProcess can't use a cwd beyond MAX_PATH; cd inside the shell instead
            command = f"Set-Location -LiteralPath '{cwd}'; {command}"
            cwd = None
        args = ["powershell", "-NoProfile", "-NonInteractive", "-Command", command]
    else:
        args = ["bash", "-lc", command]
    try:
        r = subprocess.run(args, cwd=cwd, capture_output=True, text=True,
                           timeout=timeout, encoding="utf-8", errors="replace")
    except subprocess.TimeoutExpired:
        return f"Command timed out after {timeout}s"
    out = (r.stdout or "") + (("\n[stderr]\n" + r.stderr) if r.stderr else "")
    return _clip(f"exit code {r.returncode}\n{out.strip()}")


def create_docx(ws, path, content, title=""):
    """content: simple markdown (# headings, - bullets, | tables |, paragraphs)."""
    import docx
    p = _resolve(ws, path)
    p.parent.mkdir(parents=True, exist_ok=True)
    d = docx.Document()
    if title:
        d.add_heading(title, 0)
    table_rows = []

    def flush_table():
        if not table_rows:
            return
        cols = max(len(r) for r in table_rows)
        t = d.add_table(rows=0, cols=cols)
        t.style = "Table Grid"
        for r in table_rows:
            cells = t.add_row().cells
            for i, v in enumerate(r):
                cells[i].text = v
        table_rows.clear()

    for line in content.splitlines():
        s = line.strip()
        if s.startswith("|"):
            cells = [c.strip() for c in s.strip("|").split("|")]
            if not all(re.fullmatch(r":?-+:?", c) for c in cells if c):
                table_rows.append(cells)
            continue
        flush_table()
        if not s:
            continue
        m = re.match(r"(#{1,4})\s+(.*)", s)
        if m:
            d.add_heading(m.group(2), len(m.group(1)))
        elif re.match(r"[-*]\s+", s):
            d.add_paragraph(re.sub(r"^[-*]\s+", "", s), style="List Bullet")
        elif re.match(r"\d+[.)]\s+", s):
            d.add_paragraph(re.sub(r"^\d+[.)]\s+", "", s), style="List Number")
        else:
            d.add_paragraph(s.replace("**", ""))
    flush_table()
    d.save(str(p))
    return f"Created Word document {_rel(ws, p)}"


def create_xlsx(ws, path, sheets):
    """sheets: {"Sheet name": [[header...], [row...], ...]}"""
    import openpyxl
    from openpyxl.styles import Font
    p = _resolve(ws, path)
    p.parent.mkdir(parents=True, exist_ok=True)
    wb = openpyxl.Workbook()
    wb.remove(wb.active)
    if isinstance(sheets, list):
        sheets = {"Sheet1": sheets}
    for name, rows in sheets.items():
        sh = wb.create_sheet(str(name)[:31])
        for r in rows:
            sh.append(r)
        for c in sh[1] if sh.max_row else []:
            c.font = Font(bold=True)
    wb.save(str(p))
    return f"Created Excel file {_rel(ws, p)}"


def _deliver(ws, rec, path, verb):
    src = Path(rec["path"])
    if path:
        dst = _resolve(ws, path)
        dst.parent.mkdir(parents=True, exist_ok=True)
        dst.write_bytes(src.read_bytes())
        return f"Image {verb} and saved to {_rel(ws, dst)} (also in gallery: {rec['url']})"
    return f"Image {verb}: {rec['url']}"


def _image_ref(ws, ref):
    """A picture the user means: a gallery URL like /images/img_123.png, or a file in the workspace."""
    import images
    if not ref:
        raise ToolError("No image yet. Make one with generate_image first, or ask the user to attach a photo.")
    m = re.search(r"/?images/(img_\d+\.png)", ref)
    p = (images.IMAGES_DIR / m.group(1)) if m else _resolve(ws, ref)
    if not p.is_file():
        raise ToolError(f"Image not found: {ref}")
    return p


def gen_image(ws, prompt, path="", preset="quality", negative_prompt="", aspect="square"):
    import images
    preset = "fast" if preset == "fast" else "quality"  # models also send "best", "high", "hd"...
    return _deliver(ws, images.generate(prompt=prompt, negative=negative_prompt, preset=preset, aspect=aspect),
                    path, "generated")


def edit_image(ws, instruction, image="", path=""):
    import images
    try:
        return _deliver(ws, images.edit(_image_ref(ws, image), instruction), path, "edited")
    except RuntimeError as e:
        raise ToolError(str(e))


def add_text_to_image(ws, texts, image="", path=""):
    import images
    if isinstance(texts, dict):
        texts = [texts]
    if not texts or not all(isinstance(t, dict) and t.get("text") for t in texts):
        raise ToolError('texts must be a list like [{"text": "...", "position": "top"}]')
    return _deliver(ws, images.add_text(_image_ref(ws, image), texts), path, "with text")


# ---------------------------------------------------------------- schemas

def _fn(name, desc, props, required):
    return {"type": "function", "function": {
        "name": name, "description": desc,
        "parameters": {"type": "object", "properties": props, "required": required}}}


S = {"type": "string"}
I = {"type": "integer"}
B = {"type": "boolean"}

SCHEMAS = [
    _fn("list_dir", "List files and folders in a directory of the workspace.", {"path": S}, []),
    _fn("read_file", "Read a file with line numbers. Also reads PDF, DOCX, XLSX, PPTX as text.",
        {"path": S, "offset": I, "limit": I}, ["path"]),
    _fn("write_file", "Create or overwrite a text file with the full content.",
        {"path": S, "content": S}, ["path", "content"]),
    _fn("edit_file", "Replace exact text in a file. old_string must match exactly and be unique unless replace_all.",
        {"path": S, "old_string": S, "new_string": S, "replace_all": B}, ["path", "old_string", "new_string"]),
    _fn("glob", "Find files by name pattern, e.g. '**/*.py' or '*.docx'.", {"pattern": S, "path": S}, ["pattern"]),
    _fn("grep", "Search file contents with a regex. Returns file:line: text.",
        {"pattern": S, "path": S, "glob": S, "ignore_case": B}, ["pattern"]),
    _fn("run_command", "Run a shell command (PowerShell on Windows) in the workspace folder. Use for builds, tests, git, python scripts.",
        {"command": S, "timeout": I}, ["command"]),
    _fn("create_docx", "Create a Word .docx from simple markdown (# headings, - bullets, | tables |).",
        {"path": S, "content": S, "title": S}, ["path", "content"]),
    _fn("create_xlsx", "Create an Excel .xlsx. sheets is an object: {\"Sheet1\": [[\"Header\",...],[row...]]}.",
        {"path": S, "sheets": {"type": "object"}}, ["path", "sheets"]),
    _fn("generate_image",
        "Create a picture. prompt: a detailed ENGLISH description (subject, setting, composition, colours, lighting, "
        "style; camera and lens for photos), even when the user writes Hindi or Hinglish. Never ask for words or "
        "letters in the picture except a very short English word; add any other text with add_text_to_image. "
        "Leave preset empty for the best quality; preset=fast only when the user wants a quick rough draft. "
        "path: only when the user asks to save the picture into the project folder.",
        {"prompt": S, "aspect": {"type": "string", "enum": ["square", "portrait", "landscape", "story", "wide"]},
         "preset": {"type": "string", "enum": ["quality", "fast"]}, "negative_prompt": S, "path": S}, ["prompt"]),
    _fn("edit_image",
        "Change an existing picture by instruction, keeping the rest of it: colours, background, remove or add "
        "objects, change clothes, style. instruction: one short ENGLISH sentence. image: leave empty for the "
        "latest picture in this chat, or give its /images/... URL.",
        {"instruction": S, "image": S, "path": S}, ["instruction"]),
    _fn("add_text_to_image",
        "Write text on a picture with correct Hindi (Devanagari) and English typography: headlines, captions, "
        "dates, names. image: leave empty for the latest picture. Each text item: text (exact words, any language), "
        "position (top|center|bottom|top-left|top-right|bottom-left|bottom-right), size (small|medium|large|xl), "
        "style (bold|regular|display|playful), color (CSS colour), background (shadow|band|none).",
        {"texts": {"type": "array", "items": {"type": "object", "properties": {
            "text": S, "position": S, "size": S, "style": S, "color": S, "background": S}}},
         "image": S, "path": S}, ["texts"]),
    _fn("todo_write", "Write the task list for this job. Send the whole list each time. status: pending|in_progress|completed.",
        {"todos": {"type": "array", "items": {"type": "object", "properties": {"content": S, "status": S}}}}, ["todos"]),
]

IMPLS = {
    "list_dir": list_dir, "read_file": read_file, "write_file": write_file, "edit_file": edit_file,
    "glob": glob_files, "grep": grep, "run_command": run_command, "create_docx": create_docx,
    "create_xlsx": create_xlsx, "generate_image": gen_image, "edit_image": edit_image,
    "add_text_to_image": add_text_to_image,
}
# Chat mode gets only the picture tools (they write to the gallery, not the workspace).
IMAGE_TOOLS = {"generate_image", "edit_image", "add_text_to_image"}
CHAT_SCHEMAS = [s for s in SCHEMAS if s["function"]["name"] in IMAGE_TOOLS]


def execute(ws: Path, name: str, args: dict) -> str:
    fn = IMPLS.get(name)
    if not fn:
        raise ToolError(f"Unknown tool {name}")
    # Local models sometimes add arguments a tool doesn't take; drop them instead of failing.
    import inspect
    params = inspect.signature(fn).parameters
    args = {k: v for k, v in (args or {}).items() if k in params and k != "ws"}
    try:
        return fn(ws, **args)
    except TypeError as e:
        raise ToolError(f"Bad arguments for {name}: {e}")
