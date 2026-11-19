/* =====================================================================
   L.A.N.D. – site data: built-in sites (data/sites), imported area files, colour palettes
   No DOM. Imported files are kept in this browser (Store, IndexedDB).
   ===================================================================== */
/* =====================================================================
   COPERTURA DATI: solo alcune aree hanno dati dettagliati.
   - demo: aree d'esempio con dati sintetici
   - import: file caricati dall'utente (salvati cifrati nel vault)
   - server: file elencati in data/areas/index.json (stessa origine)
   Formato file area ("mlsn-area-data"):
   {
     "format": "mlsn-area-data", "version": 1, "name": "Polo Sud LOLA 20m",
     "region": { "lat": -90, "lon": 0, "radiusDeg": 12 },
     "size": N, "extentKm": 365,                 // griglia N×N in proiezione stereografica centrata sulla regione
     "layers": {                                 // array N*N, riga 0 = alto (nord / 0° al polo sud), colonna 0 = sinistra
       "sunFraction":    [...0..1],              // frazione di tempo illuminato (ciclo lunare)
       "earthFraction":  [...0..1],              // frazione di tempo con Terra visibile
       "iceDistanceKm":  [...km],                // distanza great-circle dal ghiaccio più vicino
       "earthHorizonDeg":[...gradi],             // orizzonte locale verso la Terra
       "sunHorizonDeg":  [...gradi]              // (opzionale) orizzonte verso il Sole, per l'evoluzione temporale
     },
     "craters": [{ "name", "lat", "lon", "d", "ice" }]   // opzionale
   }
   ===================================================================== */
// Aree d'esempio con dati sintetici: usate dall'edizione Educational.
// Nell'Expert si vedono solo i dati reali (importati o dal server), a meno di attivare SHOW_DEMO_AREAS.
const SHOW_DEMO_AREAS = false;
const DEMO_COVERAGE = [
  { id: "demo-sp",    name: "South Pole · Artemis",          lat: -90,  lon: 0,      r: 12, source: "demo" },
  { id: "demo-np",    name: "North Pole",                    lat: 90,   lon: 0,      r: 8,  source: "demo" },
  { id: "demo-tranq", name: "Mare Tranquillitatis · Apollo 11", lat: .67, lon: 23.47, r: 6,  source: "demo" },
  { id: "demo-aris",  name: "Aristarchus Plateau",           lat: 25,   lon: -50,    r: 6,  source: "demo" },
  { id: "demo-cop",   name: "Copernicus",                    lat: 9.6,  lon: -20.1,  r: 5,  source: "demo" },
  { id: "demo-schr",  name: "Schrödinger Basin",             lat: -75,  lon: 132.4,  r: 6,  source: "demo" },
];
const COVERAGE = SHOW_DEMO_AREAS ? DEMO_COVERAGE.map(c => ({ ...c })) : [];
const DATASETS = new Map();     // id → dataset caricato/generato

function noise3(x, y, z) {
  return (Math.sin(x * .071 + 1.3) * Math.sin(y * .083 + .7) * Math.cos(z * .05)
    + .6 * Math.sin(x * .19 + y * .13 + 2.1) * Math.sin(y * .21 - z * .05)
    + .35 * Math.sin(x * .43 - .9 + z * .1) * Math.sin(y * .37 + 1.9)) / 1.95;
}

