/* =====================================================================
   workspace.html – AREA SELECTION · globo 3D (WebGL, texture reale) + mappa 2D del Polo Sud
   - 3D: sfera ortografica disegnata dalla GPU (js/core/moon-gl.js, texture LROC 4k con rilievo LOLA).
   - Oltre una soglia di zoom vicino al Polo Sud si passa a una mappa 2D in stereografica polare:
     base = stessa texture riproiettata; dentro ogni sito la QUOTA REALE (DEM) come ombreggiatura.
   - Una sola tela di sovrapposizione (#globeCanvas) per reticolo, frecce N/E/S/W, anelli dei siti ed eventi.
   ===================================================================== */
const globeCanvas = document.getElementById("globeCanvas");
const gctx = globeCanvas.getContext("2d");
const globeWrap = document.getElementById("globeWrap");
const glCanvas = document.getElementById("globeGL");
const MOONV = createMoonView(glCanvas);          // WebGL: null-safe (MOONV.ok = false senza WebGL)
const poleCanvas = document.getElementById("poleCanvas"), pctx = poleCanvas.getContext("2d");
const GLOBE = { lat: -55, lon: 0, zoom: 1, mode: "rotate", sel: null };

const AS = {
  mode: "3d", W: 0, H: 0, dpr: 1,
  P: { cx: 0, cy: 0, s: 1, rot: 0 },            // 2D: centro (km, stereografica polare), px/km, meridiano in alto (°)
  zt: null, st: null, anchor: null,             // zoom morbido (3D: zt · 2D: st con punto fisso)
  anim: null, dirty: true, raf: 0, hover: null, hoverLL: null,
  gl: null, img: null, base: null, tiles: [], tilesKey: "",
};
const Z2D = 3.2, Z3MAX = 5, POLE_LAT = -70, RHO_MAX = 2 * MOON_R * Math.tan(10 * DEG);   // mappa 2D fino a 80°S… 70°S
const ringR = c => degToKm(c.r);                // raggio del sito in km

/* ---------- proiezioni ---------- */
const polFwd = (lat, lon) => { const r = 2 * MOON_R * Math.tan((90 + lat) / 2 * DEG), l = lon * DEG; return [r * Math.sin(l), r * Math.cos(l)]; };
const polInv = (x, y) => [2 * Math.atan(Math.hypot(x, y) / (2 * MOON_R)) / DEG - 90, Math.hypot(x, y) < 1e-9 ? 0 : Math.atan2(x, y) / DEG];
function r3() { return Math.min(AS.W, AS.H) / 2 * .9 * GLOBE.zoom; }
function g3(lat, lon) {                          // 3D: da lat/lon a schermo (px CSS) · z > 0 = lato visibile
  const p = lat * DEG, d = (lon - GLOBE.lon) * DEG, p0 = GLOBE.lat * DEG, R = r3();
  const z = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(d);
  const x = Math.cos(p) * Math.sin(d), y = Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(d);
  return { x: AS.W / 2 + x * R, y: AS.H / 2 - y * R, z, vis: z > 0 };
}
function s3(px, py) {                            // 3D: da schermo a lat/lon (o null fuori dal disco)
  const R = r3(), nx = (px - AS.W / 2) / R, ny = (AS.H / 2 - py) / R, r2 = nx * nx + ny * ny;
  if (r2 > 1) return null;
  const nz = Math.sqrt(1 - r2), sp = Math.sin(GLOBE.lat * DEG), cp = Math.cos(GLOBE.lat * DEG);
  return [Math.asin(nz * sp + ny * cp) / DEG, wrap180(GLOBE.lon + Math.atan2(nx, nz * cp - ny * sp) / DEG)];
}
function p2(x, y) {                              // 2D: da km (stereografica) a schermo
  const P = AS.P, t = P.rot * DEG, c = Math.cos(t), s = Math.sin(t), dx = x - P.cx, dy = y - P.cy;
  return { x: AS.W / 2 + (dx * c - dy * s) * P.s, y: AS.H / 2 - (dx * s + dy * c) * P.s };
}
function p2inv(px, py) {
  const P = AS.P, t = P.rot * DEG, c = Math.cos(t), s = Math.sin(t), u = (px - AS.W / 2) / P.s, v = (AS.H / 2 - py) / P.s;
  return [P.cx + u * c + v * s, P.cy - u * s + v * c];
}
const ll2 = (lat, lon) => { const [x, y] = polFwd(lat, lon); return p2(x, y); };
const isPolar = c => c.lat <= POLE_LAT + 2;

/* ---------- texture reale (2k subito, poi 4k) ---------- */
function asImage() {
  if (AS.imgP) return AS.imgP;
  AS.imgP = moonTexture(hi => { AS.img = hi; if (AS.base) { AS.base = null; if (AS.mode === "2d") asBuildBase(); } queueGlobe(); })
    .then(im => { AS.img = MOON_TEX.img || im; return AS.img; });
  return AS.imgP;
}
function asDraw3D() {
  if (!MOONV.ok) return;
  MOONV.draw({ cx: AS.W / 2, cy: AS.H / 2, R: r3(), dpr: AS.dpr, lat: GLOBE.lat, lon: GLOBE.lon, mode: 0 });
}

