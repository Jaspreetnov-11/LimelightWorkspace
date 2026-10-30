# Design (Limelight Studio)

Design is Limelight's own local design tool, **Limelight Studio**. It mixes the best parts of Canva, Photoshop, Illustrator, CorelDRAW, InDesign/QuarkXPress, Lightroom, Figma and Blender. Code: `E:\Limelight Ai\limelight-studio`. It runs on **JASPREET, port 3330**. Inside the workspace it is the **Design** app.

---

## 1. What users can do

### Home page (`/`)
- **Editorial** look (chosen from 6 mockups, still at Studio's `/home-options.html`).
- Top bar: logo, Create · Designs · Design gallery (renamed from "Templates"), ← Workspace, AI settings, Open file.
- "Make it shine." heading with **New design** (custom size in px, mm, inch or feet) and **Start from template**.
- 12 size presets. **Your designs** with thumbnails and a trash button (deleted designs go to `Projects/_trash`). Templates in a masonry grid.

### Editor (all tabs)
- **File tabs on top** like Photoshop windows; each keeps its artboard, zoom and undo history. Open tabs are remembered.
- **Artboards**, each with its own size (for example an Insta post and a story in one file), in a floating glass pill above the canvas.
- **Bottom tab bar** styled exactly like Edit's: **Design · Vector · Book · 3D · Color**.
- Panels: tools → Properties (left) → canvas → right dock (Templates, Elements, Text, Brand, Uploads, AI Image, Layers, 3D) with labels under the icons.
- Pasteboard around the artboard is neutral grey `#3c3c3c` in all tabs.
- Photoshop-style **Layers panel**: kind filter, search, blend mode, opacity, locks, eye column, thumbnails, groups as folders, masks, fx → Drop Shadow, Smart Filters.
- Look: minimal graphite theme; Limelight yellow (#ffc21a) only for Export, active items and selection.

### The five tabs
| Tab | Like | Main tools |
|---|---|---|
| **Design** | Photoshop + Canva | Templates, text presets, Hindi fonts, photo frames, brand panel; full Photoshop toolbar in Photoshop's order with tool groups and shortcuts; options bar; Properties (document settings, rulers, guides); Image/Layer/Select/Filter menus; layer masks like Photoshop (up to 8192 px); Select and Mask (Alt+Ctrl+R); Generative Fill and Expand |
| **Vector** | Illustrator / CorelDRAW | Bezier pen, shapes, direct selection, add/convert anchor, Pathfinder (Unite, Minus front, Intersect, Exclude), clipping mask, convert to path, Image Trace, SVG import/export |
| **Book** | InDesign + QuarkXPress | Page size, margins, columns, facing pages, spreads, A-Master with page numbers and running heads, linked text boxes (Quark-style link tool K), Autoflow, overset tracking, text styles (Hindi too). A 300-paragraph story flowed across 11-12 pages in about 1.6 s |
| **3D** | Blender | Three.js scene: shapes, extruded Limelight mark, materials (gold, chrome, glass, neon), lights, shadows, gizmo. "Insert into design" places a 3D layer; double-click re-opens the scene |
| **Color** | Lightroom Develop (no Adobe branding) | Non-destructive photo editing on the GPU (WebGL2): presets, history, before/after, histogram, Basic, Tone Curve, Color Mixer, Color Grading, Detail, Effects; copy/paste settings |

**Smart Object model:** the design is the file. Vector, Book and 3D each open **one layer** of the design (like a Photoshop Smart Object), not the same design four times. Clicking Design puts it back in place.

### Exports
- PNG, JPG, SVG, PDF, **PSD**, **AI**, **CDR**, and **"All formats"** as one ZIP (also kept in `Exports\<design> - all formats <date>`). Rule: every tab must export AI, PSD and CDR.
- **PSD** has real structure: every object its own named layer, folders, editable Drop Shadow and Stroke, layer masks, blend mode and opacity, editable text with PostScript font names.
- **CDR, AI and vector PDF** are made by the installed **CorelDRAW 2025 on JASPREET** (`tools/corel.vbs`): real text in exact fonts and weights, Hindi editable, shapes and photos separate, true page size. Works only while JASPREET is on; about 10-20 s per page. A book exports as one multi-page CDR/PDF.
- PSD and SVG import.

### Live editing
- Two people with the same design open see each other's changes, selections and pointers live, with a green LIVE badge and coloured avatars. Names come from the workspace login.

---

## 2. Generative Fill and Expand
| Action | How it is made | Time |
|---|---|---|
| Select an area, type a prompt, Generate | 3 variations on a new masked **Generative layer**; the original is untouched | |
| **Remove** (empty prompt, "remove", "erase", or the Hindi word for remove) | No AI model: the browser rebuilds the area from its surroundings, adds matching grain | about 1 s |
| **Add / Expand** | **SDXL Inpainting 0.1** on JASPREET's local Limelight AI (`127.0.0.1:8800`, `/api/images/inpaint`); only the selection plus a margin is sent; one batched pass at about 832 px, 18 steps | about 30 s warm |
| Generative Expand | Crop tool (C), drag past the artboard edge | |

- Progress shows on the button; Cancel or Esc stops it; 60 s limit (raised in practice for the real model).
- A safety check (`gfCheck`) rejects any result whose pixels outside the selection do not match the picture.
- Vector tab traces the result into paths; Book paints an empty picture box; 3D makes a texture or backdrop.
- Studio routes: `/api/ai/inpaint` (+ `/progress`, `/cancel`), `/api/ai/image`, `/api/ai/edit` (old; now asks to reload), `/api/ai/status`.

---

## 3. How it works with the workspace
| Part | Detail |
|---|---|
| Proxy | The workspace serves Studio again on **port 3345** (`server/apps-proxy.mjs`); public host `lh-design.limelightcorp.net` |
| Who is editing | The proxy adds `x-lh-as` (base64url JSON with the person's name and email). Browsers cannot fake it: the proxy strips it from incoming requests, and Studio listens only on this PC. No key is used for Design |
| No sign-in | Design opens with no login; single login was confirmed on 30 Oct |
| Pass-through | `/api/projects`, `/api/library`, `/api/ai/*`, `/projects/…`, `/library/…` on the workspace go straight to Studio (`server/areas/design.mjs`) - used by Home, Search, Create and Library |
| Start button | `E:\Limelight Ai\limelight-studio\Limelight Studio (no window).vbs` (`start` in `server/app-list.mjs`) |
| "← Workspace" | Studio has its own button (the proxy does not add one) |

### AI connections (Studio's `config.json`)
- `port` 3330; `aiUrl` (default `http://192.168.0.205:8800`, Limelight AI on NAYA B); `aiLocalUrl` (default `http://127.0.0.1:8800`); an AI password field (never fill it in for the user).
- Studio sends the **workspace AI key** (read from `limelight-workspace\Data\ai.key`, or `aiKeyFile` in its config) with `x-lh-user: studio`, so no password is needed. NAYA B accepts that key since 30 Oct.
- `aiFetch` tries NAYA B first, then JASPREET's local AI. Inpainting uses B only if B has `/api/images/inpaint`; otherwise JASPREET.
- When an admin saves the office AI password in the workspace account menu, the workspace also sends it to Studio's `/api/config`.

### Start / stop
- `Start Limelight Studio.bat` (or `node server.mjs --open`), the Desktop shortcut "Limelight Studio", or `Limelight Studio (no window).vbs`. LAN mode: `node server.mjs --lan`.
- Restart: stop the process on port 3330, then run the `.vbs`.
- After code updates users must reload Studio (Ctrl+F5). An old open tab keeps running old code (this caused the "aerial map" bug).

### Main files (`E:\Limelight Ai\limelight-studio`)
| Path | What |
|---|---|
| `server.mjs` | Plain Node, no npm dependencies. Routes: `/api/projects`, `/api/library`, `/api/export`, `/api/convert` (CorelDRAW, 900 s timeout), `/api/zip`, `/api/pixels`, `/api/live/<project>` (SSE), AI routes, `/api/config`, `/api/status`, `/api/health` |
| `tools/corel.vbs` | CorelDRAW automation |
| `public/js/` | `app.js`, `editor.js`, `panels.js`, `layers.js`, `templates.js`, `exporter.js`, `icons.js`, `doctabs.js`, `modes.js`, `genfill.js`, `vector.js`, `book.js`, `studio3d.js`, `color.js`, `live.js`, `ps-core.js`, `ps-menus.js`, `ps-extras.js`, `ps-mask.js` |
| `public/css/` | `studio.css`, `premium.css`, `modes.css`, `ps.css`, `color.css` |
| `public/vendor/` | Offline copies: Fabric.js 5.3, Three.js 0.160, ag-psd 20.2, polygon-clipping, imagetracerjs |
| `public/fonts/` | Mukta, Rozha One, Yatra One (Hindi) - install them on any PC that opens the PSDs |
| Data | `Projects/` (designs, `_trash`), `Library/` (uploads, AI images, 3D renders, `_layers`), `Exports/` |

Code pattern: classic scripts share one global scope. Each tab module **wraps** global functions instead of editing them, so script order matters. `app.js` boots on `DOMContentLoaded`.

---

## 4. Decisions and why
- **Local, offline, no paid apps**, same dark look and Limelight yellow as the video editor.
- **Studio and the workspace are separate products.** The workspace was first built inside Studio; the owner asked to split them. The workspace moved to `limelight-workspace` (port 3350) and Studio became a design tool only on 3330.
- Editorial home; file tabs + artboards on top; labels under dock icons; grey pasteboard - all chosen to match Photoshop habits.
- **Tabs at the bottom like Edit, and one design opened per layer** (the owner's rule).
- **Every tab exports AI, PSD and CDR**, through the real CorelDRAW for true compatibility.
- Generative fill copies **Photoshop's flow**. Remove is done without AI (fast, clean); Add/Expand use a real inpainting model (the owner approved the 5 GB download). The text-to-image fallback was removed because it pasted unrelated pictures.
- The Color tab copies Lightroom's workflow, not its branding.
- **Never type passwords**: AI access comes from the workspace key or the local AI.

## 5. Fixes worth knowing
- Logos saved through the workspace kept the proxy address and broke exports → repointed to Design's own address on open and export (`localSrcs`).
- "Aerial map" bug: an old open tab used the old route, NAYA B refused, the server fell back to text-to-image and pasted an unrelated picture → fallback removed, `gfCheck` added.
- Generative fill blocked by NAYA B 401s → Studio sends the workspace key and falls back to JASPREET's AI.
- Local SDXL Turbo took about 50 s per picture (VRAM spill on the 8 GB card) → offload fix, about 4 s.
- SDXL Inpainting at 1024 px took about 60 s → one batched pass at about 832 px, about 30 s.
- Port clash with Office on 3300 → Studio moved to 3330.
- Masks did not follow their layer, were soft (4096 px cap) and ran past the artboard → fixed (8192 px).
- Book reflow took 6-45 s → measured with Fabric's own text lines: 1.6 s.
- (Full list in `docs/_notes/design.md`.)

## 6. Known issues / pending
- Design share opens Design's start page unless Design puts the open design in its address.
- CDR/AI files not yet opened in Illustrator/Photoshop; PSD files checked only by reading them back, not in real Photoshop.
- Generative fill is softer and slower than Photoshop (8 GB GPU). Better would need NAYA B with the inpaint route.
- Expand on designed borders gives mixed results.
- The owner's real poster still has 3 broken "remove" layers from old code (owner to delete). Test designs "Tabs test", "Instagram Post", "Big Announcement" can be deleted.
- Photoshop tab limits: adjustments change pixels (no adjustment layers), crop/canvas resize cannot be undone, no Liquify, painting on text/shape needs rasterizing, no undo inside Select and Mask.
- Color tab: no crop/healing/masking, JPG/PNG only (no RAW); not tested inside the workspace or on other PCs.
- Bottom tabs and live editing not re-tested after the generative-fill rewrite.
- Not built: AI background removal (BiRefNet/RMBG), Magic Write, Magic Edit.
- Studio's own `README.md` still describes the old workspace home inside Studio and is out of date.
