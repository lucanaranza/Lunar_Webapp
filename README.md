# L.A.N.D. – Lunar Area Navigation and Determination

Webapp for the NASA Space Apps hackathon. One page with both editions:

- **Educational** – public: lunar landing history, reasoning game, landing game, deep dive on real site maps.
- **Expert** – institutional login: Area Selection (3D globe → 2D South Pole map), mission set-up and analysis of the real site data.

Everything runs from this folder with one small Python server.

## Folder layout

```
3-Lunar_Webapp/
├── app.py               # server (Flask): the page, the analysis data, login and institutional areas
├── manage_users.py      # add / remove / disable Expert accounts
├── decrypt_export.py    # decrypts an encrypted export from the browser vault
├── requirements.txt
├── static/
│   └── index.html       # the only page (Educational + Expert)
├── data/                # JSON files used by the analysis (put new pipeline outputs here)
│   ├── sites/
│   │   ├── mappa_<Site>.json        # yearly-average maps per cell   (from mappatura.py)
│   │   └── evoluzione_<Site>.json   # light / comms every 6 h        (from mappatura.py)
│   ├── tabella_sole_terra.json      # sub-solar / sub-Earth points, hourly 2026–2028 (tabella_sole_terra.py)
│   ├── areas/                       # institution-only areas (served only after login)
│   └── users.json                   # created by manage_users.py – never served, not in git
├── images/              # source artwork (already embedded in the page)
├── logs/                # audit.jsonl (no secrets, not in git)
└── tests/               # python -m pytest -q   ·   node --test tests/
```

## Run it

```bash
pip install -r requirements.txt
python manage_users.py add      # Expert account: name, institution, passphrase (≥ 10 characters)
python app.py                   # → http://127.0.0.1:8000
```

The page needs the server: opened directly as a file it cannot read `data/`, so the sites do not appear.

## Adding or updating a site

1. Run the pipeline (topography → `mappatura.py`) for the site.
2. Copy `mappa_<Site>.json` and `evoluzione_<Site>.json` into `data/sites/`.
3. Reload the page. The server lists every `mappa_*.json` it finds (`/api/sites`); the evolution file is optional.

File names may only use letters, digits, `_` and `-`. Only these files and `tabella_sole_terra.json` are reachable from the web:
`users.json`, `areas/` and the logs are not.

The page reads the site maps when the Workspace opens and each site's evolution only when that site is analysed,
so the browser downloads just what it needs. The server compresses the files (the largest evolution goes from 1.7 MB to about 0.2 MB).

## Institutional areas (`data/areas/`)

JSON area files that only logged-in users see, optionally limited to some institutions:

```json
{ "institutions": ["Patos", "ESA"],   // only these institutions (missing = every logged-in user)
  "exportable": false }               // true = the user can download it again from the page
```

## Security in short

- **Login** is checked by the server. The browser derives two keys from the passphrase: an access key (PBKDF2, sent to the server, stored only as scrypt) and a vault key (PBKDF2, never leaves the browser).
- **Private notes, missions and imported areas** are encrypted in the browser with AES-256-GCM: the server cannot read them.
- **Sessions** use HttpOnly / Secure / SameSite=Strict cookies, expire after 30 min idle or 8 h, and lock out after 5 failed attempts with growing waits.
- **Requests** carry CSRF protection (header + origin check) and strict security headers (CSP, frame-ancestors, nosniff, HSTS on HTTPS). Access is recorded in `logs/audit.jsonl`.

In production put it behind HTTPS (reverse proxy) and run it with `waitress` instead of `python app.py`.
