# Limelight Office

Limelight's own Mail, Calendar and video Meetings for the team, plus Document / Grid / Deck editors (real Word / Excel /
PowerPoint files), Files, News and a local AI Agent. Usually opened inside the Limelight workspace (Office app); it also runs on its own.

- **Addresses:** this PC http://127.0.0.1:3300 (the owner, signed in automatically) · office LAN https://<this PC's IP>:3443 (team logins).
- **Start:** double-click `Start Limelight Office.bat`, or `Limelight Office (no window).vbs` (hidden; the workspace's Start button runs it).
  Restart: stop the process on port 3300, run the `.vbs` again. Needs Node.js 24 (uses `node:sqlite`) and Microsoft Office installed.
- **Login = the HR account** (email + password, checked by the HR app at lighthouse.limelightcorp.in), the same one login as the workspace.
  Inside the workspace nobody signs in again: the workspace vouches for each person with the shared key in `data/workspace.key`
  (accepted only from this PC), and every person gets their own Office account. No Google: all Google code was removed.
- **Menu** (same as the workspace's Office menu): Mail, Calendar, Meetings, Files, Document / Grid / Deck, Agent, AI Assistance,
  News and Office setup are this app; Dashboard, Tasks, Projects, Attendance, Leaves, Staff, Departments, Events, Notifications,
  Settings and the admin pages are HR app pages shown inside (HR proxy 127.0.0.1:3301 / LAN https :3444).
- **Mail** is team mail only, kept on this server (`teamMailOnly: true`; no outside mailbox).
- **Files:** each person's Document / Grid / Deck files and Files live on the office NAS:
  `\\192.168.0.99\Team Editing\Limelight Storage\<email>\Office` (`storageDir`). If the NAS is off, the local folder
  `Documents\Limelight Office` is used.
- **Document / Grid / Deck** (`public/editors/`) open and save real .docx / .xlsx / .pptx through the installed Office
  (`engine/ps/office.ps1`), with live co-editing. Excel pictures/charts made outside the app are not kept by Grid (it warns).
- **Team PCs on the LAN:** open the https address, accept the self-signed certificate once, sign in. Windows Firewall needs
  ports 3443 and 3444 allowed (Office setup → Team shows the command).
- **AI:** Ollama at NAYA B (`192.168.0.205:11434`) first, then this PC (`127.0.0.1:11434`), model `qwen3:8b`. Sending mail,
  adding/deleting events, uploading and binning always wait for your **Approve**.
- **Command line:** `node engine/otool.mjs <command>` (prints JSON; used by the office-agent skill).

Layout: `server.mjs` (HTTP + HTTPS + HR proxy; npm: imapflow, mailparser, nodemailer) · `engine/` — `db.mjs` (SQLite),
`auth.mjs` (HR login, staff sync, per-person accounts), `lighthouse.mjs` (HR server), `config.mjs`, `lmail.mjs`, `lcal.mjs`,
`live.mjs` (SSE: notifications, meetings, co-edit rooms), `office.mjs` + `ps/office.ps1` (Office through COM), `agent.mjs`,
`news.mjs`, `store.mjs`, `otool.mjs` · `public/` (UI: `app.js`, `meet.js`, `editors/`).

`data/` is private (office.db with everyone's mail, `secret.key`, `workspace.key`, ssl key, settings): never print, copy or share it.