/* ---------- 2D: base della mappa polare (texture riproiettata) + DEM dei siti ---------- */
function asBuildBase() {
  if (AS.base || !AS.img) return;
  const TWs = AS.img.naturalWidth, THs = AS.img.naturalHeight, row0 = Math.floor((90 + 79) / 180 * THs), rows = THs - row0;
  const cv0 = document.createElement("canvas"); cv0.width = TWs; cv0.height = rows;
  const c0 = cv0.getContext("2d"); c0.drawImage(AS.img, 0, row0, TWs, rows, 0, 0, TWs, rows);
  const src = c0.getImageData(0, 0, TWs, rows).data;
  const N = 1400, cv = document.createElement("canvas"); cv.width = cv.height = N;
  const c = cv.getContext("2d"), im = c.createImageData(N, N), d = im.data, px = 2 * RHO_MAX / N;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const x = -RHO_MAX + (j + .5) * px, y = RHO_MAX - (i + .5) * px, rho = Math.hypot(x, y), o = (i * N + j) * 4;
    if (rho > RHO_MAX) { d[o + 3] = 0; continue; }
    const lat = 2 * Math.atan(rho / (2 * MOON_R)) / DEG - 90, lon = Math.atan2(x, y) / DEG;
    const fx = ((lon + 180) / 360 * TWs - .5 + TWs) % TWs, fy = Math.min(rows - 1.001, Math.max(0, (90 - lat) / 180 * THs - .5 - row0));
    const x0 = fx | 0, y0 = fy | 0, u = fx - x0, v = fy - y0, x1 = (x0 + 1) % TWs;
    const g = (src[(y0 * TWs + x0) * 4] * (1 - u) + src[(y0 * TWs + x1) * 4] * u) * (1 - v) + (src[((y0 + 1) * TWs + x0) * 4] * (1 - u) + src[((y0 + 1) * TWs + x1) * 4] * u) * v;
    const fade = Math.min(1, (RHO_MAX - rho) / (RHO_MAX * .05));
    d[o] = d[o + 1] = d[o + 2] = g * .92; d[o + 3] = 255 * fade;
  }
  c.putImageData(im, 0, 0);
  // la texture globale a queste latitudini ha pixel allungati: una leggera sfocatura isotropa evita le strisce
  const cb = document.createElement("canvas"); cb.width = cb.height = N;
  const b = cb.getContext("2d"); b.filter = MOON_TEX.hi ? "blur(2px)" : "blur(4px)"; b.drawImage(cv, 0, 0); b.filter = "none";
  AS.base = { cv: cb, ext: RHO_MAX };
}
// ombreggiatura del DEM reale di ogni sito (quota_m), interpolata e con bordo rotondo sfumato
function asBuildTiles() {
  const list = [...DATASETS.values()].filter(D => D.extra && D.extra.quota && D.pc && D.pc.lat === -90 && D.nx && D.step);
  const key = list.map(D => D.id).join("|");
  if (key === AS.tilesKey) return;
  AS.tilesKey = key; AS.tiles = [];
  for (const D of list) {
    const q = D.extra.quota, nx = D.nx, ny = D.ny, K = Math.max(4, Math.min(10, Math.round(320 / Math.max(nx, ny))));
    const W = (nx - 1) * K + 1, H = (ny - 1) * K + 1, st = D.step / K, Z = new Float32Array(W * H);
    let mean = 0, n = 0; for (const v of q) if (isFinite(v)) { mean += v; n++; } mean = n ? mean / n : 0;
    const at = (c, r) => { c = Math.max(0, Math.min(nx - 1, c)); r = Math.max(0, Math.min(ny - 1, r)); const v = q[r * nx + c]; return isFinite(v) ? v : mean; };
    const cr = (p0, p1, p2_, p3, t) => p1 + .5 * t * (p2_ - p0 + t * (2 * p0 - 5 * p1 + 4 * p2_ - p3 + t * (3 * (p1 - p2_) + p3 - p0)));   // Catmull-Rom
    for (let i = 0; i < H; i++) {
      const fr = i / K, r0 = Math.floor(fr), tr = fr - r0;
      for (let j = 0; j < W; j++) {
        const fc = j / K, c0 = Math.floor(fc), tc = fc - c0, row = k => cr(at(c0 - 1, k), at(c0, k), at(c0 + 1, k), at(c0 + 2, k), tc);
        Z[i * W + j] = cr(row(r0 - 1), row(r0), row(r0 + 1), row(r0 + 2), tr);
      }
    }
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const c = cv.getContext("2d"), im = c.createImageData(W, H), d = im.data, m = st * 1000;
    const az = 315 * DEG, el = 35 * DEG, lx = Math.sin(az) * Math.cos(el), ly = Math.cos(az) * Math.cos(el), lz = Math.sin(el);   // luce dall'alto a sinistra della griglia
    const cxp = (W - 1) / 2, cyp = (H - 1) / 2, rad = Math.min(cxp, cyp);
    for (let i = 0; i < H; i++) for (let j = 0; j < W; j++) {
      const k = i * W + j, o = k * 4;
      const qc = q[Math.min(ny - 1, Math.round(i / K)) * nx + Math.min(nx - 1, Math.round(j / K))];
      const dzx = (Z[i * W + Math.min(W - 1, j + 1)] - Z[i * W + Math.max(0, j - 1)]) / (2 * m) * 1.6;
      const dzy = (Z[Math.max(0, i - 1) * W + j] - Z[Math.min(H - 1, i + 1) * W + j]) / (2 * m) * 1.6;
      const nn = Math.hypot(dzx, dzy, 1), sh = Math.max(0, (-dzx * lx - dzy * ly + lz) / nn);
      const v = 28 + 205 * Math.pow(sh, .85);
      const rr = Math.hypot(j - cxp, i - cyp) / rad, a = Math.max(0, Math.min(1, (1.02 - rr) / .12));
      d[o] = d[o + 1] = d[o + 2] = v; d[o + 3] = isFinite(qc) ? 255 * a : 0;
    }
    c.putImageData(im, 0, 0);
    AS.tiles.push({ cv, x0: D.gx0, y0: D.gy0, w: (nx - 1) * D.step, h: (ny - 1) * D.step });
  }
}
function asDraw2D() {
  const c = pctx, P = AS.P, k = AS.dpr;
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, poleCanvas.width, poleCanvas.height);
  if (!AS.base) return;
  const t = P.rot * DEG;
  // trasformazione: km → px dispositivo
  c.setTransform(k, 0, 0, k, 0, 0);
  c.translate(AS.W / 2, AS.H / 2); c.scale(P.s, -P.s); c.rotate(t); c.translate(-P.cx, -P.cy);
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = "high";
  const e = AS.base.ext;
  c.save(); c.scale(1, -1); c.drawImage(AS.base.cv, -e, -e, 2 * e, 2 * e); c.restore();
  for (const T of AS.tiles) { c.save(); c.translate(T.x0, T.y0); c.scale(1, -1); c.drawImage(T.cv, 0, 0, T.w, T.h); c.restore(); }
  c.setTransform(1, 0, 0, 1, 0, 0);
}

