# Changelog

Every update from the five raw notes in `_notes/`, merged into one list, oldest first, grouped by day.

- All times are **India time (IST)**. The workspace notes' update log was written in UTC; its times were converted (+5 h 30 min). This is why some of its entries move to the next day here.
- `~` = approximate time. "(no time)" = the notes give only the day.
- Where two notes record the same event, it appears once with both tags.
- Tags: `[Home]` (incl. login, themes), `[Chats]`, `[Create]`, `[Library]`, `[Profile]`, `[Edit]`, `[Design]`, `[Office]`, `[Limelight AI]`, `[Workspace]` (the shell as a whole), `[App]` (Lighthouse.exe, installable app), `[Servers]`, `[Docs]`.

---

## 28 Oct 2026

- ~01:50 [Limelight AI] App built on JASPREET: Chat, Cowork, Code and Images modes, agent tools, approvals, LAN password mode. Tested with a fake model server.
- ~02:30-03:15 [Limelight AI] Ollama and qwen3:8b installed (44 tok/s); PyTorch CUDA and SDXL Turbo working offline; project moved to `E:\Limelight Ai\limelight-ai` (path length). gpt-oss-120b would not fit (65 GB vs 64 GB RAM); gpt-oss:20b made the default.
- ~03:15-05:00 [Limelight AI] Speed fix (60 s → 2.2 s); emojis → line icons; language matching; 6 themes → one Limelight theme, Inter font, Aurora background; 30 logo options → locked. Ollama junction fixed; all engines on D:. Voice typing (local Whisper).
- ~05:40-07:05 [Limelight AI] Downloaded qwen3-coder:30b, qwen2.5vl:7b, nomic-embed-text, SDXL Base. Mode-based model choice; compare page; no-LaTeX and no-made-up-facts rules; thinking hidden.
- ~05:50-06:20 [Servers] Specs collected for JASPREET, NAYA A and NAYA B; Ollama and models copied to B (`D:\LimelightAI\ollama`, 19.8 GB) for offline install; real speed tests.
- ~06:00-06:55 [Limelight AI] Real speed tests on 3 PCs; NAYA B made the AI server (helper off, standby guard, "Limelight AI" task, firewall 8800, LAN password).
- ~06:30-06:55 [Servers] B's helper disabled; "Limelight AI" task, firewall 8800 and standby guard set up; AI live at 192.168.0.205:8800.
- ~06:35-07:20 [Servers] The owner also ran Ollama by hand on B with LAN exposure (`OLLAMA_HOST=0.0.0.0`, flash attention, q8_0 KV cache, "Ollama LAN" rule). Clean-up was given; 11434 was later found closed from the LAN.
- ~07:10 [Servers] All models, SDXL and torch cu128 put on B.
- ~07:10-07:40 [Limelight AI] All models and image generation put on B; SDXL quality fix (580 s → 11 s); idle-pipe unload fix.
- ~07:30-08:30 [Limelight AI] Logo style 29 made the default; password removed, then restored; mobile UI; themed login screen; Auto model picker with friendly names; Settings dialog; qwen3:30b-a3b tested and removed from B.
- ~08:30 [Servers] [Limelight AI] Temporary public quick tunnel (trycloudflare.com) run by the owner; a copy of cloudflared placed in `E:\Limelight Ai\tools`.
- ~08:50-09:10 [Servers] limelightcorp.net bought (GoDaddy) and moved to Cloudflare; named tunnel `limelight-ai` created by the owner; ai. and editor. hostnames live; tunnel VBS in the startup folder.
- ~09:00 [Limelight AI] ai.limelightcorp.net live (named tunnel `limelight-ai` on JASPREET); editor.limelightcorp.net added.
- ~09:20-09:30 [Limelight AI] Phone toolbar fix, `?v=` cache-busting, Log out button.
- ~09:00 (to 29 Oct ~06:30) [Limelight AI] GPT-style pictures: chat image tools, Qwen-Image, Qwen-Image-Edit-2509, Hindi text through Edge; live on B and tested through chat.
- ~10:20-19:50 [Limelight AI] Kimi K3 and hardware purchase questions answered (no changes).

## 29 Oct 2026

