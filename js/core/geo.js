/* =====================================================================
   L.A.N.D. – lunar geometry, projections, ephemerides (Sun / Earth), crater catalogue
   Pure functions, no DOM. Used by every page.
   ===================================================================== */
/* ---------- Geometria lunare (sfera) ---------- */
const MOON_R = 1737.4;                 // km
const DEG = Math.PI / 180;
const wrap180 = a => ((a + 540) % 360) - 180;
const AREA_LIMITS = { maxDeg: 30, minDeg: .01 };   // l'area selezionata è sempre l'intero sito con dati   // raggio massimo/minimo dell'area (gradi d'arco)
const degToKm = d => d * DEG * MOON_R;
const unit = (lat, lon) => { const p = lat * DEG, l = lon * DEG; return [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)]; };
const angDeg = (a, b) => Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) / DEG;
const fmtLat = v => `${Math.abs(v).toFixed(2)}°${v >= 0 ? "N" : "S"}`;
const fmtLon = v => { v = wrap180(v); return `${Math.abs(v).toFixed(2)}°${v >= 0 ? "E" : "W"}`; };
const fmtLL = (la, lo) => `${fmtLat(la)} · ${fmtLon(lo)}`;
function bearing(la1, lo1, la2, lo2) {
  const p1 = la1 * DEG, p2 = la2 * DEG, dl = (lo2 - lo1) * DEG;
  return (Math.atan2(Math.sin(dl) * Math.cos(p2), Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl)) / DEG + 360) % 360;
}
function destination(la, lo, brgDeg, distDeg) {
  const p = la * DEG, l = lo * DEG, b = brgDeg * DEG, d = distDeg * DEG;
  const p2 = Math.asin(Math.sin(p) * Math.cos(d) + Math.cos(p) * Math.sin(d) * Math.cos(b));
  const l2 = l + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(p), Math.cos(d) - Math.sin(p) * Math.sin(p2));
  return [p2 / DEG, wrap180(l2 / DEG)];
}
function elevation(la, lo, body) {
  const p = la * DEG, b = body.lat * DEG;
  const c = Math.sin(p) * Math.sin(b) + Math.cos(p) * Math.cos(b) * Math.cos((lo - body.lon) * DEG);
  if (!body.dist) return Math.asin(Math.max(-1, Math.min(1, c))) / DEG;
  // con la distanza (tabella reale): elevazione vista dalla superficie, parallasse inclusa (~0,26° per la Terra)
  const D = body.dist, R = MOON_R;
  return Math.asin((D * c - R) / Math.sqrt(D * D + R * R - 2 * D * R * c)) / DEG;
}

/* Proiezione stereografica centrata (x verso est, y verso nord; al polo sud: 0° in alto) */
let REGION = { lat: -90, lon: 0, r: 10 };
function projFwd(lat, lon, C = REGION) {
  const p = lat * DEG, p0 = C.lat * DEG, d = (lon - C.lon) * DEG;
  const cosc = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(d);
  const k = 2 * MOON_R / (1 + cosc);
  return [k * Math.cos(p) * Math.sin(d), k * (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(d))];
}
function projInv(x, y, C = REGION) {
  const rho = Math.hypot(x, y), p0 = C.lat * DEG;
  if (rho < 1e-9) return [C.lat, C.lon];
  const c = 2 * Math.atan(rho / (2 * MOON_R)), sc = Math.sin(c), cc = Math.cos(c);
  const lat = Math.asin(cc * Math.sin(p0) + y * sc * Math.cos(p0) / rho) / DEG;
  const lon = C.lon + Math.atan2(x * sc, rho * Math.cos(p0) * cc - y * Math.sin(p0) * sc) / DEG;
  return [lat, wrap180(lon)];
}
const rForDeg = deg => 2 * MOON_R * Math.tan(deg * DEG / 2);

/* ---------- Effemeridi ----------
   Reali: tabella_sole_terra (punti subsolare e subterrestre, JPL DE421 con librazione, ogni ora, 2026–2028),
   interpolate come in tabella_sole_terra.js. Fuori dalla tabella: formula approssimata (solo di riserva). */
const DAY = 864e5, SYNODIC = 29.530588853, NEW_MOON_2000 = Date.UTC(2000, 0, 6, 18, 14) / DAY;
let EPH = null;
// file di dati serviti dal server (cartella data/): stessa origine, risposta compressa dal server
async function fetchJSON(url) {
  const r = await fetch(url, { credentials: "same-origin" });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}
