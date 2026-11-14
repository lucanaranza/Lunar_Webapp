"""Gestione utenti del server (riga di comando).

  python manage_users.py add                 # chiede nome, istituzione e passphrase
  python manage_users.py list
  python manage_users.py disable "Edoardo" "Patos"
  python manage_users.py enable  "Edoardo" "Patos"
  python manage_users.py remove  "Edoardo" "Patos"

La passphrase non viene salvata. Si salva solo scrypt( PBKDF2(passphrase, sale di accesso) ):
la stessa "chiave di accesso" che il browser calcola e invia al login. La chiave del vault
privato dell'utente è derivata con un sale diverso e il server non la vede mai.
"""
from __future__ import annotations

import getpass
import hashlib
import json
import sys
import time
from pathlib import Path

from app import CONFIG, hash_auth_key, norm, user_id

AUTH_ITERATIONS = 200_000        # deve coincidere con AUTH_ITERATIONS in index.html
MIN_PASSPHRASE = 10


def auth_key(passphrase: str, name: str, institution: str) -> str:
    """Identica a deriveAuthKey() nel browser."""
    salt = f"mlsn-auth|{norm(institution)}|{norm(name)}".encode("utf-8")
    return hashlib.pbkdf2_hmac("sha256", passphrase.encode("utf-8"), salt, AUTH_ITERATIONS, dklen=32).hex()


def load() -> dict:
    f: Path = CONFIG["USERS_FILE"]
    return json.loads(f.read_text("utf-8")) if f.exists() else {"version": 1, "users": {}}


def save(data: dict) -> None:
    f: Path = CONFIG["USERS_FILE"]
    f.parent.mkdir(parents=True, exist_ok=True)
    tmp = f.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False), "utf-8")
    tmp.replace(f)
    try:
        f.chmod(0o600)            # leggibile solo dall'utente che esegue il server
    except OSError:
        pass


def add_user(name: str, institution: str, passphrase: str) -> None:
    if len(passphrase) < MIN_PASSPHRASE:
        raise ValueError(f"La passphrase deve avere almeno {MIN_PASSPHRASE} caratteri")
    data = load()
    uid = user_id(name, institution)
    data["users"][uid] = {"name": " ".join(name.split()), "institution": " ".join(institution.split()),
                          "auth": hash_auth_key(auth_key(passphrase, name, institution)),
                          "created": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "disabled": False}
    save(data)


def main(argv: list[str]) -> int:
    if not argv or argv[0] not in {"add", "list", "remove", "disable", "enable"}:
        print(__doc__)
        return 1
    cmd = argv[0]
    if cmd == "add":
        name = input("Nome: ").strip()
        inst = input("Istituzione: ").strip()
        p1 = getpass.getpass("Passphrase (min 10 caratteri): ")
        if p1 != getpass.getpass("Ripeti passphrase: "):
            print("Le passphrase non coincidono.")
            return 1
        try:
            add_user(name, inst, p1)
        except ValueError as e:
            print(e)
            return 1
        print(f"Utente aggiunto: {name} · {inst}")
        return 0
    data = load()
    if cmd == "list":
        for uid, u in sorted(data["users"].items()):
            print(f"{'DISATTIVATO ' if u.get('disabled') else ''}{u['name']} · {u['institution']}  ({u['created']})")
        return 0
    if len(argv) != 3:
        print(f"Uso: python manage_users.py {cmd} \"Nome\" \"Istituzione\"")
        return 1
    uid = user_id(argv[1], argv[2])
    if uid not in data["users"]:
        print("Utente non trovato.")
        return 1
    if cmd == "remove":
        del data["users"][uid]
    else:
        data["users"][uid]["disabled"] = cmd == "disable"
    save(data)
    print("Fatto.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