function generateDemoData(cov) {
  const region = { lat: cov.lat, lon: cov.lon, r: cov.r };
  const N = 360, ext = rForDeg(region.r), cell = 2 * ext / N, n = N * N;
  const sun = new Float32Array(n), earth = new Float32Array(n), ice = new Float32Array(n), hz = new Float32Array(n), hzs = new Float32Array(n);
  const cen = unit(region.lat, region.lon), reach = region.r + 8;
  const cr = CRATERS.filter(c => angDeg(cen, unit(c.lat, c.lon)) < reach + c.d / 2 / MOON_R / DEG)
                    .map(c => ({ ...c, u: unit(c.lat, c.lon), R: c.d / 2 }));
  const icy = CRATERS.filter(c => c.ice).map(c => ({ u: unit(c.lat, c.lon), R: c.d / 2 }));
  const ms = MASSIFS.map(m => ({ ...m, us: m.p.map(([a, b]) => unit(a, b)) }));
  const lib = [];
  for (let i = 0; i < 8; i++) for (let k = 0; k < 8; k++)
    lib.push({ lon: 7.9 * Math.sin(2 * Math.PI * (i + .5) / 8), lat: 6.68 * Math.sin(2 * Math.PI * (k + .25) / 8) });
  const decl = [...Array(8)].map((_, k) => 1.54 * Math.sin(2 * Math.PI * (k + .5) / 8) * DEG);

  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const x = -ext + (j + .5) * cell, y = ext - (i + .5) * cell, idx = i * N + j;
    const [lat, lon] = projInv(x, y, region), u = unit(lat, lon);
    const X = u[0] * MOON_R, Y = u[1] * MOON_R, Z = u[2] * MOON_R;
    let h = .42 + .12 * noise3(X, Y, Z), floor = 0;
    for (const k of cr) {
      const q = degToKm(angDeg(u, k.u)) / k.R;
      if (q < 1) { h -= .55 * (1 - q * q); floor = Math.max(floor, 1 - q); }
      if (q < 2) h += .22 * Math.exp(-(((q - 1) / .18) ** 2));
    }
    for (const m of ms) {
      let d = Infinity;
      for (const v of m.us) d = Math.min(d, degToKm(angDeg(u, v)));
      if (d < m.r * 4) h += m.h * Math.exp(-((d / m.r) ** 2));
    }
    h = Math.max(0, Math.min(1.2, h));
    const horizon = 4.5 * (1 - h) - 1.2 + 7 * floor;
    hz[idx] = horizon;
    const hsDeg = horizon + .6 * noise3(X * 1.7, Y * 1.7, Z);
    hzs[idx] = hsDeg;
    const p = lat * DEG, hs = hsDeg * DEG;
    let s = 0;
    for (const dl of decl) {
      const den = Math.cos(p) * Math.cos(dl);
      const xx = den < 1e-9 ? (Math.sin(hs) < Math.sin(p) * Math.sin(dl) ? -2 : 2) : (Math.sin(hs) - Math.sin(p) * Math.sin(dl)) / den;
      s += Math.acos(Math.max(-1, Math.min(1, xx))) / Math.PI;
    }
    sun[idx] = Math.min(.95, s / decl.length);
    let e = 0;
    for (const b of lib) if (elevation(lat, lon, b) > horizon) e++;
    earth[idx] = e / lib.length;
    let dIce = Infinity;
    for (const k of icy) dIce = Math.min(dIce, Math.max(0, degToKm(angDeg(u, k.u)) - .7 * k.R));
    ice[idx] = Math.min(dIce, 9999);
  }
  return withGrid({ id: cov.id, name: cov.name, region, N, ext, sun, earth, ice, hz, hzs, craters: CRATERS, demo: true, source: "demo" });
}

// griglia N×N centrata sulla regione (formato interno): origine, passo, proiezione
function withGrid(D) {
  const cell = 2 * D.ext / D.N;
  return Object.assign(D, { pc: D.region, nx: D.N, ny: D.N, step: cell, gx0: -D.ext + cell / 2, gy0: D.ext - cell / 2 });
}
/* --- import / export file dati area --- */
const f32ToB64 = a => { const u8 = new Uint8Array(a.buffer, a.byteOffset, a.byteLength); let s = "";
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const b64ToF32 = s => { const bin = atob(s), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); return new Float32Array(u8.buffer); };

/* ---------- Formato "mappa-sito-lunare" (dati reali da DEM, es. Sito_01) ----------
   Griglia in stereografica polare (stessa proiezione della webapp, verificata al cm), celle da passo_m.
   Conversione verso il modello interno:
     luce_pct → sunFraction · comunicazione_pct → earthFraction
     ghiaccio: indice di ombra permanente dalla sola illuminazione (luce = 0 → 1, luce < 1% → 0,5) e distanza dalle celle mai illuminate
     orizzonti efficaci verso Sole e Terra: ricavati in modo che, con le effemeridi della webapp,
     la quota di tempo visibile coincida con le percentuali reali (servono per l'evoluzione nel tempo)
     quota_m, buio_max_h, senza_com_max_h, energia_pct: mostrati nel tooltip                        */