/* ---------- sovrapposizioni (reticolo, frecce, anelli) ---------- */
const fmtLatS = v => `${Math.abs(v).toFixed(Math.abs(v % 1) > 1e-6 ? 1 : 0)}°${v >= 0 ? "N" : "S"}`;
const fmtLonS = v => { v = Math.round(wrap180(v)); return v === 0 || Math.abs(v) === 180 ? `${Math.abs(v)}°` : `${Math.abs(v)}°${v > 0 ? "E" : "W"}`; };
function asLabel(c, txt, x, y, col = "#cbd5e1", bg = "rgba(0,0,0,.6)", font = "500 11px 'IBM Plex Mono', ui-monospace, monospace") {
  c.font = font; const w = c.measureText(txt).width;
  c.fillStyle = bg; c.fillRect(x - w / 2 - 4, y - 8, w + 8, 16);
  c.fillStyle = col; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(txt, x, y + .5);
}
function asArrow(c, x, y, ang, lab, col, out = false) {   // freccia verso ang (rad, schermo: 0 = su); etichetta dentro o fuori
  const ux = Math.sin(ang), uy = -Math.cos(ang);
  c.save(); c.translate(x, y); c.rotate(ang);
  c.fillStyle = col; c.strokeStyle = "rgba(0,0,0,.75)"; c.lineWidth = 2;
  c.beginPath(); c.moveTo(0, -9); c.lineTo(6, 4); c.lineTo(0, 1); c.lineTo(-6, 4); c.closePath(); c.stroke(); c.fill();
  c.restore();
  c.font = "600 12px 'IBM Plex Sans', Inter, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
  const lx = out ? x + ux * 15 : x - ux * 16, ly = out ? y + uy * 15 : y - uy * 16;
  c.lineWidth = 3; c.strokeStyle = "rgba(0,0,0,.85)"; c.strokeText(lab, lx, ly);
  c.fillStyle = col; c.fillText(lab, lx, ly);
}
function asRings(c, toScr, scale) {                // anelli dei siti con etichette che non si sovrappongono
  const selId = PREF_COV || WS.coverageId, boxes = [];
  const order = [...COVERAGE].sort((a, b) => (b.id === selId) - (a.id === selId) || (b.id === AS.hover) - (a.id === AS.hover));
  for (const cov of order) {
    const s = toScr(cov); if (!s) continue;
    const sel = cov.id === selId, hov = cov.id === AS.hover, rpx = Math.max(sel ? 7 : 5, ringR(cov) * scale);
    c.lineWidth = sel ? 2.5 : hov ? 2 : 1.5;
    c.strokeStyle = sel ? "#7fd3ff" : hov ? "#ffffff" : "#4ade80";
    const fa = rpx > 40 ? .03 : rpx > 15 ? .07 : .12;            // da vicino il rilievo resta neutro
    c.fillStyle = sel ? `rgba(127,211,255,${fa + .02})` : `rgba(74,222,128,${fa})`;
    c.beginPath(); c.arc(s.x, s.y, rpx, 0, 2 * Math.PI); c.fill(); c.stroke();
    if (rpx < 9) { c.fillStyle = c.strokeStyle; c.beginPath(); c.arc(s.x, s.y, 2, 0, 2 * Math.PI); c.fill(); }
    c.font = "500 11px 'IBM Plex Sans', Inter, sans-serif";
    const lab = cov.name, w = c.measureText(lab).width, ly = s.y - rpx - 10, bx = [s.x - w / 2 - 5, ly - 8, w + 10, 16];
    if (!sel && !hov && boxes.some(q => bx[0] < q[0] + q[2] && q[0] < bx[0] + bx[2] && bx[1] < q[1] + q[3] && q[1] < bx[1] + bx[3])) continue;
    boxes.push(bx);
    asLabel(c, lab, s.x, ly, sel ? "#bae6fd" : hov ? "#fff" : "#86efac", "rgba(10,12,15,.78)", c.font);
  }
}
function asOverlay3D(c) {
  const R = r3(), cx = AS.W / 2, cy = AS.H / 2;
  const poly = (pts, col, w) => {
    c.strokeStyle = col; c.lineWidth = w; c.beginPath(); let pen = false;
    for (const [la, lo] of pts) { const s = g3(la, lo); if (!s.vis) { pen = false; continue; } pen ? c.lineTo(s.x, s.y) : c.moveTo(s.x, s.y); pen = true; }
    c.stroke();
  };
  const dLa = GLOBE.zoom > 2.2 ? 5 : 10, dLo = GLOBE.zoom > 2.2 ? 15 : 30;
  for (let la = -90 + dLa; la < 90; la += dLa) { const p = []; for (let lo = -180; lo <= 180; lo += 2) p.push([la, lo]); poly(p, la === 0 ? "rgba(255,255,255,.28)" : "rgba(255,255,255,.13)", 1); }
  for (let lo = -180; lo < 180; lo += dLo) { const p = []; for (let la = -90; la <= 90; la += 1) p.push([la, lo]); poly(p, lo === 0 ? "rgba(255,255,255,.28)" : "rgba(255,255,255,.13)", 1); }
  // etichette: paralleli lungo il meridiano centrale, meridiani lungo il parallelo centrale
  const midLa = Math.max(-80, Math.min(80, Math.round(GLOBE.lat / dLa) * dLa + dLa / 2));
  const labLa = dLa === 10 ? 30 : 10, clear = s => !asBusy(s.x, s.y);
  for (let la = -90 + labLa; la < 90; la += labLa) { const s = g3(la, GLOBE.lon + 1e-3); if (s.z > .35 && clear(s)) asLabel(c, fmtLatS(la), s.x, s.y); }
  for (let lo = -180; lo < 180; lo += dLo) { const s = g3(midLa, lo); if (s.z > .35 && clear(s)) asLabel(c, fmtLonS(lo), s.x, s.y); }
  // polo sud / nord quando visibili
  for (const [la, lab] of [[-90, t("asSouthPole")], [90, t("asNorthPole")]]) {
    const s = g3(la, 0); if (!s.vis) continue;
    c.fillStyle = "#fff"; c.beginPath(); c.arc(s.x, s.y, 3, 0, 2 * Math.PI); c.fill();
    if (la > 0 || GLOBE.zoom > 2.4) asLabel(c, lab, s.x, s.y + 14, "#e5e7eb");
  }
  { const s = g3(0, 0); if (s.z > .15) { c.fillStyle = "#38bdf8"; c.beginPath(); c.arc(s.x, s.y, 3.5, 0, 2 * Math.PI); c.fill(); asLabel(c, t("subEarth"), s.x, s.y - 14, "#bae6fd"); } }
  asRings(c, cov => { const s = g3(cov.lat, cov.lon); return s.z > -.02 ? s : null; }, R / MOON_R);
  // frecce N / E / S / W FUORI dal disco (al centro della vista il nord è sempre in alto); se la Luna riempie la vista: rosa nell'angolo
  const out = R + 16;
  if (out + 26 < Math.min(AS.W, AS.H) / 2) {
    asArrow(c, cx, cy - out, 0, "N", "#fde047", true); asArrow(c, cx + out, cy, Math.PI / 2, "E", "#e5e7eb", true);
    asArrow(c, cx, cy + out, Math.PI, "S", "#e5e7eb", true); asArrow(c, cx - out, cy, -Math.PI / 2, "W", "#e5e7eb", true);
  } else asCompass(c, 0);
}
function asCompass(c, northAng) {                  // rosa N/E/S/W in alto a destra (vista ingrandita)
  const x = AS.W - 54, y = 62;
  c.fillStyle = "rgba(10,12,15,.6)"; c.beginPath(); c.arc(x, y, 34, 0, 2 * Math.PI); c.fill();
  c.strokeStyle = "rgba(255,255,255,.18)"; c.lineWidth = 1; c.stroke();
  const d = 20;
  [["N", 0, "#fde047"], ["E", Math.PI / 2, "#e5e7eb"], ["S", Math.PI, "#e5e7eb"], ["W", -Math.PI / 2, "#e5e7eb"]].forEach(([lab, a, col]) => {
    const g = northAng + a; asArrow(c, x + Math.sin(g) * d * .45, y - Math.cos(g) * d * .45, g, lab, col, true);
  });
}
// zone occupate da riquadri fissi (modalità, coordinate, bussola, profilo): niente etichette lì sotto
function asBusy(x, y) {
  const r = (el, padX = 10, padY = 10) => { if (!el) return false; const a = el.getBoundingClientRect(), b = globeWrap.getBoundingClientRect();
    return x > a.left - b.left - padX && x < a.right - b.left + padX && y > a.top - b.top - padY && y < a.bottom - b.top + padY; };
  return r(document.querySelector("#globeWrap .as-mode"), 30) || r(document.getElementById("globeHover"), 30)
    || (x > AS.W - 110 && y < 112) || (x > AS.W - 80 && y > AS.H - 70);
}
function asOverlay2D(c) {
  const P = AS.P;
  // reticolo: paralleli ogni 1° (0,5° molto vicino), meridiani ogni 15° (5° vicino)
  const dLa = P.s > 6 ? .5 : 1, dLo = P.s > 2.5 ? 5 : 15;
  const pole = p2(0, 0), cornerD = Math.max(...[[0, 0], [AS.W, 0], [0, AS.H], [AS.W, AS.H]].map(([x, y]) => Math.hypot(x - pole.x, y - pole.y))) / P.s;
  const nearD = Math.max(0, Math.hypot(...p2inv(AS.W / 2, AS.H / 2)) - Math.hypot(AS.W, AS.H) / 2 / P.s);
  c.lineWidth = 1;
  for (let la = -90 + dLa; la <= -70; la += dLa) {
    const rho = 2 * MOON_R * Math.tan((90 + la) / 2 * DEG); if (rho > cornerD || rho < nearD) continue;
    c.strokeStyle = Math.abs(la % 5) < 1e-6 ? "rgba(255,255,255,.3)" : "rgba(255,255,255,.14)";
    c.beginPath(); c.arc(pole.x, pole.y, rho * P.s, 0, 2 * Math.PI); c.stroke();
  }
  for (let lo = -180; lo < 180; lo += dLo) {
    const [x1, y1] = polFwd(-70, lo), e = p2(x1, y1);
    c.strokeStyle = lo % 90 === 0 ? "rgba(255,255,255,.3)" : "rgba(255,255,255,.14)";
    c.beginPath(); c.moveTo(pole.x, pole.y); c.lineTo(e.x, e.y); c.stroke();
  }
  // etichette dei meridiani sul bordo dello schermo; dei paralleli lungo il raggio che passa per il centro
  const pad = 16;
  for (let lo = -180; lo < 180; lo += dLo) {
    const [x1, y1] = polFwd(-70, lo), e = p2(x1, y1), dx = e.x - pole.x, dy = e.y - pole.y;
    let tMax = 1;
    for (const [n, lim, a0] of [[dx, AS.W - pad, pole.x], [-dx, -pad, -pole.x], [dy, AS.H - pad, pole.y], [-dy, -pad, -pole.y]]) if (n > 1e-9) tMax = Math.min(tMax, (lim - a0) / n);
    if (tMax <= 0) continue;
    const x = pole.x + dx * tMax, y = pole.y + dy * tMax;
    if (x < pad - 1 || x > AS.W - pad + 1 || y < pad - 1 || y > AS.H - pad + 1) continue;
    if (Math.hypot(x - pole.x, y - pole.y) < 40 || asBusy(x, y)) continue;
    asLabel(c, fmtLonS(lo), x, y);
  }
  const mid = p2inv(AS.W / 2, AS.H / 2), midR = Math.hypot(mid[0], mid[1]);
  let dir;
  if (midR > 30 / P.s) dir = [mid[0] / midR, mid[1] / midR];
  else { const q = p2inv(AS.W / 2 + 1, AS.H / 2 - 1), dl = Math.hypot(q[0] - mid[0], q[1] - mid[1]) || 1; dir = [(q[0] - mid[0]) / dl, (q[1] - mid[1]) / dl]; }
  for (let la = -90 + dLa; la <= -70; la += dLa) {
    if (dLa < 1 && Math.abs(la % 1) > 1e-6 && P.s < 12) continue;
    const rho = 2 * MOON_R * Math.tan((90 + la) / 2 * DEG), s = p2(dir[0] * rho, dir[1] * rho);
    if (s.x < 30 || s.x > AS.W - 30 || s.y < 24 || s.y > AS.H - 24 || asBusy(s.x, s.y)) continue;
    asLabel(c, fmtLatS(la), s.x, s.y);
  }
  if (pole.x > -20 && pole.x < AS.W + 20 && pole.y > -20 && pole.y < AS.H + 20) {
    c.strokeStyle = "#fff"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(pole.x - 6, pole.y); c.lineTo(pole.x + 6, pole.y); c.moveTo(pole.x, pole.y - 6); c.lineTo(pole.x, pole.y + 6); c.stroke();
    asLabel(c, t("asSouthPole"), pole.x, pole.y + 16, "#e5e7eb");
  }
  asRings(c, cov => isPolar(cov) ? ll2(cov.lat, cov.lon) : null, P.s);
  // nord al centro della vista = lontano dal polo
  const cdx = AS.W / 2 - pole.x, cdy = AS.H / 2 - pole.y;
  asCompass(c, Math.hypot(cdx, cdy) > 20 ? Math.atan2(cdx, -cdy) : 0);
  // barra di scala
  const target = 120 / P.s, steps = [.5, 1, 2, 5, 10, 20, 50, 100, 200], L = steps.reduce((a, b) => Math.abs(b - target) < Math.abs(a - target) ? b : a);
  const bw = L * P.s, bx = AS.W - 78 - bw, by = AS.H - 22;
  c.strokeStyle = "#e5e7eb"; c.lineWidth = 2; c.beginPath(); c.moveTo(bx, by - 5); c.lineTo(bx, by); c.lineTo(bx + bw, by); c.lineTo(bx + bw, by - 5); c.stroke();
  asLabel(c, `${L} km`, bx + bw / 2, by - 12, "#e5e7eb", "rgba(0,0,0,0)");
}

