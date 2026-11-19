"""Tests for the optional local server and the site index (pytest)."""
import gzip
import json
import threading
import urllib.request
from functools import partial
from http.server import ThreadingHTTPServer

import app


def test_site_index_lists_every_map():
    names = [s["nome"] for s in app.site_index()]
    assert names, "no mappa_*.json in data/sites"
    for s in app.site_index():
        assert (app.BASE / s["mappa"]).is_file()
        if s["evoluzione"]:
            assert (app.BASE / s["evoluzione"]).is_file()


def test_static_index_matches_files():
    on_disk = json.loads((app.DATA / "sites" / "index.json").read_text("utf-8"))["siti"]
    assert on_disk == app.site_index(), "run: python app.py index"


def _serve():
    httpd = ThreadingHTTPServer(("127.0.0.1", 0), partial(app.Handler, directory=str(app.BASE)))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, f"http://127.0.0.1:{httpd.server_address[1]}"


def test_pages_are_served():
    httpd, url = _serve()
    try:
        for page in ["index.html", "history.html", "reasoning.html", "mission.html", "deep-dive.html", "workspace.html", "analysis.html"]:
            with urllib.request.urlopen(f"{url}/{page}") as r:
                assert r.status == 200 and b"<!DOCTYPE html>" in r.read(200)
    finally:
        httpd.shutdown()


def test_data_is_gzipped():
    httpd, url = _serve()
    try:
        rq = urllib.request.Request(f"{url}/data/sites/index.json", headers={"Accept-Encoding": "gzip"})
        with urllib.request.urlopen(rq) as r:
            assert r.headers["Content-Encoding"] == "gzip"
            assert json.loads(gzip.decompress(r.read()))["siti"]
    finally:
        httpd.shutdown()