- 06:18 [Design] Owner asked to merge Canva, Photoshop, Illustrator, CorelDRAW, Blender and Figma into one easy local app like the video editor.
- 06:20 [Office] Owner asked for MS Office + Gmail + Calendar + Drive combined into one local app, like the video editor agent.
- 06:39 [Design] Limelight Studio v1 on :3330: Canva-style editor, templates, brush/filters, pen, 3D Studio, PNG/JPG/SVG/PDF/PSD export, PSD/SVG import, auto-save.
- 06:42 [Office] First build on :3300: Word/Excel/PPT through COM (PDF too, Hindi OK), AI assistant (qwen3:8b) with Approve step, office-agent skill and `otool.mjs` CLI, Desktop shortcut. Google not connected.
- 07:25 [Design] Desktop shortcut and minimised-window launcher.
- 07:25 [Office] Step-by-step Google Cloud OAuth guide given (owner to do it).
- ~07:30 [Limelight AI] Ask default → qwen3:8b; Work stays gpt-oss:20b; picker shows one row per model ("Deep thinking"); modes renamed Ask / Work / Build; redeployed after being overwritten. `/image` fix; Log out server part deployed on B.
- 07:50 [Design] Photoshop-style Layers panel (eye column, folders, fx Drop Shadow, Smart Filters, masks).
- 07:54 [Office] Pages renamed (Mail, Storage, Document, Grid, Present, Meetings). Added News, Chats, Chatbot, AI Assistance, Agent, Task, Attendance. Sidebar split into Work / Create / AI / Team.
- 07:56 [Design] PSD export rewritten: folders, editable Drop Shadow/Stroke, layer masks, blend/opacity, editable text.
- 08:04 [Design] Panels reordered (Properties left, Layers dock right). Vector and AI plan explained.
- 08:10 [Office] Real Word/Excel/PowerPoint-style editors built (ribbon, start screen, formula engine). The form version was rejected. "Connect Google" text removed.
- 08:11 [Workspace] Workspace UI first built inside Limelight Studio (:3330): Home prompt, app cards, AI Image, AI Video (UI only), Library.
- 08:18 [Design] Photoshop-style file tabs on top and per-size artboards. Bottom pages bar removed.
- 08:20 [Workspace] All apps embedded in one window through local proxies 3341-3344.
- 08:23-08:25 [Workspace] [Design] Workspace split into its own app `limelight-workspace` on :3350; Studio back on localhost:3330 as a design tool only, with a minimal premium theme.
- 08:28 [Home] [Edit] One login (HR email/password); "Video Editor" renamed "Edit"; Edit kept its own login ("don't touch the editor").
- 08:31 [Office] Full toolsets added to all three editors. Header/page number, Excel chart, star shape and push transition verified in real files.
- 08:35 [Office] Owner asked to replace Google Mail/Calendar/Task/Meetings with Limelight's own.
- 08:36 [Design] Background colours set from the owner's screenshot.
- ~08:40 [Limelight AI] Video Studio tab and `video.py` (Wan 2.2 TI2V-5B, 34 GB) built and tested on JASPREET.
- 08:41 [Design] 6 home page options mocked at `/home-options.html`.
- 08:43 [Workspace] [Chats] [Create] Glass Aurora look with the real Limelight logo; WhatsApp-style Chats with groups; Create page.
- 08:47 [Design] Editorial home applied.
- 08:50 [Design] Labels added under the right-dock icons.
- 08:55 [Home] Line-icon app row, widgets, Today feed.
- 09:02 [Office] Own team mail + IMAP/SMTP inbox, calendar with RSVP, tasks board, WebRTC meetings, notifications, LAN https :3443 with team logins. Present renamed Deck. 7 UI looks added.
- 09:02 [Office] [Workspace] Office + old Lighthouse HR app merged into one Office menu; workspace renamed "Lighthouse".
- 09:07 [Workspace] Spotlight-style search (Ctrl+K), full-screen Home, AI removed from the Office menu, 6 themes.
- 09:09 [Office] Company mailbox setup prepared (limelightcorp.in is on Google Workspace, so an App Password is needed).
- 09:18 [Home] 12 themes + Custom, saved per device.
- 09:22 [Limelight AI] Admin field in the workspace for the Limelight AI shared password.
- 09:23 [Office] Google removed completely. Login is the HR (Lighthouse) account, staff synced, workspace Office menu mirrored, HR pages in a frame through Office's own proxy (3301/3444). Office stays standalone.
- 09:31 [App] [Home] Lighthouse.exe window app; Home became the "Big Numbers" dashboard (`/api/dashboard`).
- ~09:00-11:00 [Servers] NAYA A and B unreachable, then A down (RDP only) and B on standby; JASPREET local AI started as fallback; workspace failover lists added.
- 10:30 [Home] Dashboard top row = Edit / Design / Office / AI tabs.
- 10:44 [Home] Soft Aurora header chosen as default.
- 10:46 [Home] Rose Quartz added; Sunset replaced by Sunrise; theme updates reach saved choices.
- 10:49 [Home] Big logo off Home; search moved into the top tray on every page.
- 10:55 [Office] [Home] Office/HR inner pages in glass; stale cached frames fixed with `?v=`; greeting centred with English quotes.
- ~11:00 [Limelight AI] [Edit] NAYA A editor down → B became the standby editor → B's AI paused by the guard. The workspace falls back to JASPREET's local AI (127.0.0.1:8800), started by hand.
- 11:03 [Edit] [Limelight AI] [Servers] Edit fallback to NAYA B standby; AI fallback to JASPREET; publish script made.
- 11:08 [Servers] lh-* hostnames live (owner ran the publish .bat).
- 11:10 [Servers] Site moved to bare limelightcorp.net + www.
- 11:35 [Workspace] [Docs] Full-screen button for apps; Feature Guide deck.
- 11:47 [Home] [Docs] Graphite theme; Proposal deck (later 21 slides with Office team pages).
- 13:12 [App] Lighthouse.exe zip for other PCs (opens www).
- 13:24 [Servers] Apex domain live after the owner fixed DNS (bare limelightcorp.net and www point to the workspace).
- 13:28 [Servers] lighthouse.limelightcorp.net removed.
- 20:11 [Office] [Workspace] Office admin-only notice made readable; replies to the owner switched to English.
- 20:27 [Office] [Home] [Profile] Office per person (trusted headers); owner-access bug fixed; clock-in card, welcome animation, Profile with photos, Team tab.
- 22:39 [Servers] http → https redirect.
- 22:43 [Office] Office Deck layout fix.
- 22:49 [Edit] Edit sign-in remembered per person (cookie jar). (Later removed; see edit.md.)
- 23:02 [Office] [Profile] Old HR splash loader hidden inside Office and Profile.
- 23:13 [Edit] Edit opens with no sign-in (trusted key on NAYA A/B; release 20261029-231048).
- 23:20 [Chats] Share button in every app; Forward and share cards in Chats.
- 23:23 [Library] YouTube-style player for Edit renders.
- 23:29 [Workspace] Full screen keeps a slim tab bar with app icons.
- 23:38 [Workspace] Apps open filling the window; logo = Home.
- 23:56 [Profile] [Edit] Work-time log (idle 3 min) and Profile Time; Premiere/DaVinci link relay.
- (no time) [Design] CDR / AI / vector-PDF export via CorelDRAW (`tools/corel.vbs`, `/api/convert`, `/api/zip`) and the image origin fix (`localSrcs`), from another session.
- (no time) [Limelight AI] Limelight AI added to the workspace (proxy 3344). The office AI password is set once by an admin. Studio generative fill uses the local AI on JASPREET for SDXL inpainting.

