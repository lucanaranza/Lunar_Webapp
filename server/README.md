# Moon Landing Site Navigator: server Python

Il server **verifica il login istituzionale** e **consegna i dati delle aree** solo a chi è autorizzato.
Il codice gira sul server: il browser non vede né le credenziali né la logica di verifica.

## Struttura

```
mlsn-server/
├── app.py              # server Flask (login, sessioni, blocco tentativi, API aree, intestazioni di sicurezza)
├── manage_users.py     # aggiunta / rimozione / disattivazione utenti
├── test_app.py         # test automatici (python -m pytest -q)
├── static/index.html   # la webapp
├── data/
│   ├── users.json      # creato da manage_users.py (solo hash, mai le passphrase). NON è servito via web
│   └── areas/*.json    # dati delle aree (formato "mlsn-area-data", vedi index.html)
└── logs/audit.jsonl    # registro accessi (senza segreti)
```

## Avvio in locale

```bash
pip install -r requirements.txt
python manage_users.py add          # es. Nome: Edoardo · Istituzione: Patos · passphrase ≥ 10 caratteri
python app.py                       # → http://127.0.0.1:8000
```

## Come funziona il login (una passphrase, due chiavi)

Dalla passphrase il browser ricava **due chiavi indipendenti**:

| chiave | come si ottiene | dove va |
|---|---|---|
| di accesso | PBKDF2-SHA256 (200 000 iterazioni), sale `mlsn-auth\|istituzione\|nome` | inviata al server, che ne conserva solo uno **scrypt** |
| del vault | PBKDF2-SHA256 (310 000 iterazioni), sale casuale del vault | **resta nel browser**: cifra note, missioni e aree importate (AES-256-GCM) |

Il server quindi autorizza l'accesso ma **non può leggere i dati privati** dell'utente.
Il metodo di cifratura non è un segreto: senza la passphrase è inutile, perché la sicurezza dipende solo dalla chiave.

## Aree istituzionali

Basta copiare i file JSON in `data/areas/` (nome file: lettere, numeri, `-` e `_`). Due campi facoltativi:

```json
{ "institutions": ["Patos", "ESA"],   // solo queste istituzioni vedono l'area (assente = tutti gli autenticati)
  "exportable": false }               // se true, l'utente può riscaricarla dalla webapp
```

Nel browser questi dati restano **solo in memoria**: non finiscono nel vault né sul disco e spariscono al blocco della sessione.

## Protezioni attive

- Login verificato sul server, con risposta generica: non dice se è sbagliato il nome o la passphrase. Il tempo di risposta è lo stesso anche per utenti inesistenti.
- Blocco dopo 5 tentativi falliti per IP e per account, con attesa crescente: 30 s, 60 s, 120 s … fino a 1 h.
- Cookie di sessione `HttpOnly`, `Secure`, `SameSite=Strict`. La sessione scade dopo 30 min di inattività e comunque dopo 8 h.
- Protezione CSRF: header obbligatorio `X-MLSN` e controllo dell'origine.
- Utenti disattivati o rimossi vengono espulsi subito.
- CSP con `frame-ancestors 'none'`, `X-Frame-Options`, `nosniff`, `no-referrer`, e HSTS quando la pagina è servita in HTTPS.
- Nessun file diverso da `index.html` è raggiungibile via web.
- Registro accessi in `logs/audit.jsonl`.

## Produzione: da fare prima di usarlo con dati reali

1. **HTTPS obbligatorio.** Metti il server dietro un reverse proxy come Caddy o nginx, con certificato. Esempio con Caddy:
   ```
   navigator.tuodominio.it {
       reverse_proxy 127.0.0.1:8000
   }
   ```
   In `app.py` aggiungi poi `from werkzeug.middleware.proxy_fix import ProxyFix; app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1)`, così il blocco per IP vede l'IP reale.
2. Usa **waitress** invece di `app.run`, con un solo processo, perché sessioni e blocchi sono in memoria:
   `waitress-serve --host 127.0.0.1 --port 8000 --threads 8 app:app`
3. Rendi `data/users.json` e `logs/` leggibili solo dall'utente del servizio.
4. Con più processi o server serve un archivio condiviso per sessioni e blocchi, per esempio Redis.

Variabili d'ambiente: `MLSN_SECURE_COOKIES` (default `1`), `MLSN_SESSION_IDLE_S`, `MLSN_SESSION_MAX_S`, `MLSN_MAX_FAILS`,
`MLSN_LOCKOUT_BASE_S`, `MLSN_AREAS_DIR`, `MLSN_USERS_FILE`, `MLSN_HOST`, `MLSN_PORT`, `MLSN_TLS=adhoc` (HTTPS di prova).

## Senza server

Se `index.html` viene aperto come file, la webapp passa in **modalità sviluppo** e lo segnala sul login.
L'accesso è controllato solo nel browser, quindi è aggirabile: sono disponibili solo le aree demo e l'archivio locale.