function parseSiteMap(j, source) {
  const g = j.griglia, L = j.layers;
  if (!g || !L || !Array.isArray(g.forma)) throw new Error("griglia");
  if (!/polare\s+sud/i.test(String(g.crs || ""))) throw new Error("crs (solo stereografica polare sud)");
  const ny = g.forma[0] | 0, nx = g.forma[1] | 0, step = +g.passo_m / 1000;
  if (!(nx >= 2 && ny >= 2 && nx * ny <= 4e6 && step > 0)) throw new Error("forma / passo_m");
  if (!Array.isArray(g.x_m) || g.x_m.length !== nx || !Array.isArray(g.y_m) || g.y_m.length !== ny) throw new Error("x_m / y_m");
  const flat = (name, k = 1, required = true) => {
    const a = L[name];
    if (a == null && !required) return null;
    if (!Array.isArray(a) || a.length !== ny) throw new Error(`${name} (${ny}×${nx})`);
    const f = new Float32Array(nx * ny);
    for (let i = 0; i < ny; i++) {
      if (!Array.isArray(a[i]) || a[i].length !== nx) throw new Error(name);
      for (let c = 0; c < nx; c++) { const v = a[i][c]; f[i * nx + c] = v == null || !isFinite(v) ? NaN : v * k; }
    }
    return f;
  };
  const lat = flat("lat"), lon = flat("lon"), sun = flat("luce_pct", .01), earth = flat("comunicazione_pct", .01);
  const extra = { quota: flat("quota_m", 1, false), buio: flat("buio_max_h", 1, false), senzaCom: flat("senza_com_max_h", 1, false),
                  energia: flat("energia_pct", 1, false), orizzonte: flat("orizzonte_max_deg", 1, false),
                  pendenza: flat("pendenza_media_deg", 1, false), atterrabile: flat("area_pendenza_le10_pct", 1, false),
                  luceCom: flat("luce_e_com_pct", 1, false) };
  const n = nx * ny, pc = { lat: -90, lon: 0, r: 90 };
  // centro e raggio dell'area (cerchio inscritto nella griglia)
  const gx0 = g.x_m[0] / 1000, gy0 = g.y_m[0] / 1000, xc = gx0 + (nx - 1) * step / 2, yc = gy0 - (ny - 1) * step / 2;
  const [clat, clon] = projInv(xc, yc, pc), rDeg = Math.min(nx, ny) * step / 2 * .98 / (MOON_R * DEG);
  // indice di ombra permanente (possibile ghiaccio): SOLO criterio di illuminazione (luce_pct sul periodo dei dati, passo 1 h)
  //   1   = mai illuminata nel periodo (0 h di Sole: ombra permanente, possibile trappola fredda)
  //   0,5 = quasi sempre in ombra (Sole visibile meno dell'1% del tempo, < ~88 h/anno)
  //   0   = illuminata più spesso: il ghiaccio in superficie non è stabile
  // Indica dove il ghiaccio PUÒ trovarsi, non è una misura: servirebbero temperature (< ~110 K) e dati di sonde.
  const ICE_PSR_PCT = .05, ICE_NEAR_PCT = 1;
  const iceProb = new Float32Array(n);
  for (let k = 0; k < n; k++) { const lp = sun[k] * 100; iceProb[k] = !isFinite(lp) ? 0 : lp <= ICE_PSR_PCT ? 1 : lp < ICE_NEAR_PCT ? .5 : 0; }
  // ghiaccio vicino: distanza dalla cella più vicina in ombra permanente (indice = 1)
  const psr = []; for (let k = 0; k < n; k++) if (iceProb[k] >= 1) psr.push(k);
  const ice = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    let d = Infinity; const r = Math.floor(k / nx), c = k % nx;
    for (const p of psr) d = Math.min(d, Math.hypot(Math.floor(p / nx) - r, (p % nx) - c));
    ice[k] = psr.length ? Math.max(0, (d - .5) * step) : 9999;
  }
  // orizzonti efficaci: quantile dell'elevazione di Sole/Terra sul periodo dei dati
  const t0 = Date.parse((j.periodo && j.periodo.inizio) || "2027-01-01T00:00:00Z"), days = Math.max(1, +(j.periodo && j.periodo.giorni) || 365);
  // rendimento del pannello quando c'è Sole, dalla nostra energia_pct (mappatura.py):
  //   energia_pct = media nel tempo di [frazione del disco solare visibile × fattore polvere]; luce_pct = % di tempo con il disco almeno in parte visibile
  //   → frazione media del disco quando c'è luce = energia / (luce × polvere media del periodo). La polvere la riapplica il modello energetico.
  const hp = j.ipotesi || {}, dP0 = isFinite(+hp.perdita_iniziale_polvere_pct) ? +hp.perdita_iniziale_polvere_pct : 0,
        dA = isFinite(+hp.degrado_polvere_annuo_pct) ? +hp.degrado_polvere_annuo_pct : 1.3;
  const dustMean = Math.max(.01, (1 - dP0 / 100) * (1 - dA / 100 * days / 365.25 / 2));
  let panelK = null;
  if (extra.energia) {
    panelK = new Float32Array(n);
    for (let k = 0; k < n; k++) { const e = extra.energia[k] / 100, l = sun[k]; panelK[k] = l > 0 && isFinite(e) ? Math.max(0, Math.min(1, e / (l * dustMean))) : 1; }
  }
  const S = Math.min(2000, Math.round(days * 4)), sunS = [], earS = [];
  for (let s = 0; s < S; s++) { const d = new Date(t0 + (s + .5) / S * days * DAY); sunS.push(bodyVec(sunAt(d))); earS.push(bodyVec(earthAt(d))); }
  let hzs = null, hz = null; const buf = new Float64Array(S);
  const effHz = (k, V, frac) => {
    const sp = Math.sin(lat[k] * DEG), cp = Math.cos(lat[k] * DEG), cl = Math.cos(lon[k] * DEG), sl = Math.sin(lon[k] * DEG);
    for (let s = 0; s < S; s++) { const v = V[s]; buf[s] = sp * v[0] + cp * (v[1] * cl + v[2] * sl); }
    buf.sort();
    const f = isFinite(frac) ? Math.max(0, Math.min(1, frac)) : 0;
    if (f <= 0) return Math.asin(Math.min(1, buf[S - 1])) / DEG + .5;           // mai visibile
    if (f >= 1) return Math.asin(Math.max(-1, buf[0])) / DEG - .5;             // sempre visibile
    const i = Math.min(S - 1, Math.max(0, Math.round((1 - f) * S) - 1));
    return Math.asin(Math.max(-1, Math.min(1, (buf[i] + buf[Math.min(S - 1, i + 1)]) / 2))) / DEG;
  };
  // calcolati solo quando servono (dataset senza evoluzione reale): con 27 siti integrati sarebbe lento farlo per tutti
  const ensureHz = () => {
    if (D.hz) return;
    D.hzs = new Float32Array(n); D.hz = new Float32Array(n);
    for (let k = 0; k < n; k++) { D.hzs[k] = effHz(k, sunS, sun[k]); D.hz[k] = effHz(k, earS, earth[k]); }
  };
  // evoluzione reale (file evoluzione-sito-lunare): un bit per cella e per istante, per luce e comunicazione
  let evo = null;
  const ev = j.evoluzione;
  if (ev && ev.luceBits && ev.comBits) {
    const nI = ev.n_istanti | 0, need = Math.ceil(nI * n / 8);
    if (Array.isArray(ev.forma) && ev.forma[0] === ny && ev.forma[1] === nx && ev.luceBits.length >= need && ev.comBits.length >= need)
      evo = { start: Date.parse(ev.inizio), stepH: (+ev.passo_min || 360) / 60, n: nI, nc: n, luce: ev.luceBits, com: ev.comBits };
  }
  const name = String(j.nome || "Sito").slice(0, 60);
  const id = (source === "import" ? "imp-" : source === "builtin" ? "site-" : "srv-") + (j.id || name).toString().replace(/[^\w-]/g, "").slice(0, 30);
  let raw = j;
  if (j.evoluzione) { raw = { ...j }; delete raw.evoluzione; }          // l'export riporta la mappa originale
  const D = { id, name, region: { lat: clat, lon: clon, r: rDeg }, pc, nx, ny, N: nx, gx0, gy0, step, ext: Math.max(nx, ny) * step / 2,
           sun, earth, ice, hz, hzs, extra, iceProb, panelK, craters: CRATERS, demo: false, source, raw, evo, ensureHz,
           period: { start: new Date(t0), days }, real: true };
  return D;
}

