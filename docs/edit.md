# Edit (the video editor) inside the workspace

Edit is the Limelight Video Editor (renamed from "Video Editor"). Its own code and docs live in `D:\Video Editor Agent` on JASPREET (git; GitHub repo `Jaspreetnov-11/EditorAgent`). This page covers only what the workspace needs to know.

## What users can do
- Open Edit inside the workspace **without a second sign-in**.
- Edit fills the window under the slim app bar. Edit's own project tabs (with "+" for more projects) show inside the workspace. A "← Workspace" button sits in Edit's bottom bar, just right of Edit's logo.
- **Open in Premiere / DaVinci**: Edit's link is handed up to the workspace page, which passes it to the Windows app `Lighthouse.exe` (it collects the footage onto the PC first; see [phone-speed-app.md](phone-speed-app.md)).
- Share an Edit project to people from the workspace; it also grants them access in Edit (see [chats.md](chats.md)).
- Watch finished renders in Library → Videos.
- Editor features as of release `20261031-011942` (commit d369a17): Audio tab with Beat Maker; per-person presets, templates and music (an owner sees all; old ones stay shared); a newer Premiere/DaVinci message; "Ask Limelight AI" wording in Flow.

## How it works

### Where Edit runs
| Target | Address | Config key |
|---|---|---|
| Live editor | NAYA A `http://192.168.0.200` | `editorUrl` |
| Standby editor | NAYA B `http://192.168.0.205:3100` | `editorStandbyUrl` |

- The workspace serves Edit again on **port 3341** (`server/apps-proxy.mjs`). Public host: `lh-edit.limelightcorp.net`.
- It checks every 20 s which target answers and uses the first one that does (`server/app-list.mjs`).

### Sign-in by trusted headers (no Edit login)
1. The proxy finds the person's Edit name (`editAs()` in `server/areas/edit.mjs`), trying in this order:
   1. `config.json` `editNames` (email → an older Edit name),
   2. the start of their email address (their office ID),
   3. their first name, if it has at least 3 letters and no one else on the staff list shares it.
2. For each candidate it asks Edit (`/api/chat` with the headers) whether that name is a real Edit team member. Answers are kept a minute. If Edit does not answer, the name is given the benefit of the doubt.
3. Every request to Edit then carries `x-lh-edit: <Edit name>` and `x-lh-key: <shared key>`.
4. The key is `Data/edit.key` in the workspace. The same value is in `workspace.key` in the editor's data folder on NAYA A and in NAYA B's standby data. The editor (`startTeam()` in the editor's `server.mjs`) accepts the headers only with the right key **and** a real Edit team member.
5. Any copies of these headers sent by a browser are always stripped. An old Edit cookie (`ve_sess`) left in the browser is not passed on.
6. If there is no key file, or no Edit name matches, the person sees **"Edit is not on for you yet"** with the name to add to Edit's team. Nobody gets Edit's own sign-in page and nobody gets someone else's account.

**Where the code differs from the notes:** the notes say the workspace first uses "the Edit account the person signed in to once through the workspace (remembered, stored encrypted)" and falls back to Edit's normal sign-in when the key or name is wrong. The current code has dropped both: saved Edit sign-ins are deleted at startup (`auth.mjs`), and a missing key or unknown name shows the "not on for you yet" page. The test account maps to Edit's `test` user through the same rules.

### Edit's project tabs
- An editor that is not yet redeployed shows its tabs only when it is the top page. The proxy rewrites one line of Edit's page so that, inside a workspace frame, it counts as the top page (`const tabs = (window.top === window || window.parent === window.top) && …`). Edit's own tab frames, one level deeper, stay plain editors.

### Release flow (editor updates)
1. Code is changed in `D:\Video Editor Agent` on JASPREET (the coding PC).
2. Run `tools\server\Deploy to server.bat` **from PowerShell / double-click** (from bash it picked a different `scp` and could not reach PC B). It runs the auto-tests, then sends the release over SSH:
   - first to the standby PC NAYA B, where `receive-release.ps1 -Smoke` starts it as a throwaway editor on spare ports and checks it answers;
   - then to NAYA A, into `D:\Limelight Release\editor`.
3. NAYA A's tray takes the new release by itself within about 15 s, **only when no agent job or render is running**.
4. Never kill the editor process. Never deploy any other way. Options: `-SkipTests` (urgent fix only), `-Force` (PC A even when the standby PC cannot be reached).
5. The owner runs this .bat himself (Claude's runs were blocked by the permission check).

The editor's own standby script (`tools\server\standby.bat`) describes a line of standby PCs (JASPREET first, PC B second, any helper third) that take over after 30/60/90 s. The workspace itself knows only NAYA A and NAYA B (`editorUrl`, `editorStandbyUrl`).

## Settings
| Key | Default | Meaning |
|---|---|---|
| `editorUrl` | `http://192.168.0.200` | Live editor |
| `editorStandbyUrl` | `http://192.168.0.205:3100` | Standby editor |
| `editNames` | (none) | Email → Edit name, for people whose Edit name is not their email start or first name |
| `Data/edit.key` | file | Shared key; no file = Edit is off inside the workspace |

## Decisions and why
- **"Don't touch the editor"** was the rule until the owner explicitly asked to remove Edit's login. That lifted it for that change only.
- **One login only:** no per-app accounts. No match → no Edit, never a shared or wrong account.
- The separate **Limelight Editor desktop app** is no longer needed; `Lighthouse.exe` handles `limelight://` links. Its package is backed up in `E:\Limelight Ai\Backups\Limelight Editor app` and `archive\editor-app-backup` (the notes say `limelight-workspace\editor-app-backup`; it has moved into `archive\`).
- `Limelight Editor.exe` is **not** copied for other apps: it re-registers the editor shortcut and `limelight://` links on every start.

## Fixes worth knowing
- Deploy failures (30 Oct): run from bash it used a different `scp`; trial cleanup counted an already-ended helper as a failure → fixed in `tools\server\receive-release.ps1`, commit 47e1979.
- The first "Remove Edit login" deploy was blocked by the permission check → the owner ran the deploy himself (twice).

## Known issues / pending
- Staff PCs may still have the old editor app 1.4. Version 1.5 (collect footage before Premiere) is superseded by `Lighthouse.exe`.
- Standby on NAYA B with the key has not been tested; whether B's standby has the new 53-person Edit team list was not confirmed (B did not answer on 30 Oct).
- Free DaVinci Resolve still needs one click inside Resolve (Workspace → Scripts → Limelight Timeline).
- The server notes list the project-tabs fix (`framedByOther` in the editor's `public/index.html`) as uncommitted and not deployed; the workspace notes say release d369a17 went live on 31 Oct. Which of these includes the tabs fix is not confirmed. The workspace's own proxy rewrite (above) covers it either way.
- NAYA A's health after the 29 Oct outage was not re-checked in the notes.
