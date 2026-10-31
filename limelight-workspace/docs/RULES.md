# The owner's standing rules

These hold for every change to the workspace and its apps, by any developer or AI assistant.

## Security and privacy
1. **Never type passwords or credentials.** The owner (or each person) signs in themselves. Limelight AI signs people in with the workspace key (no password box in the account menu since 31 Oct); Studio's AI settings still take the AI password if ever needed, never sent in chat.
2. **Keep salary, bank details, ID numbers and phone numbers out of anything shown** (profiles, decks, notes, docs). Print field names only, never salary values.
3. **Private folders are never printed, copied or sent:** `limelight-office\data\`, `limelight-workspace\Data\`, `config.json` secrets, the Cloudflare credentials, SSH keys, `password.txt`.
4. **Confidential data never goes to cloud AI.** Only non-confidential prompts were used for comparisons with Claude.
5. **Anything public (`*.limelightcorp.net`) must sit behind a password or the workspace login**, because Work and Build modes can run commands on NAYA B.
6. **The AI engine on NAYA B listens on 127.0.0.1 only** (llama.cpp on :8830 since 31 Oct; Ollama before it). No `OLLAMA_HOST=0.0.0.0`, no `--host 0.0.0.0`, no "Ollama LAN" firewall rule.

## One window, one login
7. **One login only (the HR account).** No per-app logins, no "connect accounts", no new accounts made in Edit, Office or AI. Inside the workspace, Edit, Office and AI trust the workspace through shared keys (`x-lh-key`).
8. **Keep it simple:** one window, one login.

## Owners
9. **Owners Jaspreet and Gurpreet:** no clock-in, no attendance, no task or work-time tracking, left out of salary and time boards. Admins and owners have all access.

## Servers
10. **Never install or run Ollama, or any AI model, on NAYA A.** It is the live editor; editing must see zero harm.
11. **AI lives on NAYA B.** Check B's helper and standby state before changing AI things there. If B is acting as the standby editor, the AI stays stopped.
12. **NAYA B stays off render-helper duty** while it is the AI server; JASPREET is the render helper.
13. **NAYA B has no internet:** download on JASPREET and copy over. Install Python wheels with `--no-deps` so CUDA torch is not replaced.
14. **Do not reuse the ports** 3000, 3100, 3200, 3300, 3301, 3330, 3341-3345, 3350, 3443, 3444, 8787, 8800.
15. **Cloudflare tunnel and DNS changes are done by the owner.** Claude prepares scripts and commands; blocked actions are not worked around.
16. **Write files as UTF-8 through Python or .NET**, not with PowerShell `Set-Content` (that broke characters once).

## Edit (the video editor)
17. **Deploy only through `tools\server\Deploy to server.bat`**, run by the owner. Never kill the editor process.
18. **"Don't touch the editor"** unless the owner explicitly asks for an editor change.
19. **Do not copy `Limelight Editor.exe`** for other apps: it re-registers `limelight://` links and shortcuts to itself.

## HR app
20. **Do not change the live HR app code** (`D:\LimelightWebapp`) without the owner's explicit yes: pushes to `main` go live for all staff in about 2 minutes, and other people commit there. Restyle from the workspace side instead.

## Testing
21. **No real attendance punches, real shares or real messages to real staff** while testing. Show the owner anything that goes out (mail, event with guests, upload) and get a yes first.

## Wording and look
22. **All visible wording in English.** Exceptions: the Hindi line of the Gita verse; AI answers in the user's language.
23. **No "Lighthouse" word in the UI.** The brand is Limelight, with the Limelight logo.
24. **Pure Black is the default theme.**
25. **Don't hide the Windows taskbar** (full screen keeps it).
26. **Limelight AI: no more UI options** (look and logo are locked).

## Working with the owner
27. **Replies to the owner are in English** (the owner writes Hinglish).
28. **Video and reel outputs go to `C:\Users\user\Downloads`**, not to `E:\Limelight Ai`.