function parseDataset(j, source) {
  if (!j || typeof j !== "object") throw new Error("JSON");
  if (j.formato === "mappa-sito-lunare") return parseSiteMap(j, source);
  if (!j.region || !j.layers) throw new Error("region / layers");
  const lat = +j.region.lat, lon = +j.region.lon, r = +(j.region.radiusDeg ?? j.region.r);
  if (!(Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && r > 0 && r <= 30)) throw new Error("region");
  const N = j.size | 0;
  if (N < 8 || N > 2048) throw new Error("size");
  const arr = (name, required = true) => {
    const a = j.layers[name];
    if (a == null && !required) return null;
    if (!Array.isArray(a) || a.length !== N * N) throw new Error(`${name} (${N}×${N})`);
    const f = Float32Array.from(a);
    for (let i = 0; i < f.length; i += 997) if (!isFinite(f[i])) throw new Error(name);
    return f;
  };
  const sun = arr("sunFraction"), earth = arr("earthFraction"), ice = arr("iceDistanceKm"), hz = arr("earthHorizonDeg"), hzs = arr("sunHorizonDeg", false);
  const craters = Array.isArray(j.craters)
    ? j.craters.filter(c => c && isFinite(c.lat) && isFinite(c.lon) && c.d > 0).slice(0, 500)
               .map(c => ({ name: String(c.name || "").slice(0, 40), lat: +c.lat, lon: +c.lon, d: +c.d, ice: !!c.ice }))
    : CRATERS;
  const name = String(j.name || "Area").slice(0, 60);
  const id = (source === "import" ? "imp-" : "srv-") + (j.id ? String(j.id).replace(/[^\w-]/g, "").slice(0, 30) : Date.now().toString(36));
  const ext = +j.extentKm > 0 ? +j.extentKm : rForDeg(r);
  return withGrid({ id, name, region: { lat, lon, r }, N, ext, sun, earth, ice, hz, hzs, craters, demo: false, source });
}
function datasetToJSON(D) {
  if (D.raw) return D.raw;                 // dati reali importati: si riesporta il file originale
  const round = (a, k) => Array.from(a, v => Math.round(v * k) / k);
  const out = {
    format: "mlsn-area-data", version: 1, name: D.name, region: { lat: D.region.lat, lon: D.region.lon, radiusDeg: D.region.r },
    size: D.N, extentKm: D.ext, projection: "stereographic-centered",
    layers: { sunFraction: round(D.sun, 1e4), earthFraction: round(D.earth, 1e4), iceDistanceKm: round(D.ice, 1e3), earthHorizonDeg: round(D.hz, 1e3) },
    craters: (D.craters || []).filter(c => angDeg(unit(c.lat, c.lon), unit(D.region.lat, D.region.lon)) < D.region.r + 3),
  };
  if (D.hzs) out.layers.sunHorizonDeg = round(D.hzs, 1e3);
  return out;
}
function covFromDataset(D) { return { id: D.id, name: D.name, lat: D.region.lat, lon: D.region.lon, r: D.region.r, source: D.source }; }
async function storeDataset(D) {
  const ids = (await Store.get("datasets")) || [];
  if (D.raw) {                             // formato originale: si salva il file (cifrato) e si rielabora al caricamento
    await Store.set("dataset:" + D.id, { id: D.id, raw: D.raw });
    if (!ids.includes(D.id)) { ids.push(D.id); await Store.set("datasets", ids); }
    return;
  }
  await Store.set("dataset:" + D.id, { id: D.id, name: D.name, region: D.region, N: D.N, ext: D.ext, craters: D.craters,
    b: { sun: f32ToB64(D.sun), earth: f32ToB64(D.earth), ice: f32ToB64(D.ice), hz: f32ToB64(D.hz), hzs: D.hzs ? f32ToB64(D.hzs) : null } });
  if (!ids.includes(D.id)) { ids.push(D.id); await Store.set("datasets", ids); }
}
// siti dei dati di analisi: file della pipeline in data/sites/ (mappa_<Sito>.json + evoluzione_<Sito>.json),
// elencati dal server con /api/sites (senza server: data/sites/index.json). Le mappe si leggono all'ingresso; l'evoluzione nel tempo solo quando serve.
let BUILTIN_DONE = null;
async function unpackBuiltinSites(only) {
  // elenco statico: data/sites/index.json (rigenerato da "python app.py index")
  const idx = await fetchJSON("data/sites/index.json");
  const out = [];
  await Promise.all((idx.siti || []).filter(s => !HIDDEN_BUILTIN.has(s.nome) && (!only || s.nome === only)).map(async s => {
    try { const j = await fetchJSON(s.mappa); j._evoUrl = s.evoluzione || null; out.push(j); }
    catch (e) { console.warn("mappa del sito non leggibile", s.nome, e); }
  }));
  return out.sort((a, b) => String(a.nome).localeCompare(String(b.nome), undefined, { numeric: true }));
}
async function ensureEvo(D) {                 // evoluzione reale (bit per cella e per istante) da data/sites/evoluzione_*.json
  if (!D || D.evo || !D.evoUrl) return D;
  if (!D.evoP) D.evoP = (async () => {
    try {
      const ev = await fetchJSON(D.evoUrl), n = D.nx * D.ny, nI = ev.n_istanti | 0, need = Math.ceil(nI * n / 8);
      const f = ev.forma_griglia || ev.forma, luce = b64bytes(ev.luce), com = b64bytes(ev.comunicazione);
      if (Array.isArray(f) && f[0] === D.ny && f[1] === D.nx && luce.length >= need && com.length >= need)
        D.evo = { start: Date.parse(ev.inizio), stepH: (+ev.passo_min || 360) / 60, n: nI, nc: n, luce, com };
      else console.warn("evoluzione non coerente con la mappa", D.name);
    } catch (e) { console.warn("evoluzione non disponibile", D.name, e); }
  })();
  await D.evoP; return D;
}
// doppioni nascosti: Sito_20 è dentro Sito_20v2 (stesso punto migliore); Sito_LM8 si sovrappone a Sito_Shoemaker (stesso punto migliore)
const HIDDEN_BUILTIN = new Set(["Sito_20", "Sito_LM8"]);
function loadBuiltinSites(only) {             // only = nome di un sito: carica solo quello (pagina di analisi)
  if (BUILTIN_DONE) return BUILTIN_DONE;
  BUILTIN_DONE = (async () => {
    let list = [];
    try { list = await unpackBuiltinSites(only); } catch (e) { console.warn("elenco dei siti non disponibile (data/sites/index.json)", e); }
    for (const j of list) {
      if (j && HIDDEN_BUILTIN.has(j.nome)) continue;
      const evoUrl = j._evoUrl; delete j._evoUrl;
      try { const D = parseDataset(j, "builtin"); D.evoUrl = evoUrl; DATASETS.set(D.id, D); COVERAGE.push(covFromDataset(D)); } catch (e) { console.warn("sito non valido", j && j.nome, e); }
    }
  })();
  return BUILTIN_DONE;
}
const builtinByName = name => COVERAGE.find(c => c.source === "builtin" && c.name.toLowerCase() === String(name).toLowerCase());
function dropDuplicatesOfBuiltin() {        // lo stesso sito importato più volte: vale quello integrato
  for (let i = COVERAGE.length - 1; i >= 0; i--) {
    const c = COVERAGE[i];
    if (c.source !== "builtin" && builtinByName(c.name)) { DATASETS.delete(c.id); COVERAGE.splice(i, 1); }
  }
}
async function loadStoredDatasets() {
  for (let i = COVERAGE.length - 1; i >= 0; i--) if (COVERAGE[i].source === "import") { DATASETS.delete(COVERAGE[i].id); COVERAGE.splice(i, 1); }
  const ids = (await Store.get("datasets")) || [];
  for (const id of ids) {
    try {
      const s = await Store.get("dataset:" + id);
      if (!s) continue;
      if (s.raw) { const D = parseDataset(s.raw, "import"); D.id = s.id; DATASETS.set(D.id, D); COVERAGE.push(covFromDataset(D)); continue; }
      const D = { id: s.id, name: s.name, region: s.region, N: s.N, ext: s.ext, craters: s.craters || CRATERS, demo: false, source: "import",
        sun: b64ToF32(s.b.sun), earth: b64ToF32(s.b.earth), ice: b64ToF32(s.b.ice), hz: b64ToF32(s.b.hz), hzs: s.b.hzs ? b64ToF32(s.b.hzs) : null };
      withGrid(D);
      DATASETS.set(D.id, D); COVERAGE.push(covFromDataset(D));
    } catch (e) {}
  }
}
function getDataset(cov) {
  if (!DATASETS.has(cov.id) && cov.source === "demo") DATASETS.set(cov.id, generateDemoData(cov));
  return DATASETS.get(cov.id);
}
async function getDatasetAsync(cov) { return getDataset(cov); }
const covById = id => COVERAGE.find(c => c.id === id);
// zone con dati che contengono il punto, in ordine di preferenza:
// 1) quella scelta dall'elenco  2) dati reali prima delle demo  3) la più dettagliata (raggio minore)
let PREF_COV = null;
function coveragesAt(lat, lon) {
  const u = unit(lat, lon), out = [];
  for (const c of COVERAGE) { const room = c.r - angDeg(u, unit(c.lat, c.lon)); if (room >= 0) out.push({ cov: c, room, pri: c.source === "demo" ? 0 : 1 }); }
  return out.sort((a, b) => (b.cov.id === PREF_COV) - (a.cov.id === PREF_COV) || b.pri - a.pri || a.cov.r - b.cov.r);
}
function coverageFor(lat, lon, needR = 0) {   // la migliore che contiene anche il raggio richiesto (se possibile)
  const list = coveragesAt(lat, lon);
  return list.find(x => x.room >= needR - 1e-9) || list[0] || null;
}
const maxRadiusAt = (lat, lon) => { const b = coverageFor(lat, lon); return b ? Math.min(AREA_LIMITS.maxDeg, b.room) : 0; };