function b64bytes(s) { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
async function loadEphTable() {
  const T = await fetchJSON("data/tabella_sole_terra.json"), F = a => Float64Array.from(a);
  if (T.formato !== "tabella-sole-terra" || !(T.n > 1)) throw new Error("formato non riconosciuto");
  EPH = { t0: Date.parse(T.inizio), step: +T.passo_ore * 36e5, n: T.n,
          s: { lat: F(T.sole_lat), lon: F(T.sole_lon), dist: Float64Array.from(T.sole_dist_kkm, v => v * 1000) },
          e: { lat: F(T.terra_lat), lon: F(T.terra_lon), dist: F(T.terra_dist_km) } };
  // ridisegna ciò che era già aperto con le effemeridi approssimate
  try { if (typeof PX !== "undefined" && PX) { queueRecolor(true); ORBIT.dirty = true; } } catch (e) {}
}
loadEphTable().catch(e => console.warn("tabella Sole-Terra non leggibile, uso le effemeridi approssimate", e));
function ephAt(date, B) {
  if (!EPH) return null;
  const f = (+date - EPH.t0) / EPH.step;
  if (!(f >= 0 && f <= EPH.n - 1)) return null;
  const i = Math.min(Math.floor(f), EPH.n - 2), w = f - i, T = EPH[B];
  const vec = j => { const la = T.lat[j] * DEG, lo = T.lon[j] * DEG, d = T.dist[j]; return [d * Math.cos(la) * Math.cos(lo), d * Math.cos(la) * Math.sin(lo), d * Math.sin(la)]; };
  const a = vec(i), b = vec(i + 1), v = [a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w, a[2] + (b[2] - a[2]) * w];
  const d = Math.hypot(v[0], v[1], v[2]);
  return { lat: Math.asin(v[2] / d) / DEG, lon: Math.atan2(v[1], v[0]) / DEG, dist: d };
}
function sunAt(date) { return ephAt(date, "s") || sunApprox(date); }
function earthAt(date) { return ephAt(date, "e") || earthApprox(date); }
function sunApprox(date) {
  const d = date / DAY, age = (((d - NEW_MOON_2000) % SYNODIC) + SYNODIC) % SYNODIC;
  return { lon: wrap180(180 - 360 * age / SYNODIC), lat: 1.54 * Math.sin(2 * Math.PI * d / 346.62) };
}
function earthApprox(date) {
  const d = date / DAY;
  return { lon: 7.9 * Math.sin(2 * Math.PI * (d - 10) / 27.5546), lat: 6.68 * Math.sin(2 * Math.PI * (d - 3) / 27.2122) };
}

/* ---------- Crateri e rilievi (coordinate APPROSSIMATE) ---------- */
const CRATERS = [
  { name: "Shackleton",  lat: -89.67, lon: 129.2,  d: 21,  ice: true },
  { name: "de Gerlache", lat: -88.50, lon: -87.1,  d: 32,  ice: true },
  { name: "Sverdrup",    lat: -88.30, lon: -152.0, d: 32,  ice: true },
  { name: "Slater",      lat: -88.10, lon: 110.5,  d: 24,  ice: true },
  { name: "Shoemaker",   lat: -88.10, lon: 44.9,   d: 51,  ice: true },
  { name: "Faustini",    lat: -87.30, lon: 77.0,   d: 39,  ice: true },
  { name: "Haworth",     lat: -87.45, lon: -5.0,   d: 35,  ice: true },
  { name: "Cabeus",      lat: -85.30, lon: -42.1,  d: 98,  ice: true },
  { name: "Nobile",      lat: -85.20, lon: 53.5,   d: 73,  ice: true },
  { name: "Amundsen",    lat: -84.50, lon: 82.8,   d: 103, ice: true },
  { name: "Peary",       lat: 88.6,   lon: 33.0,   d: 73,  ice: true },
  { name: "Hermite",     lat: 86.0,   lon: -89.9,  d: 104, ice: true },
  { name: "Whipple",     lat: 89.1,   lon: 118.2,  d: 15,  ice: true },
  { name: "Rozhdestvenskiy", lat: 85.2, lon: -155.4, d: 177, ice: true },
  { name: "Tycho",       lat: -43.3,  lon: -11.2,  d: 85 },
  { name: "Copernicus",  lat: 9.6,    lon: -20.1,  d: 93 },
  { name: "Clavius",     lat: -58.4,  lon: -14.4,  d: 225 },
  { name: "Plato",       lat: 51.6,   lon: -9.4,   d: 101 },
  { name: "Aristarchus", lat: 23.7,   lon: -47.4,  d: 40 },
  { name: "Kepler",      lat: 8.1,    lon: -38.0,  d: 31 },
  { name: "Tsiolkovskiy", lat: -20.4, lon: 129.1,  d: 185 },
  { name: "Schrödinger", lat: -75.0,  lon: 132.4,  d: 312 },
];
const MASSIFS = [
  { name: "Malapert",    p: [[-86.0, 0]], r: 14, h: .8 },
  { name: "Mons Mouton", p: [[-84.6, 31]], r: 16, h: .85 },
  { name: "Connecting ridge", p: [[-89.5, -150], [-89.3, -138], [-89.1, -125], [-88.9, -112], [-88.75, -100]], r: 4, h: .75 },
  { name: "Peak near Shackleton", p: [[-88.8, 124]], r: 5, h: .7 },
];
const MARIA = [
  [33, -16, 16], [28, 17, 9], [8.5, 31, 10], [17, 59, 7], [-8, 51, 8], [-15, 35, 5], [-21, -17, 9],
  [18, -57, 20], [5, -45, 12], [-24, -39, 6], [56, 1, 7], [-10, -23, 5], [13, 4, 4], [7, -31, 6],
  [27, 148, 4], [-19, -93, 5], [3, 87, 5], [-14, 67, 3],
];


/* ---------- vettori e dati di evoluzione (bit per cella e per istante) ---------- */
const evoIdx = (E, t) => Math.max(0, Math.min(E.n - 1, Math.floor((+t - E.start) / (E.stepH * 36e5))));
const evoBit = (arr, E, ti, k) => { const b = ti * E.nc + k; return (arr[b >> 3] >> (7 - (b & 7))) & 1; };
const bodyVec = b => { const sb = Math.sin(b.lat * DEG), cb = Math.cos(b.lat * DEG); return [sb, cb * Math.cos(b.lon * DEG), cb * Math.sin(b.lon * DEG)]; };
// generatore pseudo-casuale con seme (stessi scenari a parità di seme)
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
