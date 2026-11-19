"""L.A.N.D. – local server (optional).

The site is fully static and open source: no sign-in, no accounts, no server-side data.
GitHub Pages (or any static host) serves it as it is. This script is only a convenience:

    python app.py            serve the folder at http://127.0.0.1:8000  (data files gzip-compressed)
    python app.py index      rewrite data/sites/index.json after adding or removing site files

Pages:   index.html (intro + home) · history / reasoning / mission / deep-dive.html (Educational)
         workspace.html (Area Selection) · analysis.html?site=<name> (heat map)
Data:    data/sites/mappa_<Site>.json, data/sites/evoluzione_<Site>.json, data/tabella_sole_terra.json
"""
from __future__ import annotations

import gzip
import json
import os
import re
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

BASE = Path(__file__).resolve().parent
DATA = BASE / "data"
SITE_FILE = re.compile(r"^(mappa|evoluzione)_[A-Za-z0-9_-]{1,60}\.json$")


def site_index() -> list[dict]:
    """Available sites: every mappa_<Site>.json in data/sites, with its evoluzione_<Site>.json if present."""
    d = DATA / "sites"
    out = []
    for p in sorted(d.glob("mappa_*.json")) if d.is_dir() else []:
        if not SITE_FILE.match(p.name):
            continue
        name = p.name[len("mappa_"):-len(".json")]
        ev = d / f"evoluzione_{name}.json"
        out.append({"nome": name, "mappa": f"data/sites/{p.name}",
                    "evoluzione": f"data/sites/{ev.name}" if ev.is_file() else None})
    return out


def write_site_index() -> Path:
    """data/sites/index.json: the list of sites read by the pages."""
    f = DATA / "sites" / "index.json"
    f.write_text(json.dumps({"siti": site_index()}, indent=1, ensure_ascii=False) + "\n", "utf-8")
    return f


class Handler(SimpleHTTPRequestHandler):
    """Static files; JSON data gzip-compressed when the browser accepts it (the site files are several MB)."""
    _gz: dict[str, tuple[float, bytes]] = {}

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_GET(self):
        path = self.translate_path(self.path.split("?", 1)[0])
        if path.endswith(".json") and os.path.isfile(path) and "gzip" in self.headers.get("Accept-Encoding", ""):
            mt = os.path.getmtime(path)
            hit = self._gz.get(path)
            if not hit or hit[0] != mt:
                hit = (mt, gzip.compress(Path(path).read_bytes(), 6))
                self._gz[path] = hit
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Encoding", "gzip")
            self.send_header("Content-Length", str(len(hit[1])))
            self.end_headers()
            self.wfile.write(hit[1])
            return
        super().do_GET()


def serve(host: str = "127.0.0.1", port: int = 8000) -> None:
    httpd = ThreadingHTTPServer((host, port), partial(Handler, directory=str(BASE)))
    print(f"L.A.N.D. on http://{host}:{port}  (Ctrl+C to stop)")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    if sys.argv[1:] == ["index"]:
        print(f"Updated {write_site_index()} ({len(site_index())} sites)")
        sys.exit(0)
    serve(os.environ.get("LAND_HOST", "127.0.0.1"), int(os.environ.get("LAND_PORT", 8000)))
