"""Decifra un export cifrato della Expert Edition (Moon Landing Site Navigator).

Uso:
    pip install cryptography
    python decrypt_export.py mlsn-expert-2026-11-14.enc.json > dati.json

La passphrase viene chiesta da terminale (non resta nella cronologia della shell).
Formato: PBKDF2-SHA256 -> chiave AES-256-GCM; ciphertext e IV in base64.
"""
import base64
import getpass
import json
import sys

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC


def decrypt_export(payload: dict, passphrase: str) -> dict:
    if not payload.get("encrypted"):
        return payload  # file già in chiaro
    kdf = payload["kdf"]
    key = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=base64.b64decode(kdf["salt"]),
        iterations=kdf["iterations"],
    ).derive(passphrase.encode("utf-8"))
    iv = base64.b64decode(payload["cipher"]["iv"])
    ct = base64.b64decode(payload["cipher"]["ct"])  # include il tag GCM finale
    return json.loads(AESGCM(key).decrypt(iv, ct, None))


def encrypt_plain(data: dict) -> dict:
    """JSON in chiaro importabile dalla webapp (pulsante Importa)."""
    return {"app": "moon-landing-site-navigator", "edition": "expert", "version": 2, "data": data}


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("Uso: python decrypt_export.py <file.enc.json>")
    with open(sys.argv[1], encoding="utf-8") as f:
        payload = json.load(f)
    try:
        result = decrypt_export(payload, getpass.getpass("Passphrase del vault: "))
    except Exception:
        sys.exit("Decifratura fallita: passphrase errata o file danneggiato.")
    json.dump(result, sys.stdout, ensure_ascii=False, indent=2)
