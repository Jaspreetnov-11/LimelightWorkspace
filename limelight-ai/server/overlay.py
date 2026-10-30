"""Put text on an image with real typography (Hindi/Devanagari included) by rendering HTML in headless Edge.

Image models can't spell Devanagari, and Pillow here has no complex-script shaping, so a browser does the layout:
matras and conjuncts come out right, and CSS gives shadows, bands and wrapping for free.
"""
import html
import shutil
import subprocess
import tempfile
from pathlib import Path

from config import ROOT

FONTS = ROOT / "web" / "fonts" / "hindi"
EDGE = next((p for p in (r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
                         r"C:\Program Files\Microsoft\Edge\Application\msedge.exe") if Path(p).exists()), None)

# style -> (font file, CSS weight); every font here covers Devanagari and Latin.
STYLES = {
    "bold": ("Mukta-ExtraBold.ttf", 800),
    "regular": ("Mukta-Medium.ttf", 500),
    "display": ("RozhaOne-Regular.ttf", 400),
    "playful": ("YatraOne-Regular.ttf", 400),
}
SIZES = {"small": 0.04, "medium": 0.06, "large": 0.085, "xl": 0.12}  # share of the image width
POSITIONS = {  # top/left as % of the canvas, plus the CSS transform that anchors the box there
    "top": (6, 50, "translate(-50%, 0)"), "center": (50, 50, "translate(-50%, -50%)"),
    "bottom": (94, 50, "translate(-50%, -100%)"), "top-left": (6, 5, "none"),
    "top-right": (6, 95, "translate(-100%, 0)"), "bottom-left": (94, 5, "translate(0, -100%)"),
    "bottom-right": (94, 95, "translate(-100%, -100%)"),
}


def available():
    return bool(EDGE)


def render(src: Path, out: Path, texts: list[dict]):
    """texts: [{text, position, size, style, color, background}] -> writes out (PNG, same size as src)."""
    from PIL import Image
    with Image.open(src) as im:
        w, h = im.size
    faces = "".join(f"@font-face{{font-family:'{k}';src:url('{(FONTS / f).as_uri()}');font-weight:{wt};}}"
                    for k, (f, wt) in STYLES.items())
    boxes = []
    for t in texts:
        top, left, tf = POSITIONS.get(t.get("position", "bottom"), POSITIONS["bottom"])
        style = t.get("style", "bold") if t.get("style") in STYLES else "bold"
        px = round(w * SIZES.get(t.get("size", "large"), SIZES["large"]))
        color = html.escape(t.get("color") or "#ffffff", quote=True)
        bg = t.get("background", "shadow")
        deco = ("background:rgba(0,0,0,.55);padding:.25em .6em;border-radius:.25em;" if bg == "band" else
                "text-shadow:0 .04em .25em rgba(0,0,0,.75),0 0 .08em rgba(0,0,0,.6);" if bg == "shadow" else "")
        align = "left" if "left" in t.get("position", "") else "right" if "right" in t.get("position", "") else "center"
        text = html.escape(str(t.get("text", ""))).replace("\n", "<br>")
        # max-content: a box anchored at left:50% would otherwise wrap at half the image width
        boxes.append(f"<div style=\"position:absolute;top:{top}%;left:{left}%;transform:{tf};width:max-content;max-width:90%;"
                     f"font-family:'{style}','Nirmala UI',sans-serif;font-weight:{STYLES[style][1]};font-size:{px}px;"
                     f"line-height:1.2;color:{color};text-align:{align};{deco}\">{text}</div>")
    page = (f"<!doctype html><meta charset=utf-8><style>{faces}html,body{{margin:0;width:{w}px;height:{h}px;overflow:hidden}}"
            f"img{{position:absolute;inset:0;width:{w}px;height:{h}px}}</style>"
            f"<img src=\"{src.resolve().as_uri()}\">{''.join(boxes)}")
    tmp = Path(tempfile.mkdtemp(prefix="ll-text-"))
    try:
        (tmp / "page.html").write_text(page, encoding="utf-8")
        shot = tmp / "shot.png"
        subprocess.run([EDGE, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
                        f"--user-data-dir={tmp / 'profile'}", "--allow-file-access-from-files",
                        "--virtual-time-budget=3000", "--force-device-scale-factor=1", f"--window-size={w},{h}",
                        f"--screenshot={shot}", (tmp / "page.html").as_uri()],
                       capture_output=True, timeout=90)
        if not shot.exists():
            raise RuntimeError("Edge could not render the text")
        with Image.open(shot) as im:
            (im if im.size == (w, h) else im.crop((0, 0, w, h))).convert("RGB").save(out)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    return out
