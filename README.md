# L.A.N.D. – Lunar Area Navigation and Determination

Webapp for the NASA Space Apps hackathon. **Open source, no sign-in**: every page is static
(works on GitHub Pages or any static host) and nothing leaves the browser.

* **Educational Edition** – Moon history, a reasoning game, a landing game and real site data.
* **Expert Edition** – landing-site analysis built from real NASA LOLA topography and JPL Horizons ephemerides.

## Pages

| File | What it is |
| --- | --- |
| `index.html` | intro (logo + duck on the shuttle, once per visit) and home menu |
| `history.html` | Educational · why each mission landed where it did (3D globe) |
| `reasoning.html` | Educational · pick the best site with the experts |
| `mission.html` | Educational · landing game and mission patch |
| `deep-dive.html` | Educational · a real site, up close |
| `workspace.html` | Expert · Area Selection (3D globe → 2D South Pole map) |
| `analysis.html?site=<name>` | Expert · heat map, mission parameters, time evolution, 3D view |

## Code

```
css/land.css          shared look (the inner pages use body.lroc = the Area Selection style)
css/analysis.css      heat-map page layout          css/edu.css   educational pages
js/core/i18n-text.js  all texts (it, en, es, fr, de) – edit texts here
js/core/core.js       language, storage (IndexedDB, not encrypted), helpers, phone UI
js/core/geo.js        lunar geometry, projections, Sun/Earth ephemerides, craters
js/core/data.js       site files (data/sites), imported area files, palettes
js/core/state.js      mission state shared by workspace.html and analysis.html
js/core/moon-gl.js    the WebGL Moon used by every globe
js/core/tour.js       the "? Guide" walkthrough
js/pages/*.js         one script per page
images/moon-4k.jpg    LROC WAC albedo + LOLA relief, 4096×2048 (moon-2k.jpg loads first)
```

Each page loads `i18n-text.js` and `core.js` first, then what it needs, then its own script in `js/pages/`.

## Run locally

```
python app.py            # http://127.0.0.1:8000  (or any static server: python -m http.server)
python app.py index      # after adding/removing files in data/sites: rewrites data/sites/index.json
node --test              # page structure tests
python -m pytest -q      # server / data index tests
```

Opening the HTML files directly (`file://`) does not work: the browser blocks reading the `data/` files.

## Data

`data/sites/mappa_<Site>.json` (yearly maps per cell) and `evoluzione_<Site>.json` (light and Earth link per cell,
every hour) come from the processing pipeline, kept outside this repo. Copy new results with:

```
Get-ChildItem C:\Users\lucan\Desktop\Hackaton_Ephemerids\out_v2 -Recurse -Include mappa_*.json,evoluzione_*.json | Copy-Item -Destination C:\Users\lucan\Desktop\Lunar_Webapp\data\sites -Force
python app.py index
```

Moon texture: NASA SVS CGI Moon Kit (LROC WAC colour mosaic, LOLA elevation), public domain.
