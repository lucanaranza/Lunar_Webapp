"""Test del server:  python -m pytest -q"""
import json
from pathlib import Path

import pytest

import app as srv
import manage_users as mu

H = {"X-MLSN": "1"}


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setitem(srv.CONFIG, "USERS_FILE", tmp_path / "users.json")
    monkeypatch.setitem(srv.CONFIG, "AREAS_DIR", tmp_path / "areas")
    monkeypatch.setitem(srv.CONFIG, "AUDIT_FILE", tmp_path / "audit.jsonl")
    monkeypatch.setitem(srv.CONFIG, "STATIC_DIR", tmp_path / "static")
    monkeypatch.setitem(srv.CONFIG, "DATA_DIR", tmp_path / "data")
    monkeypatch.setitem(srv.CONFIG, "SECURE_COOKIES", False)
    monkeypatch.setitem(srv.CONFIG, "LOCKOUT_BASE_S", 30)
    srv.throttle.state.clear()
    srv._sessions.clear()
    srv._users_cache.update(mtime=None, data={})
    (tmp_path / "static").mkdir()
    (tmp_path / "static" / "index.html").write_text("<!DOCTYPE html><title>t</title>")
    areas = tmp_path / "areas"
    areas.mkdir()
    layer = [0.5] * 4
    base = {"format": "mlsn-area-data", "version": 1, "region": {"lat": -90, "lon": 0, "radiusDeg": 10}, "size": 2,
            "layers": {"sunFraction": layer, "earthFraction": layer, "iceDistanceKm": layer, "earthHorizonDeg": layer}}
    (areas / "polo_sud.json").write_text(json.dumps({**base, "name": "Polo Sud"}))
    (areas / "solo_esa.json").write_text(json.dumps({**base, "name": "Riservata", "institutions": ["ESA"]}))
    sites = tmp_path / "data" / "sites"
    sites.mkdir(parents=True)
    (sites / "mappa_Sito_01.json").write_text(json.dumps({"formato": "mappa-sito-lunare", "nome": "Sito_01"}))
    (sites / "evoluzione_Sito_01.json").write_text(json.dumps({"formato": "evoluzione-sito-lunare", "nome": "Sito_01"}))
    (sites / "mappa_Sito_02.json").write_text(json.dumps({"formato": "mappa-sito-lunare", "nome": "Sito_02"}))
    (tmp_path / "data" / "tabella_sole_terra.json").write_text(json.dumps({"formato": "tabella-sole-terra", "n": 2}))
    (tmp_path / "data" / "users.json.bak").write_text("segreto")
    mu.add_user("Edoardo", "Patos", "luna-artemis-2026")
    return srv.app.test_client()


def login(c, name="Edoardo", inst="Patos", pw="luna-artemis-2026", headers=H):
    return c.post("/api/login", json={"name": name, "institution": inst, "auth": mu.auth_key(pw, name, inst)}, headers=headers)


def test_login_ok_and_session(client):
    r = login(client)
    assert r.status_code == 200 and r.json["user"] == {"name": "Edoardo", "institution": "Patos"}
    cookie = r.headers["Set-Cookie"]
    assert "HttpOnly" in cookie and "SameSite=Strict" in cookie
    assert client.get("/api/session").status_code == 200


def test_login_case_insensitive_names(client):
    assert login(client, name="  edoardo ", inst="PATOS").status_code == 200


def test_wrong_password_generic_error(client):
    r = login(client, pw="password-sbagliata")
    assert r.status_code == 401 and r.json == {"error": "invalid"}
    r2 = login(client, name="Nessuno")
    assert r2.status_code == 401 and r2.json == {"error": "invalid"}   # stessa risposta per utente inesistente


def test_lockout_after_5_failures(client):
    for _ in range(5):
        assert login(client, pw="sbagliata-xxxx").status_code == 401
    r = login(client)                                                  # anche quella giusta ora è bloccata
    assert r.status_code == 429 and r.json["retryAfter"] > 0 and "Retry-After" in r.headers


def test_csrf_header_required(client):
    assert login(client, headers={}).status_code == 400
    r = client.post("/api/login", json={}, headers={**H, "Origin": "https://evil.example"})
    assert r.status_code == 403