/* ---------- ciclo di disegno ---------- */
function asResize() {
  const W = globeWrap.clientWidth, H = globeWrap.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (W === AS.W && H === AS.H && dpr === AS.dpr) return;
  AS.W = W; AS.H = H; AS.dpr = dpr;
  for (const cv of [glCanvas, poleCanvas, globeCanvas]) { cv.width = Math.max(1, Math.round(W * dpr)); cv.height = Math.max(1, Math.round(H * dpr)); }
}
function queueGlobe() { AS.dirty = true; if (!AS.raf) AS.raf = requestAnimationFrame(asFrame); }
function asFrame(now) {
  AS.raf = 0;
  asResize();
  let more = false;
  if (AS.anim) more = asStepAnim(now) || more;
  if (AS.mode === "3d" && AS.zt != null) {
    const r = AS.zt / GLOBE.zoom;
    if (Math.abs(Math.log(r)) < 2e-3) { GLOBE.zoom = AS.zt; AS.zt = null; } else { GLOBE.zoom *= Math.pow(r, .25); more = true; }
    asCheckSwitch();
  } else if (AS.mode === "2d" && AS.st != null) {
    const r = AS.st / AS.P.s, a = AS.anchor;
    const before = a && p2inv(a.x, a.y);
    if (Math.abs(Math.log(r)) < 2e-3) { AS.P.s = AS.st; AS.st = null; } else { AS.P.s *= Math.pow(r, .25); more = true; }
    if (a) { const after = p2inv(a.x, a.y); AS.P.cx += before[0] - after[0]; AS.P.cy += before[1] - after[1]; }
    asClampPan(); asCheckSwitch();
  }
  if (AS.dirty || more) {
    AS.dirty = false;
    if (AS.mode === "3d") asDraw3D(); else asDraw2D();
    const c = gctx; c.setTransform(AS.dpr, 0, 0, AS.dpr, 0, 0); c.clearRect(0, 0, AS.W, AS.H);
    if (AS.mode === "3d") asOverlay3D(c); else asOverlay2D(c);
    asReadout();
  }
  if (more) AS.raf = requestAnimationFrame(asFrame);
}
function asReadout() {
  const el = document.getElementById("globeHover"), ll = AS.hoverLL;
  const res = AS.mode === "3d" ? MOON_R / r3() : 1 / AS.P.s;
  const f = v => (v >= 0 ? " " : "") + v.toFixed(4);
  el.innerHTML = `<span><i>LAT</i>${ll ? f(ll[0]) : "—"}</span><span><i>LON</i>${ll ? f(ll[1]) : "—"}</span><span><i>RES</i>${res >= 1 ? res.toFixed(2) + " km/px" : (res * 1000).toFixed(0) + " m/px"}</span>`;
  const m = document.getElementById("asModeLbl"); if (m) m.textContent = t(AS.mode === "3d" ? "asMode3d" : "asMode2d");
  const b = document.getElementById("asModeBtn"); if (b) b.textContent = t(AS.mode === "3d" ? "asTo2d" : "asTo3d");
}