/* ---------- Palette ---------- */
const PALETTES = {
  score: ["#440154", "#46327e", "#365c8d", "#277f8e", "#1fa187", "#4ac16d", "#a0da39", "#fde725"],
  sun:   ["#0b0b1a", "#3b0f4f", "#8a1c3c", "#d1401f", "#f58b0b", "#fcd34d", "#fff7c2"],
  earth: ["#06121f", "#0b2d4a", "#0e5577", "#11829a", "#2fb5b0", "#7fe0c6", "#e6fff5"],
  ice:   ["#070a14", "#101f4d", "#1c3f8f", "#2f6fd1", "#5aa6f0", "#a9d8ff", "#ffffff"],
  energy: ["#0a1a10", "#0f3a22", "#14632f", "#16883a", "#22c55e", "#86efac", "#dcfce7"],                    // un solo tono: carica minima
  quota: ["#0b1f6b", "#1d6fb8", "#2fa36b", "#a7c957", "#d9c89e", "#f5f0e6"],
  slope: ["#1a9850", "#91cf60", "#fee08b", "#fc8d59", "#d73027"],
  hours: ["#f0f6ff", "#bfdbfe", "#60a5fa", "#1d4ed8", "#0b1f5c"],
  copper: ["#2a1205", "#7c2d12", "#c2410c", "#f59e0b", "#fde68a", "#fffbeb"],
  land: ["#111827", "#14532d", "#16a34a", "#86efac", "#f0fdf4"],
  temp:  ["#1e1b4b", "#1e40af", "#3b82f6", "#93c5fd", "#9ca3af", "#fdba74", "#f97316", "#c2410c", "#7f1d1d"], // divergente, grigio = 0 °C
};
const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const LUTS = Object.fromEntries(Object.entries(PALETTES).map(([k, stops]) => {
  const cols = stops.map(hexRgb), n = cols.length, lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255 * (n - 1), a = Math.min(n - 2, Math.floor(t)), f = t - a;
    for (let ch = 0; ch < 3; ch++) lut[i * 3 + ch] = cols[a][ch] + (cols[a + 1][ch] - cols[a][ch]) * f;
  }
  return [k, lut];
}));
const iceScore = d => d <= 2 ? 1 : Math.exp(-(d - 2) / 4);

