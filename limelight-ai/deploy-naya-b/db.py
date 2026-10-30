"""Local SQLite storage for conversations. The file lives in data/limelight.db."""
import json
import sqlite3
import time
import uuid

from config import DB_PATH


def _conn():
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    return c


def init():
    with _conn() as c:
        c.execute(
            """CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY, title TEXT, mode TEXT, model TEXT,
                workspace TEXT, messages TEXT, todos TEXT,
                created REAL, updated REAL)"""
        )
        # whose chat it is (the workspace login, by email); "" for the old ones and for the app's own login
        if "owner" not in [r[1] for r in c.execute("PRAGMA table_info(conversations)")]:
            c.execute("ALTER TABLE conversations ADD COLUMN owner TEXT DEFAULT ''")


def create(mode, model, workspace, title="New chat", owner=""):
    cid = uuid.uuid4().hex[:12]
    now = time.time()
    with _conn() as c:
        c.execute(
            "INSERT INTO conversations (id,title,mode,model,workspace,messages,todos,created,updated,owner) VALUES (?,?,?,?,?,?,?,?,?,?)",
            (cid, title, mode, model, workspace, "[]", "[]", now, now, owner or ""),
        )
    return get(cid)


def get(cid):
    with _conn() as c:
        r = c.execute("SELECT * FROM conversations WHERE id=?", (cid,)).fetchone()
    if not r:
        return None
    d = dict(r)
    d["messages"] = json.loads(d["messages"] or "[]")
    d["todos"] = json.loads(d["todos"] or "[]")
    return d


def list_all(mode=None, owner=None, legacy=False):
    """owner: only that person's chats (and, legacy=True, the old ones without an owner too); None: every chat"""
    q = "SELECT id,title,mode,model,workspace,updated FROM conversations"
    where, args = [], []
    if mode:
        where.append("mode=?"); args.append(mode)
    if owner is not None:
        where.append("(owner=? OR (? AND COALESCE(owner,'')=''))"); args += [owner, 1 if legacy else 0]
    if where:
        q += " WHERE " + " AND ".join(where)
    with _conn() as c:
        return [dict(r) for r in c.execute(q + " ORDER BY updated DESC", args)]


def save(cid, **fields):
    if "messages" in fields:
        fields["messages"] = json.dumps(fields["messages"], ensure_ascii=False)
    if "todos" in fields:
        fields["todos"] = json.dumps(fields["todos"], ensure_ascii=False)
    fields["updated"] = time.time()
    cols = ",".join(f"{k}=?" for k in fields)
    with _conn() as c:
        c.execute(f"UPDATE conversations SET {cols} WHERE id=?", (*fields.values(), cid))


def delete(cid):
    with _conn() as c:
        c.execute("DELETE FROM conversations WHERE id=?", (cid,))
