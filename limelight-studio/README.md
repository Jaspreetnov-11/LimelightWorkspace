# Limelight Studio

One local design app that mixes the best parts of Canva, Photoshop, Illustrator, CorelDRAW, Figma and Blender.
It runs on this PC (no cloud), like the Limelight Video Editor.

## Start

Double-click **Start Limelight Studio.bat** (or run `node server.mjs --open`) → http://localhost:3330

Office LAN: `node server.mjs --lan` (prints the LAN address). Port and AI server are in `config.json`.

## Workspace (home page)

`/` is the **Limelight Studio workspace**: one prompt box (Image / Video / Design), launch cards with live status for
Video Editor, Design, Office, Lighthouse and Limelight AI, recent designs and AI images.
- **AI Image** (`#image`) — styles, sizes, Fast/Best, 1–4 pictures, via Limelight AI on NAYA B.
- **AI Video** (`#video`) — UI only for now: requests are saved to `Library/video-requests.json` until a text-to-video engine is installed.
- **All apps open inside the same window** (sidebar → My apps); each stays loaded while you switch. Studio serves every
  app again on its own localhost port so logins work inside the frame: Video Editor (NAYA A) `3341`, Office `3342`,
  Lighthouse `3343`, Limelight AI (NAYA B) `3344`. Office has a Start button when it is off.
- The design editor moved to `/design`. The app list lives in `DEFAULT_APPS` in `server.mjs` (override with `"apps"` in `config.json`).

## What it does (design editor, `/design`)

| From | In Limelight Studio |
|---|---|
| Canva | Size presets, Limelight templates, text presets/combos, elements, photo frames (drop a photo on a frame), brand panel with logo + colours, floating quick bar |
| Photoshop | Brush (pencil/marker/spray), image adjustments (brightness, contrast, saturation, vibrance, hue, blur, grain, pixelate), filters, colour cut-out, crop, mask shapes, blend modes, shadows, **PSD export with named layers** and **PSD import** |
| Illustrator / CorelDRAW | Pen tool (bezier curves), shapes, polygons, stars, arrows, gradients, strokes/dashes, **SVG import/export**, align & distribute |
| Figma | Multiple pages, layers panel (drag reorder, lock, hide, rename), smart guides, zoom/pan, auto-save |
| Blender | **3D Studio**: cube, sphere, torus, gem, extruded Limelight mark…, materials (gold, chrome, glass, neon), lights, shadows, gizmo. Insert the render into the design; double-click it later to edit the 3D again |
| AI | AI Image tab uses your Limelight AI server (NAYA B) — set URL/password in Home → AI settings |

Export: PNG, JPG, SVG, PDF (all pages), PSD. Files go to `Exports/` and are also downloaded.

## Folders

- `Projects/` – designs (auto-saved JSON + thumbnail). Deleted designs move to `Projects/_trash`.
- `Library/` – uploaded photos, AI images, 3D renders.
- `Exports/` – exported files.

## Shortcuts

V select · H hand (or hold Space) · R rect · O ellipse · L line · A arrow · P pen · B brush · T text · I eyedropper
Ctrl+Z / Ctrl+Y undo/redo · Ctrl+C / V / D copy, paste, duplicate · Ctrl+G group · Ctrl+Shift+G ungroup
Ctrl+] / [ order · Ctrl+S save · Ctrl+E export · Shift+1 fit · Ctrl+wheel zoom · arrows nudge (Shift = 10px)
Pen: click = corner, drag = curve, click first point = close, Enter = finish, Esc = cancel.
3D Studio: W move · E rotate · R scale · Del delete.

## Notes

- Uses Fabric.js 5.3, Three.js 0.160 and ag-psd 20.2, copied into `public/vendor` so it works offline.
- Hindi fonts: Mukta, Rozha One, Yatra One (bundled) plus Windows fonts (Nirmala UI, Mangal).
- PSD export: every object is its own layer, groups become folders, shadow and text outline become editable Photoshop effects (Drop Shadow, Stroke), mask shapes become layer masks, and unrotated text stays editable. Image filters are baked into the pixels. For Mukta/Rozha One/Yatra One text to show the same in Photoshop, install those fonts from `public/fonts`.
- Background removal is colour-based (plain/green backgrounds); there is no AI cut-out model yet.