/* ---------- passaggio 3D ⇄ 2D ---------- */
function asEnter2D(from3d = true) {
  asBuildBase(); asBuildTiles();
  if (!AS.base) return false;
  if (from3d) {
    const [x, y] = polFwd(Math.min(GLOBE.lat, -60), GLOBE.lon);
    AS.P = { cx: x, cy: y, s: r3() / MOON_R, rot: GLOBE.lon };
    if (AS.zt != null) { AS.st = AS.P.s * AS.zt / GLOBE.zoom; AS.anchor = null; AS.zt = null; }
  }
  AS.mode = "2d"; globeWrap.classList.add("as-2d"); asClampPan(); queueGlobe(); return true;
}
function asEnter3D() {
  const [la, lo] = polInv(AS.P.cx, AS.P.cy), near = Math.hypot(AS.P.cx, AS.P.cy) < 30;
  GLOBE.lat = la; GLOBE.lon = near ? AS.P.rot : lo;
  GLOBE.zoom = Math.min(Z2D * .97, AS.P.s * MOON_R / (Math.min(AS.W, AS.H) / 2 * .9));
  AS.st = null; AS.anchor = null;
  AS.mode = "3d"; globeWrap.classList.remove("as-2d"); queueGlobe();
}
function asCheckSwitch() {
  if (AS.anim) return;
  if (AS.mode === "3d") {
    if (GLOBE.zoom >= Z2D && GLOBE.lat <= POLE_LAT && AS.base !== false) { if (!asEnter2D(true)) GLOBE.zoom = Math.min(GLOBE.zoom, Z3MAX); }
    else if (GLOBE.zoom > Z3MAX) { GLOBE.zoom = Z3MAX; AS.zt = null; }
  } else {
    const sMin = Z2D * .8 * Math.min(AS.W, AS.H) / 2 * .9 / MOON_R;
    if (AS.P.s < sMin && AS.st == null) asEnter3D();
    else if (AS.P.s < sMin * .7) { AS.st = null; asEnter3D(); }
  }
}
function asClampPan() {
  const P = AS.P, r = Math.hypot(P.cx, P.cy), lim = RHO_MAX * .9;
  if (r > lim) { P.cx *= lim / r; P.cy *= lim / r; }
  P.s = Math.max(.02, Math.min(90, P.s)); if (AS.st != null) AS.st = Math.max(.02, Math.min(90, AS.st));
}

