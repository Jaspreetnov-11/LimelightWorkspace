# Chats (and the Share button)

## What users can do
- WhatsApp-style office chat: **1-to-1 chats and groups**.
- Groups: the creator is the first admin. A group admin can rename the group, change its description, add or remove members and make others admin. Anyone can leave (if the last admin leaves, the next member becomes admin).
- Send **photos and files** with the 📎 button, drag-and-drop or paste (up to **35 MB** each).
- Reply to a message, **delete for everyone** (own messages only), read ticks (✓ sent, blue ✓✓ read), "typing…", online dot, unread counts, desktop notifications when the tab is hidden.
- **Forward** any message (it is marked "Forwarded"; a forwarded file reuses the stored file).
- **Share cards**: "<item> · Open in Edit / Office / Design" that open the exact item inside the workspace.
- **People list** = HR staff + anyone who has ever signed in to the workspace. Profile photos show on avatars and in the people picker.
- Each person sees only the chats they are a member of.

## How it works
| Part | Detail |
|---|---|
| Store | `chat.mjs` (`createChat`). JSON files in `Data/chat/`: `chats.json` (the list), `msgs/<chat id>.json`, `files/` (uploaded files) |
| Live updates | Server-Sent Events on `/api/chat/stream` (one stream per open tab, ping every 25 s). Events: hello, presence, chat, message, read, deleted, typing |
| Routes | `server/areas/chats.mjs` |
| UI | `public/js/chats.js`, `#v-chats` in `public/index.html` |

| Route | Job |
|---|---|
| `GET /api/chat/stream` | Live events |
| `GET /api/chat/people` | People list (HR staff cached 5 min + workspace users, with online and photo flags) |
| `GET /api/chat/list` | My chats with last message and unread count |
| `POST /api/chat/direct` | Open or create a 1-to-1 chat |
| `POST /api/chat/group` | Create a group |
| `PATCH /api/chat/<id>` | Rename, describe, add/remove members, make admin, leave |
| `GET/POST /api/chat/<id>/messages` | History (200 at a time) / send (text, file as data URL, reply, share card) |
| `DELETE /api/chat/<id>/messages/<msg>` | Delete for everyone |
| `POST /api/chat/<id>/read`, `/typing` | Read ticks, typing signal |
| `GET /chatfiles/<name>` | A stored file (only names inside `Data/chat/files/`) |

## The Share button (all apps)
- A Share button works for whatever is open: an Edit project, an Office document or deck, a Design page, or a chat message.
- You pick people and/or groups (with photos) and add a message. Each gets a **share card** in Chats.
- Sharing an **Edit project** also gives those people access in Edit itself, if the sharer is the project's maker or an owner (`editShare` in `server/areas/edit.mjs`). The result line says who got access.
- How the workspace knows what is open: every app page in a frame reports its path and title (`WHERE_JS`, put in by the proxy).
- Route: `POST /api/share` (`server/areas/share.mjs`). UI: `public/js/share.js`.
- Allowed apps for a card: `editor`, `design`, `office`, `lighthouse` (HR pages), `ai`.

## Decisions and why
- Chats live in the workspace (not in Office), so every app can share into one place.
- The people list mixes HR staff and workspace users so new joiners can be messaged before HR lists them.

## Fixes worth knowing
- Extra whitespace in bubbles (pre-wrap) → text in its own span; avatars stretching; unread badge stretching across the row.
- "Chats disappeared" (30 Oct): nothing was lost. The old chats belonged to the test account that browser had been signed in as.
- Old system lines in Hinglish (for example the "created the group" line) were rewritten to English. The originals are backed up in `archive/originals/chat-msgs/` (the notes say `originals/chat-msgs/`; it has since moved into `archive/`).
- The group-rename system line ("<name> renamed the group to …") and the empty-message error ("Empty message") are in English in `chat.mjs` (checked 31 Oct; the first draft of these docs wrongly listed them as still Hinglish).

## Known issues / pending
- Chat files and photos are on JASPREET only, not on the NAS (moving them was offered, not done).
