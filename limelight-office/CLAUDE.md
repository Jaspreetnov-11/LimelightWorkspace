# Limelight Office

This folder is Limelight Office, the Limelight team's own Mail, Calendar, Task and video Meetings plus Document / Grid / Deck
(Word / Excel / PowerPoint) editors (`node server.mjs`; this PC http://127.0.0.1:3300, team LAN https://<IP>:3443).
When the user asks you to work their mail, calendar, tasks or Office files:

1. Make sure the app is running (`node engine/otool.mjs status`); if not, start `Start Limelight Office.bat`.
2. Work through `node engine/otool.mjs <command>` (run it with no command for the list). It prints JSON.
3. Before `send`, `event` (with guests), or `upload`, show the user exactly what will go out and get a yes — these act in
   their name. Reading mail, listing events and making local Word/Excel/PowerPoint files need no confirmation.
4. Word content is markdown (`# heading`, `- bullet`, `1. list`, `| table |`); PowerPoint slides are
   `[{ "title", "bullets": [], "notes" }]`; Excel takes CSV or `[{ "name", "rows": [[...]] }]` (`=` starts a formula).

`data/` holds private data (office.db with everyone's mail, secret.key that encrypts mailbox passwords, Google token, ssl key): never print, copy or send it.