/* ---------- animazioni (volo verso un sito) ---------- */
const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
function asAnimate(kind, to, dur, done) {
  const from = kind === "3d" ? { lat: GLOBE.lat, lon: GLOBE.lon, z: Math.log(GLOBE.zoom) } : { x: AS.P.cx, y: AS.P.cy, z: Math.log(AS.P.s), rot: AS.P.rot };
  if (kind === "3d") to = { ...to, lon: from.lon + wrap180(to.lon - from.lon), z: Math.log(to.zoom) };
  else to = { ...to, z: Math.log(to.s), rot: to.rot == null ? from.rot : from.rot + wrap180(to.rot - from.rot) };
  AS.zt = AS.st = AS.anchor = null;
  AS.anim = { kind, from, to, t0: performance.now(), dur, done };
  queueGlobe();
}
function asStepAnim(now) {
  const A = AS.anim, u = Math.min(1, (now - A.t0) / A.dur), e = ease(u), L = (a, b) => a + (b - a) * e;
  if (A.kind === "3d") {
    // arco: si allontana un poco a metà strada se il volo è lungo
    const dist = angDeg(unit(A.from.lat, A.from.lon), unit(A.to.lat, A.to.lon)), dip = Math.min(.5, dist / 120) * Math.sin(Math.PI * e);
    GLOBE.lat = L(A.from.lat, A.to.lat); GLOBE.lon = wrap180(L(A.from.lon, A.to.lon)); GLOBE.zoom = Math.exp(L(A.from.z, A.to.z) - dip);
  } else {
    // centro interpolato nel sistema ruotato: il sito resta in vista mentre la mappa gira
    AS.P.rot = L(A.from.rot, A.to.rot); AS.P.s = Math.exp(L(A.from.z, A.to.z));
    AS.P.cx = L(A.from.x, A.to.x); AS.P.cy = L(A.from.y, A.to.y);
  }
  AS.dirty = true;
  if (u >= 1) { const d = A.done; AS.anim = null; if (d) d(); return true; }
  return true;
}
function asFly(c) {
  if (!c) return;
  const fit = Math.min(AS.W || 600, AS.H || 600) * .3 / Math.max(.3, ringR(c));
  if (isPolar(c) && AS.base !== false) {
    const [x, y] = polFwd(c.lat, c.lon);
    if (AS.mode === "2d") { asAnimate("2d", { x, y, s: Math.min(60, fit), rot: c.lon }, 1000); return; }
    asAnimate("3d", { lat: c.lat, lon: c.lon, zoom: Z2D }, 1000, () => {
      if (asEnter2D(true)) asAnimate("2d", { x, y, s: Math.min(60, fit), rot: c.lon }, 900);
    });
  } else {
    if (AS.mode === "2d") asEnter3D();
    asAnimate("3d", { lat: c.lat, lon: c.lon, zoom: Math.min(Z3MAX, Math.max(1.4, Math.min(AS.W, AS.H) * .25 / (ringR(c) / MOON_R * Math.min(AS.W, AS.H) / 2 * .9))) }, 1100);
  }
}

