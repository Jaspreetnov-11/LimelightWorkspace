# Design (Limelight Studio): project notes

Design is Limelight's own local design tool. It brings together the best parts of Canva, Photoshop, Illustrator,
CorelDRAW, InDesign/QuarkXPress, Lightroom, Figma and Blender in one app. Inside the Limelight Workspace it is the
**Design** app. These notes come from the Claude Code build sessions of 29–30 Oct 2026 and the code as it stands, so
someone can understand and rebuild it.

Sources: sessions `dc2dbe2b` (first build, layers, PSD, artboards, premium UI, home page), `80696141` (bottom tabs
Design/Vector/Book/3D, Smart-Object layers, live editing, generative fill/expand, Color tab, grey pasteboard),
`3b1bdc53` (Photoshop toolset in the Design tab, masking, Select and Mask), the end of `e4f20feb` (tab bar restyled like
Edit), the README, the memory notes, and the hand-over note `studio-4-tabs-genfill.md` in the shared side-session notes
folder. Times are India time (IST).

---

## 1. What exists now

### Home page (`/`)
- **Editorial** design, chosen by the user from 6 mockups (Spotlight, Dock, Bento, Editorial, Command, Split create).
  The mockups are still at `/home-options.html` for reference.
- Sticky top bar: logo, Create · Designs · Templates (smooth-scroll), ← Workspace (goes to :3350), AI settings, Open
  file.
- A large "Make it **shine.**" heading (shine in yellow), with **New design** (custom size dialog in px, mm, inch or
  feet) and **Start from template**.
- A grid of 12 sizes, each with a small ratio box that turns yellow on hover. Click one to open a new design at that
  size.
- **Your designs:** big thumbnails, "3 min ago", artboard count, and a trash button on hover. Deleted designs go to
  `Projects/_trash`.
- **Templates:** masonry layout, each template at its real shape.

### Editor shell (all tabs)
- **File tabs at the top**, like Photoshop windows, for example "Big Announcement @ 59% (Artboard 1, RGB/8)". Each open
  file keeps its artboard, zoom and undo history. × or middle-click closes a tab (it saves first), and + goes Home.
  Open tabs are remembered after closing the browser. Tabs for deleted files are removed at start.
- **Artboards** (Photoshop-style): each artboard can have its own size, for example a 1080×1080 Insta post and a
  1080×1920 story in one file. They sit in a floating glass "pill" above the canvas. The **Artboard ▾** menu offers
  same size, presets (Insta, Story, YouTube, A4, Backdrop…) or custom W×H. Double-click renames, drag reorders, and
  duplicate/delete are available. A template click adds it as a new artboard. The old bottom pages bar was removed.
- **Bottom mode bar**, styled exactly like Edit's page bar: **Design · Vector · Book · 3D · Color**. Text only; the
  active tab is white with a yellow line on top, the others grey. The grey app names (Photoshop, Illustrator…) and
  icons were removed at the user's request.
- **Panel layout:** tools → Properties (left) → canvas → right dock (Templates, Elements, Text, Brand, Uploads, AI Image,
  Layers, 3D), with **labels under the icons** in two rows of four. Layers sit on the right, as in Photoshop.
- **Pasteboard** (the area around the artboard) is neutral grey `#3c3c3c` in all five tabs, like Photoshop. Full-screen
  mode stays black.
