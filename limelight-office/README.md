# Limelight Office

Limelight's own Mail, Calendar, Task and video Meetings for the team, plus Document / Grid / Deck editors (real Word / Excel /
PowerPoint files) and a local AI Agent. This PC: http://127.0.0.1:3300 (owner, no password). Office LAN: https://<this PC's IP>:3443 (team logins).

- **Start:** double-click `Start Limelight Office.bat` (or `Limelight Office (no window).vbs`). Needs Node.js and Microsoft Office.
- **Login = Lighthouse account** (email + password checked by lighthouse.limelightcorp.in), same as the Lighthouse workspace. The menu is the workspace's Office menu: Mail, Calendar, Meetings, Files, Document/Grid/Deck, Agent, News, Office setup are this app; Home, Tasks, Projects, Attendance, Leaves, Staff, Departments, Events, Notifications, Settings and the admin pages are Lighthouse pages shown inside (proxy 127.0.0.1:3301 / LAN https :3444). No Google.
- **First time:** Office setup → My account → Sign in with Lighthouse (brings the staff list). Office setup → My mail: optional company mailbox (IMAP/SMTP).
- **Team PCs:** open the https address, accept the self-signed certificate once, sign in. Windows Firewall may need port 3443 allowed (ports 3443 and 3444; Office setup → Team shows the command).
- **Data:** `data/office.db` (SQLite: users, mail, calendar, tasks, notifications), `data/mailfiles/`, `data/secret.key` (encrypts mailbox passwords), `data/ssl/`.
- **Pages:** Home · Work (Mail, Calendar, Meetings, Task, Storage) · Create (Document, Grid, Present) · AI (Agent, Chatbot, AI Assistance, Chats) · Team (Attendance, News) · Setup.
- **Document / Grid / Present** are in-app editors in the style of Word / Excel / PowerPoint (`public/editors/`). They open and save real .docx / .xlsx / .pptx through the installed Office (`engine/ps/office.ps1`, actions doc*/grid*/slides*). Excel pictures/charts made outside the app are not kept by the Grid editor (it warns).
- **Files** made here go to `Documents\Limelight Office` (change it in Setup).
- **AI:** Ollama at NAYA B (`192.168.0.205:11434`) first, then this PC (`127.0.0.1:11434`), model `qwen3:8b`. Sending mail,
  adding/deleting events, uploading and binning always wait for your **Approve**.

Layout: `server.mjs` (HTTP + HTTPS; npm: imapflow, mailparser, nodemailer) · `engine/db.mjs`, `auth.mjs`, `live.mjs` (SSE: notifications + meeting signalling), `lmail.mjs`, `lcal.mjs` (calendar + task) · `public/meet.js` (WebRTC rooms) · `engine/google.mjs` (OAuth + Gmail/Calendar/Drive REST) ·
`engine/office.mjs` + `engine/ps/office.ps1` (Office through COM) · `engine/agent.mjs` (assistant + tools) ·
`engine/otool.mjs` (command line) · `public/` (UI) · `data/` (settings, Google token — private, never share).