/* ---------- elenco dei siti ---------- */
function focusCoverage() {
  document.getElementById("globeEmpty").hidden = COVERAGE.length > 0;
  if (!COVERAGE.length) return;
  if (!(GLOBE.sel && selCheck(GLOBE.sel).ok)) selectCoverage(COVERAGE.find(x => x.source !== "demo") || COVERAGE[0], false);
}
function renderCoverageList() {
  const ul = document.getElementById("covList"), n = document.getElementById("covCount");
  if (n) n.textContent = COVERAGE.length ? String(COVERAGE.length) : "";
  if (!COVERAGE.length) {
    const k = location.protocol === "file:" ? "covNoServer" : "covEmpty";
    ul.innerHTML = `<li class="cov-empty">${esc(t(k))}</li>`;
    const p = document.querySelector("#globeEmpty p"); if (p) p.textContent = t(k);
    return;
  }
  const selId = PREF_COV || WS.coverageId;
  ul.innerHTML = COVERAGE.map(c => `
    <li class="${selId === c.id ? "sel" : ""}"><button class="go" data-cov="${esc(c.id)}" title="${esc(fmtLL(c.lat, c.lon))}">
      <span class="nm">${esc(c.name)}</span><span class="km">Ø ≈ ${(2 * ringR(c)).toFixed(0)} km</span></button>
      ${c.source === "import" ? `<button class="rm" data-rm="${esc(c.id)}" title="${esc(t("removeData"))}" aria-label="${esc(t("removeData"))}">✕</button>` : ""}</li>`).join("");
}
document.getElementById("covList").addEventListener("click", async e => {
  const rm = e.target.closest("[data-rm]");
  if (rm) {
    const id = rm.dataset.rm, i = COVERAGE.findIndex(c => c.id === id);
    if (i >= 0) COVERAGE.splice(i, 1);
    DATASETS.delete(id);
    try {
      const ids = ((await Store.get("datasets")) || []).filter(x => x !== id);
      await Store.set("datasets", ids); await Store.set("dataset:" + id, null);
    } catch (err) {}
    renderCoverageList(); updateSelUI(); queueGlobe();
    return;
  }
  const b = e.target.closest("[data-cov]"); if (!b) return;
  const c = covById(b.dataset.cov); if (c) selectCoverage(c);
});
const dataFile = document.getElementById("dataFile"), dataMsg = document.getElementById("dataMsg");
document.getElementById("btnImportData").addEventListener("click", () => dataFile.click());
document.getElementById("btnImportData2").addEventListener("click", () => dataFile.click());
document.getElementById("btnAsHelp").addEventListener("click", () => {
  const h = document.getElementById("asHelp"), b = document.getElementById("btnAsHelp");
  h.hidden = !h.hidden; b.setAttribute("aria-expanded", String(!h.hidden));
});
dataFile.addEventListener("change", async () => {
  const f = dataFile.files[0]; dataFile.value = "";
  if (!f) return;
  dataMsg.style.color = "";
  try {
    const D = parseDataset(JSON.parse(await f.text()), "import");
    const dup = builtinByName(D.name);
    if (dup) { dataMsg.style.color = "var(--ok)"; dataMsg.textContent = t("dataBuiltin", { n: dup.name }); selectCoverage(dup); return; }
    DATASETS.set(D.id, D); COVERAGE.push(covFromDataset(D));
    await storeDataset(D);
    dataMsg.style.color = "var(--ok)"; dataMsg.textContent = t("dataImported", { n: D.name });
    document.getElementById("globeEmpty").hidden = true; PREF_COV = D.id;
    selectCoverage(covById(D.id));
  } catch (err) {
    dataMsg.style.color = "var(--danger)"; dataMsg.textContent = t("dataErr", { e: err.message || "?" });
  }
});

/* ---------- selezione e validazione (dimensione + copertura dati) ---------- */
function updateSelUI() {
  const s = GLOBE.sel, info = document.getElementById("selInfo"), st = document.getElementById("selStatus");
  const btnOk = document.getElementById("btnConfirmArea");
  if (!s) { info.textContent = t("selNone"); st.textContent = ""; btnOk.disabled = true; return; }
  const chk = selCheck(s), cov = chk.cov || covById(PREF_COV);
  info.innerHTML = `<b>${esc(cov ? cov.name : t("selTitle"))}</b><span>${fmtLL(s.lat, s.lon)} · Ø ≈ ${(2 * degToKm(s.r)).toFixed(0)} km</span>`;
  st.className = "sel-status " + (chk.ok ? "ok" : "bad");
  st.textContent = chk.ok ? "" : chk.code === "noData" ? t("noData")
    : chk.code === "tooBig" ? t("tooBig", { m: AREA_LIMITS.maxDeg, km: degToKm(AREA_LIMITS.maxDeg).toFixed(0) })
    : chk.code === "outside" ? t("outside", { m: chk.fit.toFixed(2) })
    : chk.code === "edge" ? t("edge") : t("tooSmall", { m: AREA_LIMITS.minDeg });
  btnOk.disabled = !chk.ok;
}
function setSelection(sel, recenter) {
  GLOBE.sel = sel;
  if (recenter && AS.mode === "3d" && !AS.anim) { GLOBE.lon = sel.lon; }
  updateSelUI(); queueGlobe();
}
const maxSelAt = (lat, lon) => { const m = maxRadiusAt(lat, lon); return m >= AREA_LIMITS.minDeg ? m : AREA_LIMITS.maxDeg; };
function selectCoverage(c, fly = true) {        // l'area selezionata è sempre l'intero sito con dati
  if (!c) return;
  PREF_COV = c.id;
  setSelection({ lat: c.lat, lon: c.lon, r: c.r }, !fly);
  renderCoverageList();
  if (fly) asFly(c);
}
function coverageAtScreen(px, py) {             // sito sotto il cursore (px CSS rispetto alla mappa)
  let best = null, bd = Infinity;
  for (const c of COVERAGE) {
    let s, scale;
    if (AS.mode === "3d") { s = g3(c.lat, c.lon); if (s.z < -.02) continue; scale = r3() / MOON_R; }
    else { if (!isPolar(c)) continue; s = ll2(c.lat, c.lon); scale = AS.P.s; }
    const rpx = Math.max(12, ringR(c) * scale), d = Math.hypot(px - s.x, py - s.y);
    if (d <= rpx && d < bd) { bd = d; best = c; }
  }
  return best;
}