## 30 Oct 2026

- 00:31 [Design] Design exports PSD / PDF / CDR / AI / PNG / JPG / SVG via CorelDRAW (workspace side).
- 01:00 [Profile] [Home] [Workspace] [Edit] Idle 5 min, no toast; owners (Jaspreet, Gurpreet) rules; admin Time board; "Lighthouse" word removed; bar layout tabs / search / icons; uniform app cards; Gita quote; "← Workspace" buttons; Home 3 s caps + cache; editor app backed up and folded into the workspace app.
- 01:16 [Office] Office redesigned inside the workspace: glass look via `embed/office.css` and `embed/office-hr.css`, HR clock-in splash/card hidden, "Lighthouse" text replaced by Limelight, Pure Black made the default theme.
- 01:24 [Design] Design · Vector · Book · 3D tabs at the bottom (Smart-Object layer model), Vector tools, Book (InDesign + Quark), 3D as a tab, generative fill in all tabs (blocked by AI password), multi-page CDR.
- 01:24 [Office] [App] [Limelight AI] [Edit] Salary page; Lighthouse.exe 1.2 (icon, self-update from NAS); AI per-person chats (workspace side); Edit Audio tab / Beat Maker and private presets (source).
- 01:29 [Office] Live co-editing and Share added to Document / Grid / Deck. Office Home cards refined.
- 01:29 [Design] Live collaborative editing (SSE, avatars, selections, pointers). Workspace proxy sends identity.
- 01:30 [Office] Standalone Office menu "Home" renamed Dashboard.
- 01:35 [Office] Notifications (day groups, type icons), Events (date tiles) and Payroll (summary cards, table) redesigned via `embed/office-hr.js` and CSS.
- 01:35 [Office] Office Mail team-only on Limelight's own server.
- 01:36 [Office] [Design] Office redesign (Notifications, Events, Payroll) live in the workspace; Design live editing and roomier app bar.
- 01:46 [Office] Meetings "Camera needs https" fixed. New workspace-native Home, Tasks and Projects pages with the `/api/hr` pass-through.
- 01:46 [Design] Bottom tab bar restyled exactly like Edit's. App names in brackets removed.
- 01:53 [Office] Overtime tab (daily OT checked against clock-out, admin approve, feeds Salary) and the admin/owner team dashboard added.
- 12:16 [Office] Owner confirmed the Overtime tab. The Salary "replace HR auto-OT" rule kept.
- 12:19 [Edit] The workspace switches on Edit's project tabs itself.
- 14:31 [Design] Studio sends the workspace AI key. NAYA B update script prepared for the owner to run.
- 14:56 [Design] Full Photoshop toolset, menus, options bar, Properties and shortcuts in the Design tab (`ps-*.js`).
- 15:12 [Design] Masking fixed (mask follows layer, 8192 px), mask handling like Photoshop, Select and Mask / Refine Mask.
- 15:22 [Design] Photoshop-style Generative Fill / Expand using this PC's AI (fallback when NAYA B refuses), 3 variations, Properties panel.
- 15:35 [Design] "Remove" made AI-free and fast. Aerial-map bug fixed. Progress, Cancel and result guard added.
- 15:48 [Design] Generative fill fixed and moved to SDXL Inpainting 0.1 (downloaded; about 30 s for 3 variations). Smear fixed. Expand no longer waits for a picture description.
- 18:49 [Design] 5th tab Color (Lightroom Develop replica, non-destructive, GPU).
- ~19:00-20:00 [Limelight AI] Wan crash debugging (driver reset on 8 GB); Wan stopped on the owner's request.
- 19:11 [Design] Pasteboard behind the artboard set to grey `#3c3c3c` in all tabs.
- 19:31 [Office] Single login confirmed across the workspace apps. Data-location map written (Office files on the NAS).
- ~19:40 [Design] Single login confirmed for Design inside the workspace. NAYA B's AI now accepts the workspace key.
- 19:44 [Limelight AI] [Servers] Owner ran "Per-person AI chats (run once).bat": office-key login (no password inside the workspace) plus per-person chats live on B.
- (no time) [Servers] Workspace runs with `--lan`; Lighthouse.exe 1.3 prefers the LAN address; per-person Office storage on the NAS; whole team added to Edit on NAYA A; guri made an Edit owner.
- 21:40 [Workspace] [Home] Phone layout for the workspace; slide to clock in.
- 23:26 [Office] Office phone layout.
- 23:28 [Workspace] Version tags so Cloudflare and phones get new CSS at once.
- 23:33 [Home] Gurpreet 10-year sign-in; Desktop theme default (briefly).
- 23:39 [Home] Pure Black default everywhere; phone header / Home polish.
- 23:48 [Office] Office first page renamed Dashboard and made the default.
- 23:56 [Workspace] [Office] Speed-up (1-year cache with automatic version stamps, Hindi font dropped, logos shrunk); Document / Grid / Deck on phones.

