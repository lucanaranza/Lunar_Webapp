"""Moon Landing Site Navigator — server (Flask).

Cosa fa il server:
  * login istituzionale verificato QUI (il browser non contiene più le credenziali)
  * sessioni con cookie HttpOnly / SameSite=Strict, scadenza per inattività e assoluta
  * blocco dei tentativi ripetuti (per IP e per account, con attesa crescente)
  * consegna dei dati delle aree (data/areas/*.json) solo agli utenti autenticati,
    con limitazione facoltativa per istituzione
  * intestazioni di sicurezza (CSP, frame-ancestors, HSTS su HTTPS, nosniff, ...)
  * registro accessi (logs/audit.jsonl) senza password

Cosa NON fa (di proposito):
  * non riceve né conosce la chiave dell'archivio privato dell'utente: il browser
    ricava dalla passphrase due chiavi diverse; al server arriva solo la "chiave di
    accesso" (PBKDF2 con sale distinto), che non permette di decifrare il vault.

Avvio rapido (sviluppo):    python app.py
Produzione:                 vedi README.md (HTTPS obbligatorio, dietro reverse proxy)
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import re
import secrets
import threading
import time
from collections import defaultdict
from pathlib import Path

from flask import Flask, abort, jsonify, make_response, request, send_file

BASE = Path(__file__).resolve().parent

# --------------------------------------------------------------------------- config
CONFIG = {
    "STATIC_DIR": Path(os.environ.get("MLSN_STATIC_DIR", BASE / "static")),
    "AREAS_DIR": Path(os.environ.get("MLSN_AREAS_DIR", BASE / "data" / "areas")),
    "USERS_FILE": Path(os.environ.get("MLSN_USERS_FILE", BASE / "data" / "users.json")),
    "AUDIT_FILE": Path(os.environ.get("MLSN_AUDIT_FILE", BASE / "logs" / "audit.jsonl")),
    "SECURE_COOKIES": os.environ.get("MLSN_SECURE_COOKIES", "1") != "0",
    "SESSION_IDLE_S": int(os.environ.get("MLSN_SESSION_IDLE_S", 30 * 60)),
    "SESSION_MAX_S": int(os.environ.get("MLSN_SESSION_MAX_S", 8 * 3600)),
    "MAX_FAILS": int(os.environ.get("MLSN_MAX_FAILS", 5)),
    "LOCKOUT_BASE_S": int(os.environ.get("MLSN_LOCKOUT_BASE_S", 30)),
    "LOCKOUT_MAX_S": int(os.environ.get("MLSN_LOCKOUT_MAX_S", 3600)),
}
COOKIE = "mlsn_session"
SCRYPT = dict(n=2 ** 14, r=8, p=1, dklen=32)

app = Flask(__name__, static_folder=None)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024       # le richieste API sono piccole


def norm(s: str) -> str:
    """Stessa normalizzazione del browser: trim, minuscole, spazi singoli."""
    return " ".join(str(s).split()).lower()


def user_id(name: str, institution: str) -> str:
    return f"{norm(institution)}/{norm(name)}"


# --------------------------------------------------------------------------- hashing
def hash_auth_key(auth_key_hex: str, salt: bytes | None = None) -> dict:
    salt = salt or secrets.token_bytes(16)
    h = hashlib.scrypt(bytes.fromhex(auth_key_hex), salt=salt, **SCRYPT)
    return {"salt": salt.hex(), "hash": h.hex(), "kdf": "scrypt", **{k: SCRYPT[k] for k in ("n", "r", "p")}}


def verify_auth_key(auth_key_hex: str, rec: dict) -> bool:
    h = hashlib.scrypt(bytes.fromhex(auth_key_hex), salt=bytes.fromhex(rec["salt"]),
                       n=rec["n"], r=rec["r"], p=rec["p"], dklen=32)
    return hmac.compare_digest(h.hex(), rec["hash"])


_DUMMY = hash_auth_key("00" * 32)                  # per tempi di risposta uguali con utenti inesistenti


# --------------------------------------------------------------------------- utenti
_users_lock = threading.Lock()
_users_cache: dict = {"mtime": None, "data": {}}


def load_users() -> dict:
    f = CONFIG["USERS_FILE"]
    with _users_lock:
        try:
            mtime = f.stat().st_mtime
        except FileNotFoundError:
            return {}
        if _users_cache["mtime"] != mtime:
            _users_cache["data"] = json.loads(f.read_text("utf-8")).get("users", {})
            _users_cache["mtime"] = mtime
        return _users_cache["data"]


# --------------------------------------------------------------------------- audit
_audit_lock = threading.Lock()


def audit(event: str, **fields) -> None:
    f = CONFIG["AUDIT_FILE"]
    f.parent.mkdir(parents=True, exist_ok=True)
    rec = {"ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "event": event,
           "ip": client_ip(), **fields}
    with _audit_lock, f.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(rec, ensure_ascii=False) + "\n")


def client_ip() -> str:
    # Dietro un reverse proxy fidato usare ProxyFix (vedi README) invece di leggere X-Forwarded-For a mano.
    return request.remote_addr or "?"


# --------------------------------------------------------------------------- rate limit
class Throttle:
    """Tentativi falliti per chiave (IP o account): dopo MAX_FAILS blocco con attesa che raddoppia."""

    def __init__(self):
        self.lock = threading.Lock()
        self.state = defaultdict(lambda: {"fails": 0, "lockouts": 0, "until": 0.0})

    def remaining(self, key: str) -> int:
        with self.lock:
            return max(0, int(self.state[key]["until"] - time.time() + 0.999))

    def fail(self, key: str) -> None:
        with self.lock:
            s = self.state[key]
            s["fails"] += 1
            if s["fails"] % CONFIG["MAX_FAILS"] == 0:
                wait = min(CONFIG["LOCKOUT_MAX_S"], CONFIG["LOCKOUT_BASE_S"] * 2 ** s["lockouts"])
                s["until"] = time.time() + wait
                s["lockouts"] += 1

    def success(self, key: str) -> int:
        with self.lock:
            n = self.state[key]["fails"]
            self.state.pop(key, None)
            return n


throttle = Throttle()


# --------------------------------------------------------------------------- sessioni
_sessions: dict[str, dict] = {}
_sess_lock = threading.Lock()


def new_session(uid: str, user: dict) -> str:
    token = secrets.token_urlsafe(32)
    now = time.time()
    with _sess_lock:
        _sessions[hashlib.sha256(token.encode()).hexdigest()] = {
            "uid": uid, "name": user["name"], "institution": user["institution"], "created": now, "last": now}
    return token


def current_session() -> dict | None:
    token = request.cookies.get(COOKIE)
    if not token:
        return None
    key = hashlib.sha256(token.encode()).hexdigest()
    now = time.time()
    with _sess_lock:
        s = _sessions.get(key)
        if not s:
            return None
        if now - s["last"] > CONFIG["SESSION_IDLE_S"] or now - s["created"] > CONFIG["SESSION_MAX_S"]:
            _sessions.pop(key, None)
            return None
        users = load_users()
        u = users.get(s["uid"])
        if not u or u.get("disabled"):                     # utente rimosso/disattivato: sessione chiusa
            _sessions.pop(key, None)
            return None
        s["last"] = now
        return s


def drop_session() -> None:
    token = request.cookies.get(COOKIE)
    if token:
        with _sess_lock:
            _sessions.pop(hashlib.sha256(token.encode()).hexdigest(), None)


def require_session() -> dict:
    s = current_session()
    if not s:
        abort(make_response(jsonify(error="auth_required"), 401))
    return s


# --------------------------------------------------------------------------- CSRF
@app.before_request
def csrf_guard():
    if request.method in ("POST", "PUT", "PATCH", "DELETE"):
        # header personalizzato: un altro sito non può inviarlo senza preflight CORS (che non abilitiamo)
        if request.headers.get("X-MLSN") != "1":
            abort(make_response(jsonify(error="bad_request"), 400))
        origin = request.headers.get("Origin")
        if origin and origin.rstrip("/") != request.host_url.rstrip("/"):
            abort(make_response(jsonify(error="bad_origin"), 403))


# --------------------------------------------------------------------------- intestazioni di sicurezza
CSP = ("default-src 'self'; script-src 'self' 'unsafe-inline'; "
       "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; "
       "img-src 'self' data: blob:; connect-src 'self'; form-action 'none'; base-uri 'none'; "
       "object-src 'none'; frame-ancestors 'none'")


@app.after_request
def security_headers(resp):
    resp.headers["Content-Security-Policy"] = CSP
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["Referrer-Policy"] = "no-referrer"
    resp.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    resp.headers["Cross-Origin-Opener-Policy"] = "same-origin"
    if request.is_secure:
        resp.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    if request.path.startswith("/api/") or request.path == "/":
        resp.headers["Cache-Control"] = "no-store"
    return resp


# --------------------------------------------------------------------------- pagine statiche
@app.get("/")
def index():
    f = CONFIG["STATIC_DIR"] / "index.html"
    if not f.is_file():
        abort(404)
    return send_file(f, mimetype="text/html")


# Nessun'altra rotta statica: users.json, log e dati non sono raggiungibili come file.


# --------------------------------------------------------------------------- API
HEX64 = re.compile(r"^[0-9a-f]{64}$")


@app.get("/api/health")
def health():
    return jsonify(ok=True, app="mlsn", version=1)


@app.post("/api/login")
def login():
    body = request.get_json(silent=True) or {}
    name, inst, auth = body.get("name", ""), body.get("institution", ""), str(body.get("auth", "")).lower()
    if not (isinstance(name, str) and isinstance(inst, str) and 0 < len(name) <= 80 and 0 < len(inst) <= 120
            and HEX64.match(auth)):
        return jsonify(error="bad_request"), 400

    uid = user_id(name, inst)
    ip_key, acc_key = "ip:" + client_ip(), "acc:" + uid
    wait = max(throttle.remaining(ip_key), throttle.remaining(acc_key))
    if wait:
        audit("login_blocked", uid=uid, wait=wait)
        resp = jsonify(error="locked", retryAfter=wait)
        resp.headers["Retry-After"] = str(wait)
        return resp, 429

    user = load_users().get(uid)
    ok = verify_auth_key(auth, user["auth"]) if user and not user.get("disabled") else (verify_auth_key(auth, _DUMMY) and False)
    if not ok:
        throttle.fail(ip_key)
        throttle.fail(acc_key)
        audit("login_failed", uid=uid)
        return jsonify(error="invalid"), 401        # messaggio generico: non dice quale campo è sbagliato

    prev = throttle.success(acc_key)
    throttle.success(ip_key)
    token = new_session(uid, user)
    audit("login", uid=uid, previousFailures=prev)
    resp = jsonify(user={"name": user["name"], "institution": user["institution"]}, previousFailures=prev,
                   sessionIdleSeconds=CONFIG["SESSION_IDLE_S"])
    resp.set_cookie(COOKIE, token, httponly=True, secure=CONFIG["SECURE_COOKIES"], samesite="Strict",
                    max_age=CONFIG["SESSION_MAX_S"], path="/")
    return resp


@app.post("/api/logout")
def logout():
    s = current_session()
    if s:
        audit("logout", uid=s["uid"])
    drop_session()
    resp = jsonify(ok=True)
    resp.delete_cookie(COOKIE, path="/")
    return resp


@app.get("/api/session")
def session_info():
    s = require_session()
    return jsonify(user={"name": s["name"], "institution": s["institution"]})


# --------------------------------------------------------------------------- aree
AREA_ID = re.compile(r"^[A-Za-z0-9_-]{1,64}$")
_area_cache: dict[str, tuple[float, dict]] = {}
_area_lock = threading.Lock()


def read_area(path: Path) -> dict:
    mtime = path.stat().st_mtime
    with _area_lock:
        hit = _area_cache.get(str(path))
        if hit and hit[0] == mtime:
            return hit[1]
    data = json.loads(path.read_text("utf-8"))
    with _area_lock:
        _area_cache[str(path)] = (mtime, data)
    return data


def area_region(a: dict) -> dict:
    """Centro e raggio dell'area. Formato interno: campo "region". Formato "mappa-sito-lunare":
    ricavati dalla griglia (cella centrale e cerchio inscritto)."""
    if "region" in a:
        r = a["region"]
        return {"lat": r["lat"], "lon": r["lon"], "radiusDeg": r.get("radiusDeg", r.get("r"))}
    if a.get("formato") == "mappa-sito-lunare":
        g, L = a["griglia"], a["layers"]
        ny, nx = g["forma"]
        lat, lon = L["lat"][ny // 2][nx // 2], L["lon"][ny // 2][nx // 2]
        half_km = min(nx, ny) * float(g["passo_m"]) / 2 / 1000 * .98
        return {"lat": lat, "lon": lon, "radiusDeg": half_km / (1737.4 * 3.141592653589793 / 180)}
    raise ValueError("formato area sconosciuto")


def allowed(area: dict, s: dict) -> bool:
    inst = area.get("institutions")
    return not inst or norm(s["institution"]) in {norm(i) for i in inst}


def area_files():
    d = CONFIG["AREAS_DIR"]
    return sorted(p for p in d.glob("*.json") if AREA_ID.match(p.stem)) if d.is_dir() else []


@app.get("/api/areas")
def list_areas():
    s = require_session()
    out = []
    for p in area_files():
        try:
            a = read_area(p)
            if not allowed(a, s):
                continue
            out.append({"id": p.stem, "name": a.get("name") or a.get("nome") or p.stem, "region": area_region(a),
                        "size": a.get("size") or (a.get("griglia") or {}).get("forma"),
                        "exportable": bool(a.get("exportable", False))})
        except Exception:
            continue                                      # file malformato: ignorato (vedi log del server)
    return jsonify(areas=out)


@app.get("/api/areas/<area_id>")
def get_area(area_id: str):
    s = require_session()
    if not AREA_ID.match(area_id):
        abort(404)
    p = CONFIG["AREAS_DIR"] / f"{area_id}.json"
    if not p.is_file():
        abort(404)
    a = read_area(p)
    if not allowed(a, s):
        abort(404)                                        # non rivela l'esistenza dell'area
    audit("area_download", uid=s["uid"], area=area_id)
    body = {k: v for k, v in a.items() if k != "institutions"}
    body["id"] = area_id
    return jsonify(body)


@app.errorhandler(404)
def not_found(_):
    return jsonify(error="not_found"), 404


@app.errorhandler(413)
def too_large(_):
    return jsonify(error="too_large"), 413


if __name__ == "__main__":
    # Solo per sviluppo. In locale: http://127.0.0.1:8000 (Chrome/Firefox accettano i cookie Secure su localhost).
    # Per provare HTTPS in locale: MLSN_TLS=adhoc python app.py  (certificato autofirmato, richiede 'cryptography')
    ssl = "adhoc" if os.environ.get("MLSN_TLS") == "adhoc" else None
    app.run(host=os.environ.get("MLSN_HOST", "127.0.0.1"), port=int(os.environ.get("MLSN_PORT", 8000)),
            ssl_context=ssl, debug=False)
