# Lighthouse (Limelight's workspace)

Every Limelight app in one window, behind one login. Look: "Glass Aurora" (aurora background, frosted glass, Limelight logo).

## Start

Double-click **Start Lighthouse.bat** (or `node server.mjs --open`) → http://localhost:3350
Limelight Studio (Design, port 3330) should also be running: designs, the picture Library and AI images come from it.

## One login

Log in with your **Lighthouse** email and password. The Workspace then opens Lighthouse already signed in, and signs in to
Limelight AI with the office password in `config.json` → `aiPassword`. **Edit** (the video editor) still asks for its own
sign-in for now. If Lighthouse can't be reached, the last password Lighthouse accepted on this PC still works.

## What's inside

- **Home** – Limelight logo, one prompt (Image / Video / Design), app tiles with live status, recent chats, today's
  Lighthouse tasks, recent work.
- **Chats** – office chat: 1-to-1 and groups (admins, add/remove members, rename, leave), photos and files (drag, paste or
  📎, up to 35 MB), reply, delete for everyone, read ticks, typing, online status, unread badges, desktop notifications.
  People = Lighthouse staff + anyone who has logged in here.
- **Create** – AI Image (Limelight AI on NAYA B) and AI Video (UI only; requests are saved until a video engine is installed).
- **Library** – everything in Studio's Library.
- **Office** – ONE menu over two apps, each feature once: Mail, Calendar, Meetings, Files, Document/Grid/Deck, News,
  AI Agent/Assistance and Office setup come from Limelight Office; Home, Tasks, Projects, Attendance, Leaves, Staff,
  Departments, Events, Notifications, Settings and the admin pages (Payroll, Payments, Clients, Reports, Performance)
  come from the Lighthouse web app. Their own sidebars are hidden inside the frame (`embedCss` in server.mjs).
- **Apps** – Edit, Design, Office, Limelight AI open inside the window (top-right dock), each kept loaded.
  They are served again on localhost ports 3341 Edit · 3342 Office · 3343 Lighthouse · 3344 AI · 3345 Design.

## Files

`server.mjs` (HTTP + app proxies) · `auth.mjs` (one login) · `chat.mjs` (chats) · `public/` (UI) ·
`Data/` (users, sessions, chats, chat files, video requests — private; `secret.key` encrypts saved Lighthouse tokens).

## Online (limelightcorp.net) and office LAN

- **Online:** double-click `publish\Publish Lighthouse online.bat` once (adds limelightcorp.net + www and the app hosts
  lh-edit / lh-office / lh-team / lh-ai / lh-design to the Cloudflare tunnel on this PC, creates their DNS, restarts the tunnel).
  The login cookie is shared across *.limelightcorp.net so one login opens every app. From outside, Office is admins only
  (it runs as this PC's owner).
- **Keep the server running:** `Lighthouse Server (no window).vbs` (copy it into shell:startup to start at sign-in).
- **Office LAN directly:** start with `node server.mjs --lan` and allow ports 3341-3345 and 3350 in Windows Firewall for
  192.168.0.0/24 — or simply use the online link from office PCs too.
- Edit and Limelight AI follow their PCs: Edit = NAYA A, else NAYA B's standby (:3100); AI = NAYA B, else this PC (:8800).