## 31 Oct 2026

- 00:06 [Workspace] [Office] [Design] All visible text English (workspace, Office, Studio).
- 00:12 [Home] Login page script fix ("Couldn't" apostrophe); clear wrong-password message.
- 00:16 [Home] Sessions last 30 days from last use.
- 00:21 [Home] Sign-in attempt log added.
- 01:07 [App] Installable app (manifest, icons, service worker, offline page); login page links versioned.
- 01:20 [Edit] Editor release d369a17 deployed to NAYA A (release 20261031-011942).
- 01:22 [Edit] Deploy-script fix committed (47e1979).
- (no time, from git) [Workspace] Snapshot commit of the workspace as it ran (0767ad8), then the server split into one file per area under `server/` and `server/areas/` with behaviour unchanged (bd115ea).
- (no time, from the folder) [Workspace] [Docs] Design mockup pages moved from `public/` to `archive/mockups/` (no longer served); `.gitignore` updated; this handbook written in `docs/`.
- (no time) [Chats] [Docs] Checked `chat.mjs`: the group-rename line and empty-message error are already English; removed the stale "two Hinglish strings" item from `chats.md` and `PENDING.md`.
- 02:00 [Workspace] One repo for the whole workspace: `E:\Limelight Ai` (Lighthouse, Office, Design, Limelight AI) pushed to github.com/Jaspreetnov-11/LimelightWorkspace; Lighthouse's own history kept; private data, passwords and installs left out. Edit stays in its own repo (EditorAgent).
- 02:07 [Servers] `start-all.ps1` + "Limelight Workspace (start all).vbs": starts Lighthouse, Office, Design and the local Limelight AI fallback (with Ollama on JASPREET) if they are not running.
- 02:10 [Workspace] One chat per area in the Claude app (Home, Chats, Edit, Design, Office, Limelight AI, Platform & Servers); the old workspace chats archived. `FEATURES.md` written.
- 02:20 [Workspace] Full read-only test of every area (phone, tablet, desktop, public site).
- 02:40 [Chats] Phone: the message box was hidden under the bottom bar - inside an open chat the bar now steps aside; "Write a message" placeholder.
- 02:40 [Office] A new Document/Grid/Deck is "New · not saved yet" instead of "Unsaved changes"; leaving a changed file asks with Office's own pop-up (the browser's confirm() is blocked inside the workspace frame and kept every menu item stuck on the editor).
- 02:40 [Workspace] Back / Forward (and a phone's back gesture) move between areas; each page is a history step.
- 02:40 [Design] Studio's "← Workspace" link (a local address) is hidden inside the workspace frame.
- 02:40 [Profile] [Create] [Office] Small fixes: no empty profile picture request, "How many" label, Gita line wraps on tablets, no "Sign out" in Office setup inside the workspace.
- 03:00 [Workspace] Final check: both repos clean, pushed and private; every app and PC up; 26/26 page and data checks unchanged; PENDING.md cleared of items finished on 31 Oct.
- [Servers] https on the office network: every workspace port answers http and https (`server/tls.mjs`); name office.limelightcorp.net (DNS only); Let's Encrypt certificate via `tls\Get office certificate.bat` with weekly renewal; optional `lanHttpsOnly` redirect.
- [App] Lighthouse.exe 1.4: tries https://office.limelightcorp.net:3350 first, then the old office address, then online.
- 03:20 [Profile] Overview's leave balance now matches the Leaves tab (HR yearly quota minus approved leave this year, pending shown); no more "Leave policy not set" when the HR record has no leave fields.
- 03:20 [Home] [Limelight AI] The AI password box is gone from the account menu (and `POST /api/settings/ai`); the workspace key signs people in. `/api/health` reports 1.2.0.
- 03:30 [Design] The open design is in the address (`#d/<id>`): reload and the workspace Share open that exact design; the tab title is the design's name.
- 03:30 [Office] [Design] [App] READMEs rewritten to match the code (Office, Studio) and the Windows app read-me in English (also inside its zip).
- 04:40 [Limelight AI] Images page and generative fill keep the connection alive (a space every 10 s) - no more Cloudflare cut on a cold model; deployed to NAYA B (backups `*.bak-20261031-0429`). JASPREET's fallback AI got the workspace key, so per-person chats work there too.
- 04:50 [Design] Studio's AI routes (image, edit, generative fill) keep the connection alive the same way; pages read errors from the reply.
- 04:50 [App] Desktop-shortcut message in the Windows app in English (folder and zip).
- [Limelight AI] [Office] Ollama replaced by the Limelight AI engine (llama.cpp router, 127.0.0.1:8830) on JASPREET: `server/llm.py`, Office's agent on the OpenAI-style API; Ollama's models reused through hard links (0 extra GB); photos move to Gemma 3 12B; same speed (27 vs 26.5 tokens/s). NAYA B: `Switch NAYA B to llama.cpp.bat` (owner).

## 2 Nov 2026

- [Office] New admin page **Attendance** (its own menu item, between Salary and Payroll; a first try put Salary, Attendance and Payroll as tabs on one page - the owner wanted them separate): everyone's month day by day (P / W / ½ / A / L / H, late ring, hours on hover), totals and CSV, from the HR team summary (`GET /api/salary/attendance`). Workspace restarted to load the route.
- 2 Nov 2026 [Office] [Servers] Old Lighthouse site closed for now (owner's yes): opening lighthouse.limelightcorp.in directly goes to limelightcorp.net. Its API (workspace sign-in and data), the HR pages inside Office and the public /careers and /signup pages still work. HR app commit 5468918 (`src/app/layout.js`); delete that script to open the old site again.
- [Office] New admin page **Leave approvals** (after Attendance): pending leave / half-day / WFH requests with the person's leave balance, Approve / Reject with a note (sent to the HR app, which notifies them), and the last 40 decided. Routes `GET /api/salary/leaves`, `POST /api/salary/leaves/decide`. Workspace restarted.
- 2 Nov 2026 [Home] Laptop screens: Home was fixed to the window height, so on a shorter screen the bottom rows were squeezed and cut off with no scroll. Home now grows and scrolls; Today/Projects/Team updates keep a steady height (scrolling inside) and stretch to fill a tall monitor; Full HD still fits one screen.
