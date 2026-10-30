# Limelight Workspace

Limelight's own all-in-one workspace (https://limelightcorp.net): one login for Home, Chats, Create, Library,
Profile, Edit, Design, Office and Limelight AI.

| Folder | App | Runs on |
|---|---|---|
| `limelight-workspace/` | **Lighthouse** - the workspace itself: login, Home, Chats, Create, Library, Profile, and the frame every other app opens in | JASPREET, port 3350 (apps 3341-3345) |
| `limelight-office/` | **Office** - Mail, Calendar, Meetings, Files, Document / Grid / Deck | JASPREET, port 3300 |
| `limelight-studio/` | **Design** - Photoshop / Vector / Book / 3D / Color studio, generative fill | JASPREET, port 3330 |
| `limelight-ai/` | **Limelight AI** - the team's own AI chat and picture tools | NAYA B, port 8800 |

**Edit** (the video editor) lives in its own repo, EditorAgent (D:\Video Editor Agent).

Start here: [limelight-workspace/docs/README.md](limelight-workspace/docs/README.md) - every area, how it works,
the changelog, how to rebuild it all on a new PC (REBUILD.md), what is pending and the rules.

Private data, passwords and keys are never in this repo: each app's `.gitignore` keeps them out, and
`limelight-workspace/config.example.json` lists the settings without secrets.