def test_areas_require_login(client):
    assert client.get("/api/areas").status_code == 401
    assert client.get("/api/areas/polo_sud").status_code == 401


def test_areas_filtered_by_institution(client):
    login(client)
    names = [a["name"] for a in client.get("/api/areas").json["areas"]]
    assert names == ["Polo Sud"]
    assert client.get("/api/areas/solo_esa").status_code == 404
    d = client.get("/api/areas/polo_sud").json
    assert d["name"] == "Polo Sud" and "institutions" not in d


def test_logout_ends_session(client):
    login(client)
    client.post("/api/logout", headers=H)
    assert client.get("/api/session").status_code == 401


def test_disabled_user_kicked_out(client):
    login(client)
    data = mu.load()
    data["users"]["patos/edoardo"]["disabled"] = True
    mu.save(data)
    assert client.get("/api/session").status_code == 401
    assert login(client).status_code == 401


def test_no_secret_files_served(client):
    for path in ["/users.json", "/data/users.json", "/app.py", "/logs/audit.jsonl", "/api/areas/../users"]:
        assert client.get(path).status_code == 404


def test_security_headers(client):
    r = client.get("/")
    assert r.status_code == 200
    assert "frame-ancestors 'none'" in r.headers["Content-Security-Policy"]
    assert r.headers["X-Frame-Options"] == "DENY" and r.headers["X-Content-Type-Options"] == "nosniff"


def test_users_file_has_no_passphrase(client):
    raw = srv.CONFIG["USERS_FILE"].read_text()
    assert "luna-artemis-2026" not in raw and "scrypt" in raw


def test_audit_log_written_without_secrets(client):
    login(client, pw="sbagliata-xxxx")
    login(client)
    log = srv.CONFIG["AUDIT_FILE"].read_text()
    assert '"login_failed"' in log and '"login"' in log and "luna-artemis" not in log


def test_site_map_format_listed(client):
    import shutil
    real = Path(srv.__file__).resolve().parent / "data" / "sites" / "mappa_Sito_01.json"   # file vero della pipeline
    shutil.copy(real, srv.CONFIG["AREAS_DIR"] / "sito_01.json")
    login(client)
    a = next(x for x in client.get("/api/areas").json["areas"] if x["id"] == "sito_01")
    assert a["name"] == "Sito_01" and abs(a["region"]["lat"] + 89.46) < .05 and 0.2 < a["region"]["radiusDeg"] < 0.3
    assert client.get("/api/areas/sito_01").json["formato"] == "mappa-sito-lunare"


# ---------- dati pubblici dell'analisi (data/) ----------
def test_sites_listed_without_login(client):
    r = client.get("/api/sites")
    assert r.status_code == 200
    assert r.json["siti"] == [
        {"nome": "Sito_01", "mappa": "data/sites/mappa_Sito_01.json", "evoluzione": "data/sites/evoluzione_Sito_01.json"},
        {"nome": "Sito_02", "mappa": "data/sites/mappa_Sito_02.json", "evoluzione": None},
    ]


def test_data_files_served_compressed_with_etag(client):
    r = client.get("/data/sites/mappa_Sito_01.json", headers={"Accept-Encoding": "gzip"})
    assert r.status_code == 200 and r.headers["Content-Encoding"] == "gzip" and r.mimetype == "application/json"
    import gzip
    assert json.loads(gzip.decompress(r.data))["nome"] == "Sito_01"
    r2 = client.get("/data/sites/mappa_Sito_01.json", headers={"If-None-Match": r.headers["ETag"]})
    assert r2.status_code == 304
    assert client.get("/data/tabella_sole_terra.json").json["formato"] == "tabella-sole-terra"


def test_only_whitelisted_data_reachable(client):
    for url in ["/data/users.json", "/data/users.json.bak", "/data/sites/../users.json", "/data/areas/polo_sud.json",
                "/data/sites/altro.json", "/data/sites/mappa_x.txt", "/logs/audit.jsonl", "/app.py"]:
        assert client.get(url).status_code == 404, url


def test_static_site_index_matches_api(client):
    f = srv.write_site_index()
    assert json.loads(f.read_text("utf-8"))["siti"] == client.get("/api/sites").json["siti"]