- **Look:** minimal "premium" graphite theme. Background colours were taken from the user's screenshot: main `#0b0c0f`,
  side panels `#101217`, cards `#14161b`, inputs `#202229`. Yellow (#ffc21a) is used only for Export, active items and
  selection. Thin sliders, round swatches, glass menus and dialogs.
- **Layers panel (Photoshop-style):** Kind filter (Pixel/Text/Shape/Smart Object), name search, blend mode, Opacity,
  locks. Eye column (works inside groups too). Real thumbnails on a checkerboard. Text layers show a big T and their first
  line. Smart Object badge for SVG/icon groups and 3D renders. Groups are folders with indent. Masks show a chain and a
  mask thumbnail. **fx → Effects → Drop Shadow** with its own eye. "Smart Filters" for image filters. Bottom bar: link,
  fx, mask, adjustments, new group, new layer, delete. Double-click renames, drag reorders, Shift/Ctrl for
  multi-select.

### Tab 1: Design (Photoshop)
The original Canva-style editor plus a full Photoshop toolset (`ps-*.js`).
- **Canva parts:** size presets, Limelight templates (logo + yellow triangle), text presets/combos, Hindi fonts,
  elements, photo frames (drop a photo onto a frame), brand panel (logo + colours), floating quick bar.
- **Photoshop toolbar** in Photoshop's order. Hold or right-click a tool for its group, and Shift+key cycles the group:
  Move/Artboard (V), Marquee ×4 (M), Lasso/Polygonal/Magnetic (L), Object Selection/Quick Selection/Magic Wand (W),
  Crop/Perspective Crop/Slice (C), Frame (K), Eyedropper/Color Sampler/Ruler/Note/Count (I), Spot Healing/Healing/Patch/
  Content-Aware Move/Red Eye (J), Clone/Pattern Stamp (S), History brushes (Y), Brush/Pencil/Color Replacement/Mixer (B),
  Eraser ×3 (E), Gradient (5 types)/Paint Bucket (G), Blur/Sharpen/Smudge, Dodge/Burn/Sponge (O), Pen ×6 (P),
  Type ×4 incl. Type Mask (T), Path/Direct Selection (A), Shapes + Custom Shape (U), Hand/Rotate View (H, R), Zoom (Z),
  colours (D, X), Quick Mask (Q).
- **Options bar** changes with the tool. Move: auto-select, transform controls, align/distribute. Paint: size, hardness,
  mode, opacity, flow. Selection: New/Add/Subtract/Intersect, Feather, Select Subject, Generative Fill.
- **Properties panel:** with nothing selected it shows Document settings (canvas W/H with link, orientation,
  resolution, mode, bits, fill), Rulers & Grids, and Guides (drag guides from the rulers). With a layer selected it shows
  that layer's type.
- **Menus:** Image (about 20 adjustments, Image/Canvas Size, rotate, Trim), Layer (via Copy/Cut, Fill Layers, Masks,
  Merge, Flatten), Select (Inverse, Color Range, Modify, Subject), Filter (about 30), Window. Right-clicking a layer
  gives Transform (Skew, Distort, Perspective, Flip, Rotate). Help → Keyboard Shortcuts lists everything from the user's
  shortcut sheet.
- **Shortcut clashes** resolved Photoshop's way: Ctrl+L = Levels, Shift+Ctrl+I = Inverse, Shift+Ctrl+U = Desaturate,
  Alt+Shift+Ctrl+E = Exposure (Flatten is in the Layer menu), Ctrl+E = Merge Down in the Design tab, so Export there is
  Alt+Shift+Ctrl+W.
- **Masking (Photoshop-like):** the mask belongs to the layer and moves, scales and rotates with it. Selection and mask
  resolution go up to 8192 px, and the selection outline is clipped to the artboard.
  - Click the mask thumbnail to paint on it (black hides, white shows); Gradient and Fill work on it.
  - Shift+click disables it (red ✕). Ctrl+click loads it as a selection. Alt+click shows the mask only. `\` shows a red
    overlay.
  - Drag the thumbnail to 🗑 to get "Apply mask to layer before removing?". Drag it to another layer to move it, or with
    Alt to copy.
  - Right-click menu: Delete, Apply, Disable, Invert, Load as Selection, Select and Mask.
  - Properties → Layer Mask: Density, Feather, Invert, Apply, Delete.
- **Select and Mask / Refine Mask (Alt+Ctrl+R):**
  - Tools: Quick Selection, Refine Edge Brush, Brush, Lasso (Alt subtracts).
  - Settings: Edge Radius, Smooth, Feather, Contrast, Shift Edge, Decontaminate Colors.
  - Views: Overlay, On Black, On White, B&W, On Layers.
  - Output: selection, layer mask, new layer, or new layer with mask.
- **Other tools carried over from the first build:** brush (pencil/marker/spray), image adjustments (brightness,
  contrast, saturation, vibrance, hue, blur, grain, pixelate), filters, colour cut-out, crop, mask shapes, blend modes,
  shadows, smart guides, zoom/pan, auto-save.
- **Generative Fill and Expand** (Photoshop-style), described in section 2.

### Tab 2: Vector (Illustrator / CorelDRAW)
- Pen (bezier: click for a corner, drag for a curve, click the first point to close, Enter to finish), shapes, polygons,
  stars, arrows, gradients, strokes/dashes.
- Direct selection (A) to drag points and handles, an add-anchor tool, and convert anchor.
- **Pathfinder:** Unite, Minus front, Intersect, Exclude (labelled buttons).
- Clipping mask (Ctrl+7) and release, Convert to path, **Image Trace** (bitmap to editable paths).
- SVG import/export, align & distribute.

### Tab 3: Book (InDesign + QuarkXPress mix)
- Page size, margins, columns, facing pages, and a spreads panel.
- **A-Master** with automatic page numbers (`#`) and running heads (`{title}`), mirrored on left pages.
- **Linked text boxes**: a linking tool (K) as in Quark, plus Continue, Autoflow (pours overset text into new boxes and
  pages), Unlink and Place text (.txt). Overset tracking.
- Picture boxes, text styles (Hindi ones too), and Object menu → Insert page number.
- Tested: a 300-paragraph story flowed across 11–12 pages in about 1.6 s with no text lost.

### Tab 4: 3D (Blender)
- The original 3D Studio (Three.js) as a full tab: cube, sphere, torus, gem, an extruded Limelight mark; materials
  (gold, chrome, glass, neon); lights, shadows; gizmo (W move, E rotate, R scale, Del delete).
- **Insert into design** places the render as a 3D layer, and double-clicking it re-opens the scene. The scene is saved
  with the file.
- Generative fill in 3D: an AI texture for an object, or an AI backdrop for the scene.

### Tab 5: Color (Lightroom Develop replica, Limelight look, no Adobe branding)
- Opens from the Color tab or "Edit in Color" in Properties. It opens the selected photo, or the page's biggest photo.
  **Done** (or Esc) writes the result into the photo layer and returns to Design. Every export uses the edited photo.
- **Non-destructive:** the original photo and all settings are kept with the layer (`layer.devOrig` + `layer.develop`).
  Reopen any time; Reset restores the original.
- **Left:** Navigator, Presets (11 built-in: Vivid, Poster Punch, Golden Hour, Teal & Orange, B&W…; hover previews;
  **+** saves your own in this browser's localStorage), History (click a step to go back).
- **Centre:** Before/After (`\`), draggable split view (Y), Fit / 1:1 (Z, or click to zoom). **Bottom:** filmstrip of
  the page's photos, with a yellow dot on edited ones.
- **Right:**
  - Histogram.
  - Basic: Color/B&W, Temp, Tint, As Shot, Auto, Auto tone, Exposure, Contrast, Highlights, Shadows, Whites, Blacks,
    Texture, Clarity, Dehaze, Vibrance, Saturation.
  - Tone Curve (RGB/R/G/B).
  - Color Mixer (HSL × 8 colours).
  - Color Grading (3-way wheels + Global, Blending, Balance).
  - Detail (Sharpening, Noise Reduction).
  - Effects (Vignette, Grain).
- Double-click a slider name to reset it, or the number to type a value. ↺ resets a section. Ctrl+Z / Ctrl+Y.
  Ctrl+Shift+C / V copy and paste settings between photos.
- Runs live on the GPU (WebGL2). Done on a 4096×2048 poster took about 9 s.

### How the tabs fit together (the "Smart Object" model)
- **The design is the file.** Vector, Book and 3D each open **one layer** of the design, like a Photoshop Smart Object,
  instead of opening the same design four times. This was the user's explicit request.
- Double-click a smart layer, or use "Edit in Vector/Book", to open it. Clicking **Design** puts it back in the same
  place and at the same size. Shapes selected when you click Vector move into a new vector layer. A book layer shows its
  first page in the design.
- Smart layers show as their real objects, so exports stay vector.

### Exports
- PNG, JPG, SVG, PDF (all pages / all artboards, each at its own size), PSD, **AI**, **CDR**, and an **"All formats"
  ZIP**. The rule: every tab must export AI, PSD and CDR.
- Files go to `Exports/` and are also downloaded. File names include the artboard name.
- **PSD export with real structure:** every object is its own named layer, and groups become folders (order kept, hidden
  stays hidden). Shadow → editable **Drop Shadow** effect (angle, distance, size). Text outline → **Stroke** effect.
  Effects that are off stay off. Mask shapes and photo frames → full photo + layer mask. Blend mode and opacity kept.
  Unrotated text stays editable, with PostScript font names (RozhaOne-Regular, Mukta-Medium). Image filters are baked
  into the pixels.
- **PSD import** and **SVG import**.
- **CDR, AI and vector PDF** go through the installed **CorelDRAW** on this PC (`tools/corel.vbs`). A book exports as one
  multi-page CDR/PDF (a `.list` file with one SVG per page). Tested: an 11-page CDR in about 2 minutes, every page
  filled. AI goes out per page.

### Live collaborative editing
- Two people with the same design open see changes as they happen: new, changed, deleted and reordered objects, text
  edits, and artboards added, renamed or resized. A single dragged object streams while dragging (every 90 ms).
- A green **LIVE** badge and coloured avatars sit next to "Saved". Clicking an avatar jumps to that person's artboard.
  Selections and pointers show in each person's colour with their name.
- Saving and opening work as before. A late opener gets the saved file.
- Limits: two people typing in one text box (the typer's copy wins until they click out); book reflow onto other pages
  only reaches others from the saved file; undo is not per person.

---

## 2. Generative Fill / Expand (how it works now)
- **Select:** marquee, lasso, Select Subject or Select Background. Feather and Expand also work.
- **Bar under the selection:** Generative fill → prompt box → Generate.
- **Result:** 3 variations on a new **Generative layer**, masked to the selection. The original is not touched.
- **Properties:** editable prompt; Generate adds 3 more; variation thumbnails (click to switch, × to delete); mask
  Feather; Load as selection; Use selection as mask. Opacity and hide work as for any layer. Layer meta is stored as
  `genfill.v=2` (kind, prompt, box, mask, variants…).
- **Generative Expand:** with the Crop tool (C), drag past the artboard edge. The bar then offers Generative Expand,
  which paints the new edges.
- **Remove** (empty prompt, or "remove", "erase", "hata do") uses **no AI model**. The browser rebuilds the area from its
  surroundings: colours spread smoothly (pull-push), plus grain copied from a calm nearby patch, capped at ±10 levels.
  The 3 variations use 3 different patches. Pixels from a neighbouring object cut by the selection edge are ignored.
  About 1 s.
- **Add / Expand** use **SDXL Inpainting 0.1** on this PC's Limelight AI (`127.0.0.1:8800`):
  - Only the selection plus a margin is sent. All 3 variations come from one pass at about 832 px, 18 steps,
    guidance 7.5.
  - The model loads when the AI server starts and stays loaded.
  - Studio then matches tone at the edge (`gfHarmonize`) and adds grain back.
  - About 30 s warm (34 s first run).
- Progress shows on the button ("Generating 2/4 · 5s"). Cancel or Esc stops it. There is a 60 s limit (raised in
  practice for the real model).
- **Safety check** (`gfCheck`): a result whose pixels outside the selection don't match the picture is rejected and never
  pasted.
- **Vector tab:** the result is traced into editable paths. **Book:** an empty picture box is painted fresh.
  **3D:** AI texture or backdrop.
- Studio server routes: `/api/ai/inpaint` (+ `/progress`, `/cancel`), `/api/ai/image`, `/api/ai/edit` (old route; now
  answers "Studio was updated — reload the page" when it would fall back), `/api/ai/status`.

---

## 3. How it works

### Machines, port, start
- Runs on **JASPREET (this PC)**, port **3330** (3300 is Office; 3000/3100 are the video editor; 3341–3345 and 3350
  belong to the workspace).
- Start: `Start Limelight Studio.bat` (or `node server.mjs --open`), the Desktop shortcut "Limelight Studio" (yellow
  triangle icon; if Studio is already running it only opens the browser), or `Limelight Studio (no window).vbs`
  (also used by the workspace's Start button). To restart: stop the process on 3330, then run the `.vbs`. LAN mode:
  `node server.mjs --lan`.
- In the workspace (http://localhost:3350) Design is re-served on **:3345**. The workspace proxy adds an `x-lh-as` header
  (base64url JSON with the signed-in person's name and email), so live editing shows real names. Browsers can't fake it:
  the proxy strips the header from incoming requests, and Studio listens only on this PC. Single login with no second
  sign-in was confirmed on 30 Oct.
- After code updates, users must **reload Studio (Ctrl+F5)**. An old open tab keeps running old code (this caused the
  "aerial map" bug).

### AI connections
- `config.json`: `port`, `aiUrl` (default `http://192.168.0.205:8800`, Limelight AI on **NAYA B**), and an AI password
  field. Never fill the password in for the user.
- Studio sends the workspace's AI key (read from `limelight-workspace/Data/ai.key`) on AI requests, so no password is
  needed. NAYA B was updated on 30 Oct to accept that key (the user ran the deploy .bat files).
- `aiFetch` tries NAYA B first, then falls back to **this PC's Limelight AI** (`aiLocalUrl`, default
  `http://127.0.0.1:8800`, no password). Inpainting uses B only if B has the `/api/images/inpaint` route; otherwise it
  uses this PC.
- This PC's AI server (`limelight-ai`, `images.py`) gained: `/api/images/inpaint` (+ progress, cancel, warm-up at
  start), loading of the SDXL Inpainting 0.1 UNet (fp16, 4.9 GB, in `D:\AI Models\huggingface`; text encoders and VAE
  reused from the SDXL base already there), and an 8 GB-card offload fix (was about 50 s per picture from VRAM spill,
  now about 4 s for Turbo). GPU: RTX 4060, 8 GB. RAM: 64 GB.
- **Never run AI models on NAYA A (192.168.0.200).**

### Folders and main files (`E:\Limelight Ai\limelight-studio`)
- `server.mjs`: plain Node, no npm dependencies. Routes include `/api/projects`, `/api/library`, `/api/export`,
  `/api/convert` (CorelDRAW; takes `svgs: []`; 900 s timeout), `/api/zip`, `/api/pixels` (painted pixel layers saved in
  `Library/_layers`), `/api/live/<project>` (SSE GET + POST: state, cursor, ops; in-memory rooms, 20 s heartbeat), the
  AI routes above, and `/api/config`, `/api/status`, `/api/health`.
- `tools/corel.vbs`: CorelDRAW automation. `PlacePage(svg)`; a `.list` input makes one page per SVG.
- `public/index.html`. Scripts load after `app.js`, whose boot runs on `DOMContentLoaded` so later scripts can wrap its
  functions first.
- `public/js/`:
  - `app.js` (home, export dialog, settings), `editor.js` (canvas, tools, pen, undo, pages; `localSrcs` fixes image
    origins), `panels.js`, `layers.js` (Photoshop-style Layers panel), `templates.js`, `exporter.js` (all formats, book
    multi-page), `icons.js`, `doctabs.js` (file tabs; shows "Parent › Layer" while a layer is open).
  - `modes.js` (bottom tab bar, `openLayer`/`closeLayer`, `setStudioMode`, `ED.stack`, hook registries `ED.inspHooks`,
    `ED.overlays`, `PANEL_FNS`), `genfill.js`, `vector.js`, `book.js`, `studio3d.js` (`window.Studio3D`),
    `color.js` (Lightroom tab), `live.js`.
  - `ps-core.js`, `ps-menus.js`, `ps-extras.js`, `ps-mask.js` (Photoshop toolset and masking).
- `public/css/`: `studio.css`, `premium.css`, `modes.css` (bottom bar, genbar, pathfinder, spreads, live avatars,
  pasteboard grey), `ps.css`, `color.css`.
- `public/vendor/` (offline copies): Fabric.js 5.3, Three.js 0.160, ag-psd 20.2, polygon-clipping (MIT),
  imagetracerjs (Unlicense).
- `public/fonts/`: Mukta, Rozha One, Yatra One (Hindi). Install them from here on any PC that opens the PSDs in
  Photoshop. Windows Nirmala UI and Mangal also work.
- Data folders: `Projects/` (auto-saved JSON + thumbnail; `_trash`), `Library/` (uploads, AI images, 3D renders,
  `_layers`), `Exports/`.

### Code pattern to know
- Classic scripts share one global scope. Each new tab module **wraps global functions** (`bootEditor`, `storePage`,
  `loadPage`, `pageJSONs`, `setTool`, `scheduleHistory`, `saveProject`, `renderInspector`, `showTab`, `exportDesign`,
  `goHome`, `switchDoc`…) rather than editing them. Script order matters.
- A smart layer is a Fabric Group with `smart: {kind, project}` holding its own sub-document. While a layer is open,
  `ED.stack` holds the parent, and saving writes the layer back into the parent.
- Book text threading: `storyId`, `storyIdx`, `frameH`, `stories[id].overset`. `fitCount` uses Fabric's own wrapped
  `textLines`.
- Live sync: on every undo-history step, diff the open page's objects by id → upserts/removes/order. Check the artboard
  list (`livePages`) before every baseline reset.

---

## 4. Key decisions and why
- **Local, offline and dependency-free, like the video editor:** the user wants their own tools instead of paid apps,
  with the same dark look and Limelight yellow.
- **Studio and Workspace are separate products.** Another session had built the all-apps workspace inside the Studio
  folder (Studio moved to `/design`). The user said "alag kar do" ("split them"). The workspace moved to
  `E:\Limelight Ai\limelight-workspace` (port 3350), and Studio went back to `localhost:3330` as a design tool only.
- **Editorial home** chosen from 6 options. **File tabs + artboards on top** like Photoshop. **Labels under the dock
  icons.** **Grey pasteboard** like Photoshop.
- **Tabs at the bottom like Edit, and one design with layers opened per tab (Smart Object model)**, not the same
  design in four tabs. This is the user's rule.
- **Book = InDesign + QuarkXPress mix** (Quark-style linking tool).
- **Every tab exports AI, PSD and CDR.** CDR/AI go through the real CorelDRAW for true compatibility.
- **Generative fill should match Photoshop's flow** (user: "ekdum same", meaning exactly the same).
  - Remove is done without AI, for speed and cleanliness.
  - Add/Expand use a real inpainting model. The user approved the 5 GB download.
  - This PC's AI is used when NAYA B refuses.
  - The text-to-image fallback was removed because it pasted unrelated pictures.
- **Color tab copies Lightroom's workflow, not its branding** (no Adobe logo or artwork).
- **Never type passwords.** AI access comes from the workspace key or the local AI, not from Claude entering a password.

## 5. Problems hit and fixes
- A template text missing `styles` stopped page load. Fixed.
- A group jumped to the top when created. It now keeps its place.
- PSD font names were wrong. They now use PostScript names.
- Port clash with Office on 3300. Studio moved to 3330.
- The preview server was running old code. Restarted.
- Default grey browser button styles on Home. Reset.
- The app.js boot could run before the wrapper scripts loaded. Moved to `DOMContentLoaded`.
- Book reflow was slow (6 s, then over 45 s for 12 pages). It now measures with Fabric's `textLines`, and autoflow pours
  only the overset: 1.6 s. Each box was one line short; fixed by treating the candidate line as the last.
- A possible reflow loop through history. Reflow now records history only when something changed.
- Live sync lost artboard-list changes. `livePages()` now runs before baseline resets.
- Pathfinder labels overlapped. Replaced with labelled buttons.
- Masks didn't follow their layer, were soft on big artboards (4096 px cap) and the outline ran past the artboard. All
  fixed (8192 px).
- A Properties-panel TypeError with the vector brush and nothing selected. Guarded.
- Generative fill was blocked by NAYA B 401s (no password). Studio now sends the workspace key and falls back to this
  PC's AI. NAYA B's AI later needed restarting with deploy scripts the user ran (logs `deploy-log.txt` and
  `restart-log.txt`; an encoding mark at the start of the script broke the first SSH command, now fixed).
- Local SDXL Turbo took about 50 s per picture because of VRAM spill on the 8 GB card. Offload fix: about 4 s.
- **"Aerial map" bug:** the user's old open tab used the old route, B refused, and the server fell back to text-to-image
  with the instruction text, pasting an unrelated picture as a box. The fallback was removed and the `gfCheck` guard
  added.
- Remove left a pale ghost and a smear across a neighbouring rotor. Fixed with better patch choice and by ignoring
  outlier edge pixels. The temp rectangle had no coordinates, so a box-overlap test is used instead.
- Deleting a variation switched the visible picture. Delete logic fixed.
- SDXL Inpainting at 1024 px took about 60 s (UNet moved to the GPU for each variation). Now one batched pass at
  about 832 px: about 30 s.
- Bash heredocs broke on quotes and backticks during patching. Patches were written as scratch script files.

## 6. Pending / not verified
- Generative fill quality is softer and slower than Photoshop's (8 GB GPU). Faster or better would need a bigger GPU
  (NAYA B) with the inpaint route installed there.
- Expand on designed borders gives mixed results (fine on normal photos).
- The user's real poster still has 3 broken "✨ remove" layers from the old code. The user should delete them.
- Test designs left in Projects: "Tabs test", "Instagram Post" (sunflowers), "Big Announcement". Delete if not
  needed.
- Photoshop tab limits:
  - Adjustments change pixels directly (no adjustment layers).
  - Crop and canvas resize can't be undone.
  - No Liquify.
  - Painting on text or shape layers needs rasterizing.
  - No undo inside Select and Mask.
- Color tab: no Lightroom crop, healing or masking (Design's tools do these). It works on JPG/PNG, not RAW, so slider
  strengths won't match Lightroom exactly. Not yet tested inside the workspace or on other PCs.
- The bottom tabs and live editing were not re-tested after the generative-fill rewrite.
- PSD files were checked by reading them back, but not yet opened in real Photoshop.
- Background removal by AI model (BiRefNet/RMBG), Magic Write and Magic Edit were proposed but not built.
- AI Video on the old Studio home was UI only; that home moved to the workspace.

---

## 7. Update log (IST, oldest first)
- 29 Oct 06:18: Asked to merge Canva, Photoshop, Illustrator, CorelDRAW, Blender and Figma into one easy, aesthetic local
  app like the video editor.
- 29 Oct 06:39: Limelight Studio v1 on :3330: Canva-style editor, templates, brush/filters, pen, 3D Studio, PNG/JPG/SVG/
  PDF/PSD export, PSD/SVG import, auto-save.
- 29 Oct 07:25: Desktop shortcut and minimised-window launcher.
- 29 Oct 07:50: Photoshop-style Layers panel (eye column, folders, fx Drop Shadow, Smart Filters, masks).
- 29 Oct 07:56: PSD export rewritten: folders, editable Drop Shadow/Stroke, layer masks, blend/opacity, editable text.
- 29 Oct 08:04: Panels reordered (Properties left, Layers dock right). Vector and AI plan explained.
- 29 Oct 08:18: Photoshop-style file tabs on top and per-size artboards. Bottom pages bar removed.
- 29 Oct 08:25: Workspace split out to `limelight-workspace` (:3350). Studio back to `localhost:3330`. Minimal
  premium theme.
- 29 Oct 08:36: Background colours set from the user's screenshot.
- 29 Oct 08:41: 6 home page options mocked at `/home-options.html`.
- 29 Oct 08:47: **Editorial** home applied.
- 29 Oct 08:50: Labels added under the right-dock icons.
- 29 Oct (day): CDR / AI / vector-PDF export via CorelDRAW (`tools/corel.vbs`, `/api/convert`, `/api/zip`) and the
  image origin fix (`localSrcs`), from another session.
- 30 Oct 01:24: Design · Vector · Book · 3D tabs at the bottom (Smart-Object layer model), Vector tools, Book
  (InDesign + Quark), 3D as a tab, generative fill in all tabs (blocked by AI password), multi-page CDR.
- 30 Oct 01:29: Live collaborative editing (SSE, avatars, selections, pointers). Workspace proxy sends identity.
- 30 Oct 01:46: Bottom tab bar restyled exactly like Edit's. App names in brackets removed.
- 30 Oct 14:31: Studio sends the workspace AI key. NAYA B update script prepared for the user to run.
- 30 Oct 14:56: Full Photoshop toolset, menus, options bar, Properties and shortcuts in the Design tab (`ps-*.js`).
- 30 Oct 15:12: Masking fixed (mask follows layer, 8192 px), mask handling like Photoshop, Select and Mask / Refine Mask.
- 30 Oct 15:22: Photoshop-style Generative Fill/Expand using this PC's AI (fallback when NAYA B refuses), 3 variations,
  Properties panel.
- 30 Oct 15:35: "Remove" made AI-free and fast. Aerial-map bug fixed. Progress, Cancel and result guard added.
- 30 Oct 15:48: SDXL Inpainting 0.1 downloaded and used for add/expand (about 30 s for 3 variations). Smear fixed.
  Expand no longer waits for a picture description.
- 30 Oct 18:49: 5th tab **Color** (Lightroom Develop replica, non-destructive, GPU).
- 30 Oct 19:11: Pasteboard behind the artboard set to grey `#3c3c3c` in all tabs.
- 30 Oct ~19:40: Single login confirmed for Design inside the workspace. NAYA B's AI now accepts the workspace key.
