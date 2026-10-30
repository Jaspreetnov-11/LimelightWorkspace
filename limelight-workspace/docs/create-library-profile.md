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

### What users can do
- **Videos tab (opens first):** a YouTube-style player for **finished Edit renders only**. Big player with title, project, who rendered it, date and size. Buttons: **Download**, **Share** (to people/groups in Chats), **Open in Edit** (opens the project). On the right: a searchable list (by render, project or person), newest first, with project thumbnails and a "Playing" badge. **Autoplay next** is on by default and remembered per PC. 9:16 reels get a taller player. On a phone the list goes under the player.
- **Images tab:** the AI image library from Studio.
- Someone without an Edit account sees a note to ask for Edit access.

### How it works
| Part | Detail |
|---|---|
| Render list | `GET /api/renders` (`server/areas/library.mjs`). The workspace asks Edit **as that person** (Edit key + their Edit name), so Edit's own access rules decide which renders each person sees. It reads Edit's project list, then each project's renders, six projects at a time |
| Filter | Only finished `.mp4`, `.mov`, `.webm`. No render-bar previews, audio-only files or image sequences |
| Caching | Server keeps the list 2 minutes per person (`?fresh=1` skips it). The page re-asks at most once a minute |
| Playback | Videos stream through the Edit proxy (port 3341) with HTTP Range (`206 Partial Content`), so seeking works |
| Images | `GET /api/library` (passed to Studio) |
| Files | `public/js/library.js`, `public/css/library.css`, `#libTabs` / `#libVideos` in `public/index.html`. No editor change was needed |

### Known issues / pending
- The Download button and the phone layout have not been tested live.

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