/* ---------- puntatore, rotella, tastiera ---------- */
let gDrag = null;
const locXY = e => { const r = globeCanvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
globeCanvas.addEventListener("pointerdown", e => {
  globeCanvas.setPointerCapture(e.pointerId);
  const [x, y] = locXY(e);
  gDrag = { x, y, x0: x, y0: y }; AS.anim = null;
  globeCanvas.classList.add("dragging");
});
globeCanvas.addEventListener("pointermove", e => {
  const [x, y] = locXY(e);
  if (!gDrag) {
    AS.hoverLL = AS.mode === "3d" ? s3(x, y) : polInv(...p2inv(x, y));
    const cov = coverageAtScreen(x, y), id = cov ? cov.id : null;
    globeCanvas.style.cursor = cov ? "pointer" : "";
    if (id !== AS.hover) { AS.hover = id; queueGlobe(); } else asReadout();
    return;
  }
  if (globeCanvas._pinch) return;
  const dx = x - gDrag.x, dy = y - gDrag.y; gDrag.x = x; gDrag.y = y;
  if (AS.mode === "3d") {
    const R = r3();
    GLOBE.lon = wrap180(GLOBE.lon - dx / R / DEG / Math.max(.35, GLOBE.zoom > 2 ? Math.cos(GLOBE.lat * DEG) : 1));
    GLOBE.lat = Math.max(-90, Math.min(90, GLOBE.lat + dy / R / DEG));
    asCheckSwitch();
  } else {
    const t0 = AS.P.rot * DEG, c = Math.cos(t0), s = Math.sin(t0), u = dx / AS.P.s, v = -dy / AS.P.s;
    AS.P.cx -= u * c + v * s; AS.P.cy -= -u * s + v * c; asClampPan();
  }
  queueGlobe();
});
const endDrag = e => {
  if (!gDrag) return;
  const [x, y] = locXY(e), click = e.type === "pointerup" && Math.hypot(x - gDrag.x0, y - gDrag.y0) < 5;
  gDrag = null; globeCanvas.classList.remove("dragging");
  const c = click && coverageAtScreen(x, y);
  if (c) selectCoverage(c); else queueGlobe();
};
globeCanvas.addEventListener("pointerup", endDrag);
globeCanvas.addEventListener("pointercancel", endDrag);
globeCanvas.addEventListener("pointerleave", () => { if (AS.hover || AS.hoverLL) { AS.hover = null; AS.hoverLL = null; queueGlobe(); } });
function asZoomBy(f, ax, ay) {
  AS.anim = null;
  if (AS.mode === "3d") { AS.zt = Math.max(.8, Math.min(Z3MAX * 1.05, (AS.zt ?? GLOBE.zoom) * f)); }
  else { AS.st = Math.max(.02, Math.min(90, (AS.st ?? AS.P.s) * f)); AS.anchor = ax == null ? null : { x: ax, y: ay }; }
  queueGlobe();
}
globeCanvas.addEventListener("wheel", e => {
  e.preventDefault();
  const [x, y] = locXY(e), dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
  asZoomBy(Math.exp(-dy * .0018), x, y);
}, { passive: false });
document.getElementById("asModeBtn").addEventListener("click", () => {
  AS.anim = null;
  if (AS.mode === "3d") {
    const c = covById(PREF_COV), polar = c && isPolar(c);
    if (!asEnter2D(false)) return;
    const [x, y] = polar ? polFwd(c.lat, c.lon) : [0, 0];
    AS.P = { cx: 0, cy: 0, s: Math.min(AS.W, AS.H) / 2 / 160, rot: 0 };
    if (polar) asAnimate("2d", { x, y, s: Math.min(60, Math.min(AS.W, AS.H) * .3 / Math.max(.3, ringR(c))), rot: c.lon }, 1000);
  } else { asEnter3D(); asAnimate("3d", { lat: -60, lon: GLOBE.lon, zoom: 1 }, 900); }
});

/* ---------- avvio ---------- */
function asStart() {
  asImage().then(img => {
    if (!img) return;
    if (!MOONV.ok && AS.mode === "3d") { document.getElementById("asModeBtn").hidden = true; asEnter2D(false); AS.P = { cx: 0, cy: 0, s: Math.min(AS.W || 600, AS.H || 600) / 2 / 160, rot: 0 }; }
    if (AS.mode === "2d") asBuildTiles();
    queueGlobe();
  });
}

const confirmBox = document.getElementById("confirmBox");
document.getElementById("btnConfirmArea").addEventListener("click", () => {
  const s = GLOBE.sel, chk = selCheck(s);
  if (!chk.ok) return updateSelUI();
  document.getElementById("confirmText").textContent =
    t("confirmText", { c: fmtLL(s.lat, s.lon), r: s.r.toFixed(2), km: degToKm(s.r).toFixed(0), n: chk.cov.name });
  confirmBox.classList.add("show");
  document.getElementById("btnConfirmYes").focus();
});
document.getElementById("btnConfirmNo").addEventListener("click", () => confirmBox.classList.remove("show"));
document.getElementById("btnConfirmYes").addEventListener("click", async () => {
  const s = GLOBE.sel, chk = selCheck(s);
  if (!chk.ok) return confirmBox.classList.remove("show");
  const changed = !WS.region || WS.coverageId !== chk.cov.id;
  applyRegion({ lat: s.lat, lon: s.lon, r: s.r }, chk.cov.id);
  if (changed) WS.offsetH = 0;
  await saveParams(true);
  // la pagina di analisi riceve il sito nell'indirizzo: si può anche aprire o condividere direttamente
  location.href = "analysis.html?site=" + encodeURIComponent(chk.cov.source === "builtin" ? chk.cov.name : chk.cov.id);
});
document.addEventListener("keydown", e => { if (e.key === "Escape") confirmBox.classList.remove("show"); });

let resizeTimer = null;
new ResizeObserver(() => { clearTimeout(resizeTimer); resizeTimer = setTimeout(queueGlobe, 60); }).observe(globeWrap);

/* ---------- telefono: zoom con + / − e pizzico ---------- */
const zGlobe = f => { if (f !== 1) asZoomBy(f, AS.W / 2, AS.H / 2); };
zoomCtl("globeWrap", zGlobe); pinch(globeCanvas, zGlobe);

/* ---------- guided tour of this page (the analysis page has its own) ---------- */
const TOUR_STEPS = [{ k: 0 }, { k: 1, sel: "#globeCanvas" }, { k: 2, sel: "#globeWrap" }, { k: 3, sel: "#covList" },
  { k: 4, sel: "#btnImportData" }, { k: 5, sel: "#selInfo" }, { k: 6, sel: "#btnConfirmArea" }];
document.getElementById("btnGuide").addEventListener("click", () => tourStart(TOUR_STEPS));

onLang(() => { updateSelUI(); renderCoverageList(); queueGlobe(); });

(async function start() {
  await loadSavedParams();
  await loadSites();
  if (WS.region) {
    if (!covById(WS.coverageId)) WS.coverageId = (coverageFor(WS.region.lat, WS.region.lon, WS.region.r) || { cov: {} }).cov.id || null;
    PREF_COV = WS.coverageId;
    REGION = { ...WS.region };
    GLOBE.sel = { ...WS.region };
    GLOBE.lat = WS.region.lat; GLOBE.lon = WS.region.lon;
  }
  document.getElementById("globeBusy").classList.remove("show");
  updateSelUI(); renderCoverageList(); focusCoverage();
  asStart(); queueGlobe();
})();
landBoot();
