# Limelight Studio

Limelight's own local design tool: the best parts of Canva, Photoshop, Illustrator, CorelDRAW, InDesign/QuarkXPress,
Lightroom, Figma and Blender in one app. It runs on this PC (no cloud). Inside the Limelight workspace it is the **Design** app
(the workspace serves it again on port 3345). Design only: the workspace itself lives in `limelight-workspace`.

## Start

- Double-click **Start Limelight Studio.bat** (opens http://localhost:3330; if Studio is already running it just opens the page),
  or run `node server.mjs --open`. Office LAN: `node server.mjs --lan`.
- Hidden, no window: **Limelight Studio (no window).vbs** (runs `node server.mjs`, writes `server.log`; the workspace's Start button uses it).
- Restart: stop the process on port 3330, then run the `.vbs` again. After a code update, reload open Studio pages (Ctrl+F5).
- Plain Node.js, no npm packages. Settings in `config.json` (`port`, `aiUrl`, `aiLocalUrl`).

## Home

New design (custom size in px, mm, inch or feet), size presets, design gallery (templates), **Your designs** (trash button moves a
design to `Projects/_trash`), Open file (JSON, SVG, PSD, images) and AI settings.
The open design is part of the address (`#d/<design id>`), so a reload or a shared link opens that design.

## The editor

File tabs on top (several designs open), artboards of different sizes in one design, Photoshop-style Layers panel, right dock
(Templates, Elements, Text, Brand, Uploads, AI Image, Layers, 3D), live editing when two people open the same design.
Five tabs at the bottom:

| Tab | Like | What it has |
|---|---|---|
| **Design** | Photoshop + Canva | Templates, text presets, Hindi fonts, photo frames, brand panel, Photoshop toolbar and menus, layer masks, Select and Mask, Generative Fill and Expand |
| **Vector** | Illustrator / CorelDRAW | Pen, shapes, direct selection, Pathfinder, clipping mask, Image Trace, SVG import/export |
| **Book** | InDesign + QuarkXPress | Pages, margins, columns, spreads, master pages with page numbers, linked text boxes, autoflow, text styles |
| **3D** | Blender | Three.js scene: shapes, extruded Limelight mark, materials, lights, shadows; "Insert into design" adds a 3D layer |
| **Color** | Lightroom Develop | GPU photo editing: presets, curves, color mixer, color grading, detail, effects, before/after |

Vector, Book and 3D each open **one layer** of the design (like a Photoshop Smart Object); Design puts it back.

## Export

PNG, JPG, SVG, PDF, **PSD** (named layers, folders, editable text and effects, masks), **AI**, **CDR**, and **All formats** as one ZIP.
AI, CDR and the vector PDF are made by the installed **CorelDRAW 2025** on this PC (`tools/corel.vbs`, about 10-20 s a page).
Files go to `Exports/` and are also downloaded. Install the fonts in `public/fonts` (Mukta, Rozha One, Yatra One) on any PC that opens the PSDs.

## Generative Fill and Expand

- Select an area, type a prompt, Generate: 3 variations on a new masked layer; the original is untouched. Expand: Crop tool (C), drag past the edge.
- **Remove** (empty prompt or "remove") works in the browser, no AI model, about 1 s.
- **Add / Expand** use SDXL Inpainting through Limelight AI: NAYA B (`aiUrl`, default `http://192.168.0.205:8800`) when it has
  the inpaint route, otherwise this PC's local AI (`aiLocalUrl`, default `http://127.0.0.1:8800`). About 30 s.
- Studio signs in to Limelight AI with the workspace AI key (`limelight-workspace\Data\ai.key`), so no password is typed.

## Folders

- `Projects/` – designs (auto-saved JSON + thumbnail); deleted designs in `Projects/_trash`.
- `Library/` – uploads, AI images, 3D renders.
- `Exports/` – exported files.
- `public/` – the app (`js/`, `css/`, `vendor/` offline copies of Fabric.js 5.3, Three.js 0.160, ag-psd 20.2, polygon-clipping, imagetracerjs).
- `server.mjs` – the server (projects, library, export/convert, live editing, AI routes). `config.json` is private: never share it.
