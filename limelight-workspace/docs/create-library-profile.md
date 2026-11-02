# Create, Library and Profile

Three workspace pages that are drawn by the workspace itself (no app frame).

---

## 1. Create (AI image and AI video)

### What users can do
- One Create page with an **Image / Video** switch.
- **AI Image:** prompt, style (Photo, Cinematic, Poster, 3D…), size (1:1, 4:5, 9:16, 16:9), Fast or Best, 1, 2 or 4 pictures, and "Leave out" (negative prompt). Results are saved to the Library.
- **AI Video:** prompt, start photo, camera move, 9:16 / 16:9 / 1:1, 5 s or 10 s. **Screen only.** Requests are saved; no video is made yet ("engine pending").
- The search bar actions "Make an image with AI" / "Make a video with AI" open Create with the typed text.

### How it works
| Step | Detail |
|---|---|
| Image request | `POST /api/ai/image` from `public/js/workspace.js` (`setupImage`) |
| Pass-through | `server/areas/design.mjs` forwards every `/api/ai/...`, `/api/projects`, `/api/library`, `/projects/…` and `/library/…` request straight to Studio (`studioUrl`, port 3330). If Studio is off: "Limelight Studio is off - start the Design app" |
| Picture made by | Studio calls Limelight AI (NAYA B first, then JASPREET's local copy) with the workspace AI key. See [design.md](design.md) and [limelight-ai.md](limelight-ai.md) |
| Video request | `POST /api/ai/video` (`server/areas/create.mjs`) saves the request in `Data/video-requests.json` (last 50). `GET /api/ai/video` lists them |

### Known issues / pending
- No text-to-video engine. Candidates: Wan 2.2 TI2V-5B or LTX-Video on NAYA B's 12 GB card (Wan was tried on JASPREET and stopped by the owner on 30 Oct).
- AI images fail while NAYA B is busy running the standby editor (the AI pauses then).
- Ideas not built: "Send to Design" for AI images, AI video into an Edit timeline, Brand Kit, image edit / background removal (Qwen-Image-Edit on NAYA B), voice-over.

---

## 2. Library

A **Reels-style feed of every finished output** in the workspace (2 Nov; before that it was a YouTube-style player for Edit renders plus an Images grid).

### What users can do
- One item fills the screen. **Phone:** swipe up / down. **Laptop / desktop:** mouse wheel (one item per turn), arrow keys / Page Up / Page Down / J / K, Home / End.
- **Videos** play muted while on screen and stop when scrolled away. Tap a video to pause / play; tap its thin bar at the bottom to jump. The **sound** button (or M) turns sound on for every video and is remembered per device.
- **Pictures** are shown whole (fitted, never cropped); tall and wide pictures get a matching card.
- Each item shows the app it came from (Edit, Design, Create, Limelight AI), how long ago, the name, and the project, who made it and size where known.
- Buttons on each item: **Download**, **Share** (to people or groups in Chats), **Open** (Edit project, Design, the Create page, or Limelight AI).
- Top bar: filters **All / Videos / Pictures**, **Edit / Design / Create / AI**, **Mine**, a search box, and "3 / 156" (where you are).
- **Infinite scroll** (owner, 2 Nov: "scroll kare aur aate jaaye"): the feed is drawn 12 items at a time and the next 12 are added two screens before you reach the end, on phone and computer alike, with no button. After the last item a card says "That's everything - N items" with **Back to the top**. End jumps to the last item (draws the rest first). A filter or search starts again from the first batch.
- **Phone:** the bottom tab bar is docked to the very bottom edge of the screen (full width, room for the iPhone home bar) and the feed stops just above it, so it never covers Download / Share / Open.

### Who sees what (owner, 2 Nov: "sabko dikhe")
- **Every signed-in person sees every output from everyone.** It stays inside the workspace login; nothing is public.
- This **opens up Edit renders**: until now each person saw only the renders of the Edit projects they could open. The feed now asks Edit as an owner (Edit shows an owner every project) and streams the files itself, so nobody needs Edit access to watch or download a render. **Open** on someone else's project still follows Edit's own rules (Edit may say no access).
- Design and Limelight AI pictures were already shared with everyone; they now show in the feed.
- **Mine** works for Edit renders only (the only source that records who made it). Design and AI pictures have no maker recorded.
- **Not in the feed:** raw uploads in Design's Library, the AI fill options (`genfill_*`), design and project files, chats, HR, salary, and AI video requests (no video is made yet).

### Sources
| Source | What | Where it is read |
|---|---|---|
| Edit | Finished renders (`.mp4`, `.mov`, `.webm`; no previews, audio or image sequences) of every project | Edit's `/api/projects` + `/api/renders?p=`, asked as an owner's Edit name (the first owner signed in on this PC who has Edit), six projects at a time. Falls back to the viewer's own Edit name |
| Create / Design | AI pictures `ai_*` (Create and Design's AI tool) and 3D renders `3d-render_*` | Studio's `Library` folder on JASPREET |
| Design | Exports: each "all formats" folder (shown by its PNG/JPG, **Download** gives its `.zip`), and single exported pictures | Studio's `Exports` folder |
| Limelight AI | Pictures and videos from its galleries | NAYA B `/api/images`, `/api/videos` with the workspace AI key |

### How it works
| Part | Detail |
|---|---|
| Feed | `GET /api/feed` (`server/areas/library.mjs`): all sources together, newest first. The same for everyone, so one list for all (`?fresh=1` builds a new one and waits for it). A source that does not answer is left out and named (`down`); the page shows a short note |
| Files | Edit and Limelight AI files come through `GET /api/feed/file?from=edit|ai&u=<path>`, which fetches them with the Edit / AI key and passes HTTP Range through (videos seek). Only render files and thumbnails of Edit, and `img_*` / `vid_*` files of the AI, are allowed. `&dl=1` adds a download file name. Design files come through the normal Studio pass-through (`/library/`, and `/exports/`, added to `server/areas/design.mjs`) |
| Studio folder | `config.json` `studioDir` (default `../limelight-studio`) |
| Picture previews | `GET /api/feed/preview?from=studio|ai&u=<path>[&t=<change time>]`: the picture at 1080 px on the long side as WebP (quality 78, ~15-200 KB instead of 1-2 MB), made once with ffmpeg (`config.json` `ffmpeg`, default `ffmpeg` on PATH) two at a time and kept in `cache/feed-previews/` (git-ignored; delete it to remake them). Made in the background after each new list, so nobody waits. Only Create / Design AI pictures, 3D renders, exports and the AI's `img_*` / video posters are allowed. If ffmpeg fails, it sends the original picture instead. **Download** still gives the original (`dl`) |
| Speed of the list | `/api/feed` answers at once from the last list; when that is over 90 s old a new one is built in the background for the next person. The list is also built 4 s after the server starts |
| Page | `public/js/library.js` (feed drawn in batches of 12 - `reelsMore`, `moreObs` -, filters, swipe / wheel / keys, play on screen), `public/css/library.css`, `#v-library` in `public/index.html`. Only the item on screen loads its file; the next one loads once that is ready (a picture, or a video's poster); videos two or more away let go of theirs |
| Older route | `GET /api/renders` (one person's own Edit renders) is kept but no page uses it now |

### Tested (2 Nov, on a copy on port 3399, as a staff test login)
- 156 items: 102 Edit renders (that login saw 18 before), 34 AI pictures, 14 Design, 6 Create. First load about 4.5 s, then from the cache.
- Wheel, arrow keys and swipe move one item; videos autoplay muted and stop off screen; Range seeking (206); downloads for Edit, AI, Create and a Design zip; Share opens; Mine; phone (375 px, above the bottom tab bar), laptop (1366×768) and desktop layouts.

- Infinite scroll and the docked bottom bar: checked at 375×812 and 1366×768 on the live server (batches add at item 10 of 12; filter resets; end card).

- Speed (2 Nov, phone width, on this PC): first 3 items 4,046 KB → 429 KB; first picture 3.8 s → 5 ms after the list (the original came through Studio, which takes ~1.8 s for a 2 MB PNG even locally); the list 4 ms either way from the cache, and no longer a 4-5 s wait after 90 s. Through Cloudflare each request also costs ~0.6 s.

### Known issues / pending
- No light 720p copy of videos yet: Edit renders are full quality from NAYA A. Making one would mean pulling each render once from NAYA A and encoding it on this PC (102 renders); not built.
- Live since the restart on 2 Nov (156 items on the live server). Not yet tried on a real phone.
- A new output shows up on the next open after the background rebuild (one open later than before).

---

## 3. Profile

### What users can do
- Open from the profile pill or "My profile" in the account menu.
- **Overview:** photo (click to change), role, department, employee ID, joining date, shift; this month's present / late / leave / absent; leave balance (left of the yearly quota, used, pending - worked out like the HR app's own Leaves page: HR `/settings` leaves per year minus approved leave days this year, half days 0.5, WFH not counted) and own leaves.
- **Attendance** and **Leaves / WFH:** the HR app's own pages in frames (moved here from the Office menu).
- **Time:**
  - Staff see only their own clock in / clock out for the day.
  - Admins see a table for any day: each person's clock in/out (with "late"), active work time per app, and task time. Clicking a person shows their sessions and tasks (time taken vs planned, overruns in red). Owners are left out.
- **Team:** everyone (about 54 people) with photo and a Message button. Admins can set anyone's photo.
- Profiles show only safe fields: **no salary, bank details, ID numbers or phone**.

### How it works
| Route | Job |
|---|---|
| `GET /api/profile` | HR `/api/auth/me`, `/api/attendance/stats/<id>?month=`, `/api/leaves` → safe fields only (`SAFE` in `server/hr.mjs`) |
| `GET /api/team` | HR `/api/employees` (cached 5 min), safe fields, plus photo and online flags |
| `GET /api/photo/<email>` | A profile photo |
| `POST /api/photo` | Save a JPEG (data URL). Own photo, or anyone's if admin |
| `GET /api/timeboard?day=` | Staff: own clock. Admins: everyone's clock, work time and task time for the day |
| `POST /api/activity/beat` | Work-time heartbeat (owners are ignored) |
| `GET /api/activity?who=&day=` | One person's sessions (own, or anyone's for admins) |
| `GET /api/activity/team?day=` | Everyone's totals (admins only) |

- **Photos:** the HR app has no photo field, so the workspace keeps them in `Data/photos/` as `sha1(email).jpg`. They show on the avatar, in Chats and in Team.
- **Work-time log** (`activity.mjs`, `public/js/activity.js`):
  - Every workspace page and every app frame reports mouse/keyboard use (apps report through `WHERE_JS`).
  - The page sends a heartbeat every 30 s with the open app and the last touch.
  - A session ends after **5 minutes idle** (first 3 minutes; the owner changed it to 5). Watching a video without touching anything counts as idle.
  - Sessions shorter than 30 s are ignored. Stored per day in `Data/activity/<YYYY-MM-DD>.json`.
  - It is **not linked to attendance**.
- HR data used: `/auth/me`, `/attendance/today`, `/attendance?date=`, `/attendance/stats/:empId?month=`, `/leaves`, `/tasks` (`mins`, `taken_mins`), `/settings` (selfie rules, OT rate, hours per day, leave quotas, grace minutes).
- Files: `server/areas/profile.mjs`, `public/js/profile.js`, `public/js/activity.js`, `public/css/profile.css`, `#v-profile` in `public/index.html`.

### Fixes worth knowing
- The Time tab only loaded when its button was clicked → it now loads whenever the tab opens.
- A global name clash (`hm`) in `activity.js` → renamed.

### Known issues / pending
- The admin Time board and admin views have not been checked with real admin data (the test account is not an admin).
