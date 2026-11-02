"""Limelight Search relay (runs on JASPREET, which has internet; NAYA B has none).

Limelight AI's web_search and read_webpage tools call this over the office LAN:
  GET /search?q=...&n=6   -> results from the local SearXNG (127.0.0.1:8888) as {"results": [{title, url, snippet}]}
  GET /page?url=...       -> the page's readable text as {"title", "url", "text"}
Only the AI's PCs may call it, and pages on the office network are never fetched.
Run with SearXNG's own Python (it has lxml and curl_cffi): see start-search.ps1.
"""
import ipaddress
import json
import os
import socket
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlencode, urlparse
from urllib.request import urlopen

import lxml.html
from curl_cffi import requests

PORT = int(os.environ.get("LIMELIGHT_SEARCH_PORT", "8890"))
SEARXNG = os.environ.get("LIMELIGHT_SEARXNG", "http://127.0.0.1:8888")
# JASPREET itself (local AI copy and tests) and NAYA B (the live AI server).
ALLOWED = set(os.environ.get("LIMELIGHT_SEARCH_CLIENTS", "127.0.0.1,192.168.0.210,192.168.0.205").split(","))
MAX_TEXT = 20000
MAX_BYTES = 4_000_000
DROP = "//script|//style|//noscript|//nav|//header|//footer|//aside|//form|//svg|//iframe"


def search(q, n):
    with urlopen(f"{SEARXNG}/search?" + urlencode({"q": q, "format": "json"}), timeout=20) as r:
        data = json.load(r)
    seen, out = set(), []
    for x in data.get("results", []):
        if x.get("url") in seen:
            continue
        seen.add(x.get("url"))
        out.append({"title": x.get("title", ""), "url": x.get("url", ""),
                    "snippet": (x.get("content") or "")[:400], "date": x.get("publishedDate") or ""})
        if len(out) >= n:
            break
    return {"query": q, "results": out}


def _public(host):
    """True when every address of host is on the public internet (no office PCs, NAS or router)."""
    try:
        addrs = {a[4][0] for a in socket.getaddrinfo(host, None)}
    except socket.gaierror:
        return False
    return all(ipaddress.ip_address(a.split("%")[0]).is_global for a in addrs)


def page(url):
    u = urlparse(url)
    if u.scheme not in ("http", "https") or not u.hostname:
        raise ValueError("only http and https links can be read")
    if not _public(u.hostname):
        raise ValueError("pages on the office network or unknown hosts are not read")
    r = requests.get(url, impersonate="chrome", timeout=20, allow_redirects=True)
    if not _public(urlparse(r.url).hostname or ""):
        raise ValueError("the link redirected into the office network")
    ctype = r.headers.get("content-type", "")
    if "html" not in ctype and "text" not in ctype:
        raise ValueError(f"not a web page ({ctype or 'unknown type'})")
    body = r.content[:MAX_BYTES]
    doc = lxml.html.fromstring(body)
    title = (doc.findtext(".//title") or "").strip()
    for el in doc.xpath(DROP):
        el.drop_tree()
    main = (doc.xpath("//article") or doc.xpath("//main") or doc.xpath("//body") or [doc])[0]
    lines = [" ".join(t.split()) for t in main.itertext()]
    text = "\n".join(t for t in lines if len(t) > 1)
    return {"title": title, "url": r.url, "text": text[:MAX_TEXT], "truncated": len(text) > MAX_TEXT}


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.client_address[0] not in ALLOWED:
            return self._send(403, {"error": "not allowed"})
        u = urlparse(self.path)
        q = {k: v[0] for k, v in parse_qs(u.query).items()}
        try:
            if u.path == "/healthz":
                return self._send(200, {"ok": True})
            if u.path == "/search" and q.get("q"):
                return self._send(200, search(q["q"], max(1, min(int(q.get("n", 6)), 10))))
            if u.path == "/page" and q.get("url"):
                return self._send(200, page(q["url"]))
            return self._send(404, {"error": "use /search?q= or /page?url="})
        except Exception as e:  # the AI shows this to the model, which can try another link
            return self._send(502, {"error": f"{type(e).__name__}: {e}"})

    def _send(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        sys.stderr.write("%s %s\n" % (self.client_address[0], fmt % args))


if __name__ == "__main__":
    print(f"Limelight Search relay on :{PORT} (SearXNG {SEARXNG})", flush=True)
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
