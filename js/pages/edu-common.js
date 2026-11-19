/* =====================================================================
   Educational Edition – shared by history / reasoning / mission / deep-dive pages
   globe (WebGL), polar grid maps of the demo area, intro cards
   ===================================================================== */
/* ---------- Globo generico: Luna in WebGL (js/core/moon-gl.js) + tela 2D per reticolo e marcatori ---------- */
function drawSphere(cv, st) {
  // le due tele (Luna WebGL sotto, marcatori sopra) coprono tutto il riquadro: ingrandendo, la Luna esce dal quadrato senza tagli
  const wrap = cv.parentElement, W = wrap.clientWidth, H = wrap.clientHeight;
  const maxW = st.maxWidthFrac ? W * st.maxWidthFrac : W;
  const css = Math.max(220, Math.min(maxW, H) - 24);
  const dpr = Math.min(window.devicePixelRatio || 1, 2), k = dpr;
  const SW = Math.round(W * dpr), SH = Math.round(H * dpr);
  if (cv.width !== SW || cv.height !== SH) { cv.width = SW; cv.height = SH; }
  const c = cv.getContext("2d"), Rd = css * dpr / 2 * .86 * (st.zoom || 1);
  const cx = (Math.min(24, W * .03) + css / 2) * dpr, cy = SH / 2;
  st.geom = { S: SW, k, Rd, cx, cy };
  if (!st.gl && st.glCanvas) st.gl = createMoonView(st.glCanvas);
  if (st.gl && st.gl.ok) {
    const g = st.glCanvas;
    if (g.width !== SW || g.height !== SH) { g.width = SW; g.height = SH; }
    st.gl.draw({ cx: cx / k, cy: cy / k, R: Rd / k, dpr: k, lat: st.lat, lon: st.lon, mode: 1 });
    if (!st.glHooked) { st.glHooked = true; moonTexture(() => st.redraw && st.redraw()); st.gl.ready.then(() => st.redraw && st.redraw()); }
  }
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, SW, SH);
  // reticolo leggero + marcatori
  c.save(); c.lineWidth = k; c.strokeStyle = "rgba(255,255,255,.07)";
  const poly = pts => { let pen = false; c.beginPath(); for (const [la, lo] of pts) { const s = sphereToScreen(st, la, lo); if (!s.vis) { pen = false; continue; } pen ? c.lineTo(s.x, s.y) : c.moveTo(s.x, s.y); pen = true; } c.stroke(); };
  for (let la = -60; la <= 60; la += 30) { const p = []; for (let lo = -180; lo <= 180; lo += 3) p.push([la, lo]); poly(p); }
  for (let lo = -180; lo < 180; lo += 30) { const p = []; for (let la = -90; la <= 90; la += 3) p.push([la, lo]); poly(p); }
  for (const m of st.markers || []) {
    const s = sphereToScreen(st, m.lat, m.lon); if (!s.vis) continue;
    const r = (m.sel ? 9 : 5.5) * k;
    if (m.sel) { c.fillStyle = "rgba(255,255,255,.18)"; c.beginPath(); c.arc(s.x, s.y, r + 8 * k, 0, 2 * Math.PI); c.fill(); }
    c.fillStyle = m.color; c.strokeStyle = "#111"; c.lineWidth = 2 * k;
    c.beginPath(); c.arc(s.x, s.y, r, 0, 2 * Math.PI); c.fill(); c.stroke();
    if (m.label) {
      c.font = `600 ${11 * k}px Inter, sans-serif`; c.textAlign = "left"; c.textBaseline = "middle";
      const tw = c.measureText(m.label).width;
      c.fillStyle = "rgba(10,11,13,.75)"; c.fillRect(s.x + r + 4 * k, s.y - 8 * k, tw + 8 * k, 16 * k);
      c.fillStyle = "#fff"; c.fillText(m.label, s.x + r + 8 * k, s.y);
    }
  }
  c.strokeStyle = "rgba(255,255,255,.18)"; c.beginPath(); c.arc(cx, cy, Rd, 0, 2 * Math.PI); c.stroke();
  c.restore();
}
function sphereToScreen(st, lat, lon) {
  const G = st.geom, p = lat * DEG, d = (lon - st.lon) * DEG, p0 = st.lat * DEG;
  const z = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(d);
  return { x: G.cx + Math.cos(p) * Math.sin(d) * G.Rd, y: G.cy - (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(d)) * G.Rd, vis: z > 0 };
}
function screenToSphere(st, cv, clientX, clientY) {
  const G = st.geom, r = cv.getBoundingClientRect(), nx = ((clientX - r.left) * G.k - G.cx) / G.Rd, ny = (G.cy - (clientY - r.top) * G.k) / G.Rd;
  if (nx * nx + ny * ny > 1) return null;
  const nz = Math.sqrt(1 - nx * nx - ny * ny), sp = Math.sin(st.lat * DEG), cp = Math.cos(st.lat * DEG);
  return [Math.asin(nz * sp + ny * cp) / DEG, wrap180(st.lon + Math.atan2(nx, nz * cp - ny * sp) / DEG)];
}
// trascina = ruota, clic = callback; rotella = zoom
function sphereControls(cv, st, redraw, onClick) {
  let drag = null;
  cv.addEventListener("pointerdown", e => { cv.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY }; });
  cv.addEventListener("pointermove", e => {
    if (!drag || !st.geom || cv._pinch) { if (drag) { drag.x = e.clientX; drag.y = e.clientY; drag.x0 = -1e9; } return; }
    const R = st.geom.Rd / st.geom.k;
    st.lon = wrap180(st.lon - (e.clientX - drag.x) / R / DEG);
    st.lat = Math.max(-90, Math.min(90, st.lat + (e.clientY - drag.y) / R / DEG));
    drag.x = e.clientX; drag.y = e.clientY;
    if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 4) { st.low = true; redraw(); }
  });
  cv.addEventListener("pointerup", e => {
    if (!drag) return;
    const moved = Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 4;
    drag = null; st.low = false;
    if (!moved && onClick) { const ll = screenToSphere(st, cv, e.clientX, e.clientY); if (ll) onClick(ll); }
    redraw();
  });
  cv.addEventListener("wheel", e => { e.preventDefault(); st.zoom = Math.max(.8, Math.min(4, (st.zoom || 1) * Math.exp(-e.deltaY * .0012))); st.low = true; redraw(); clearTimeout(cv._t); cv._t = setTimeout(() => { st.low = false; redraw(); }, 160); }, { passive: false });
}


/* =====================================================================
   Griglia del Polo Sud (dati demo) condivisa da Ragionamento e Missione
   ===================================================================== */
let EGRID = null;
function eduGrid() {
  if (EGRID) return EGRID;
  const cov = DEMO_COVERAGE.find(c => c.id === "demo-sp"), D = getDataset(cov), N = D.N, n = N * N, cell = 2 * D.ext / N;
  const F = () => new Float32Array(n), G = { D, N, n, inside: new Uint8Array(n), lat: F(), lon: F(), sp: F(), cp: F(), cl: F(), sl: F(), sHzS: F(), sHzE: F(), iceS: F() };
  const R2 = rForDeg(D.region.r) ** 2;
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    const k = i * N + j, x = -D.ext + (j + .5) * cell, y = D.ext - (i + .5) * cell;
    if (x * x + y * y > R2) continue;
    const [la, lo] = projInv(x, y, D.region);
    G.inside[k] = 1; G.lat[k] = la; G.lon[k] = lo;
    G.sp[k] = Math.sin(la * DEG); G.cp[k] = Math.cos(la * DEG); G.cl[k] = Math.cos(lo * DEG); G.sl[k] = Math.sin(lo * DEG);
    G.sHzS[k] = Math.sin((D.hzs ? D.hzs[k] : D.hz[k]) * DEG); G.sHzE[k] = Math.sin(D.hz[k] * DEG); G.iceS[k] = iceScore(D.ice[k]);
  }
  return (EGRID = G);
}
function makeLut(stops) {
  const cols = stops.map(hexRgb), n = cols.length, lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) { const t = i / 255 * (n - 1), a = Math.min(n - 2, Math.floor(t)), f = t - a; for (let ch = 0; ch < 3; ch++) lut[i * 3 + ch] = cols[a][ch] + (cols[a + 1][ch] - cols[a][ch]) * f; }
  return lut;
}
// disegna una mappa della griglia in un cerchio; restituisce le conversioni coordinate ↔ pixel
function drawGridMap(cv, G, colorAt, opts = {}) {
  const wrap = cv.parentElement, frac = opts.widthFrac || 1;
  const css = Math.max(200, Math.min(wrap.clientWidth * frac, wrap.clientHeight) - (opts.pad ?? 24));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = cv.height = Math.round(css * dpr); cv.style.width = cv.style.height = css + "px";
  const c = cv.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, css, css);
  const off = document.createElement("canvas"); off.width = off.height = G.N;
  const oc = off.getContext("2d"), img = oc.createImageData(G.N, G.N);
  for (let k = 0; k < G.n; k++) { const o = k * 4; if (!G.inside[k]) continue; const [r, g, b] = colorAt(k); img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b; img.data[o + 3] = 255; }
  oc.putImageData(img, 0, 0);
  const m = opts.margin ?? 34, size = css - 2 * m;
  c.save(); c.beginPath(); c.arc(css / 2, css / 2, size / 2, 0, 2 * Math.PI); c.clip();
  c.imageSmoothingEnabled = true; c.drawImage(off, m, m, size, size); c.restore();
  c.strokeStyle = "rgba(127,211,255,.5)"; c.lineWidth = 1.2; c.beginPath(); c.arc(css / 2, css / 2, size / 2, 0, 2 * Math.PI); c.stroke();
  const ext = G.D.ext;
  const T = {
    c, css, m, size,
    llToPx: (la, lo) => { const [x, y] = projFwd(la, lo, G.D.region); return [m + (x + ext) / (2 * ext) * size, m + (ext - y) / (2 * ext) * size]; },
    kToPx: k => [m + ((k % G.N) + .5) / G.N * size, m + (Math.floor(k / G.N) + .5) / G.N * size],
    pxToK: (px, py) => { const j = Math.floor((px - m) / size * G.N), i = Math.floor((py - m) / size * G.N); if (i < 0 || j < 0 || i >= G.N || j >= G.N) return -1; const k = i * G.N + j; return G.inside[k] ? k : -1; },
  };
  if (opts.craters !== false) {
    c.font = "600 10px Inter, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.setLineDash([3, 3]);
    for (const cr of CRATERS) {
      if (angDeg(unit(cr.lat, cr.lon), unit(G.D.region.lat, G.D.region.lon)) > G.D.region.r) continue;
      const [x, y] = T.llToPx(cr.lat, cr.lon), r = cr.d / 2 / (2 * ext) * size;
      c.strokeStyle = cr.ice ? "rgba(169,216,255,.75)" : "rgba(255,255,255,.4)"; c.beginPath(); c.arc(x, y, r, 0, 2 * Math.PI); c.stroke();
      if (opts.labels !== false) { const txt = (cr.ice ? "❄ " : "") + cr.name, tw = c.measureText(txt).width; c.fillStyle = "rgba(10,11,13,.6)"; c.fillRect(x - tw / 2 - 3, y - 7, tw + 6, 14); c.fillStyle = "#e0f2fe"; c.fillText(txt, x, y); }
    }
    c.setLineDash([]);
  }
  return T;
}

// griglia lat/lon sulle mappe polari educative; inside = etichette di longitudine dentro il bordo
function drawLLGrid(T, G, opt = {}) {
  const c = T.c, reg = G.D.region, cx = T.css / 2, cy = T.css / 2, R = T.size / 2;
  c.save(); c.beginPath(); c.arc(cx, cy, R, 0, 2 * Math.PI); c.clip();
  c.strokeStyle = opt.color || "rgba(255,255,255,.22)"; c.lineWidth = 1;
  const latMin = Math.ceil((reg.lat + reg.r) / 2) * 2;
  for (let la = -88; la <= latMin + 2; la += 2) { c.beginPath(); for (let lo = -180; lo <= 180; lo += 3) { const [x, y] = T.llToPx(la, lo); lo === -180 ? c.moveTo(x, y) : c.lineTo(x, y); } c.stroke(); }
  for (let lo = -180; lo < 180; lo += 30) { c.beginPath(); for (let la = -90; la <= reg.lat + reg.r + 1; la += .5) { const [x, y] = T.llToPx(la, lo); la === -90 ? c.moveTo(x, y) : c.lineTo(x, y); } c.stroke(); }
  c.restore();
  const fs = opt.font || 10;
  c.font = `600 ${fs}px Inter, sans-serif`; c.textAlign = "center"; c.textBaseline = "middle";
  const tag = (txt, x, y) => { const tw = c.measureText(txt).width; c.fillStyle = "rgba(10,11,13,.72)"; c.fillRect(x - tw / 2 - 3, y - fs * .7, tw + 6, fs * 1.4); c.fillStyle = "#e5e7eb"; c.fillText(txt, x, y); };
  for (let la = -88; la <= latMin; la += 2) { const [x, y] = T.llToPx(la, 135); if (Math.hypot(x - cx, y - cy) < R - 8) tag(`${-la}°S`, x, y); }
  for (let lo = -180; lo < 180; lo += 30) {
    const [px, py] = T.llToPx(-85, lo), d = Math.hypot(px - cx, py - cy) || 1, rr = opt.inside ? R - 16 : R + 13;
    tag(lo === 0 ? "0°" : lo === -180 ? "180°" : `${Math.abs(lo)}°${lo > 0 ? "E" : "W"}`, cx + (px - cx) / d * rr, cy + (py - cy) / d * rr);
  }
}
// "stella polare" al Polo Sud: ogni direzione che si allontana dal polo porta a Nord
function drawNorthArrows(T) {              // frecce "N" sul bordo: allontanarsi dal polo = andare a Nord
  const c = T.c, cx = T.css / 2, cy = T.css / 2, R = T.size / 2; c.save();
  for (let i = 0; i < 8; i++) { const a = (i + .5) * Math.PI / 4, r0 = R - 46, r1 = R - 24, ux = Math.cos(a), uy = Math.sin(a);
    c.strokeStyle = "rgba(253,224,71,.85)"; c.fillStyle = "rgba(253,224,71,.95)"; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(cx + ux * r0, cy + uy * r0); c.lineTo(cx + ux * r1, cy + uy * r1); c.stroke();
    c.beginPath(); c.moveTo(cx + ux * (r1 + 9), cy + uy * (r1 + 9)); c.lineTo(cx + ux * r1 - uy * 6, cy + uy * r1 + ux * 6); c.lineTo(cx + ux * r1 + uy * 6, cy + uy * r1 - ux * 6); c.fill();
    c.font = "900 12px Orbitron, Inter, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.lineWidth = 3; c.strokeStyle = "rgba(10,11,13,.85)";
    const lx = cx + ux * (r0 - 10), ly = cy + uy * (r0 - 10); c.strokeText("N", lx, ly); c.fillText("N", lx, ly); }
  c.restore();
}
const gcKm = (a, b, c2, d) => degToKm(angDeg(unit(a, b), unit(c2, d)));


/* ---------- Schermate di contesto: coinvolgono il giocatore all'inizio di ogni gioco o fase ---------- */
function showIntro(wrapId, o) {
  const wrap = document.getElementById(wrapId); if (!wrap) return;
  wrap.querySelector(".edu-intro")?.remove();
  const d = document.createElement("div"); d.className = "edu-intro"; d.setAttribute("role", "dialog");
  d.innerHTML = `<div class="card"><div class="ico">${o.ico}</div><div class="kick">${esc(o.kick)}</div><h3>${esc(o.title)}</h3><p>${o.text}</p>
    ${o.mission ? `<div class="mis">${o.mission}</div>` : ""}${o.steps ? `<ol>${o.steps.map(x => `<li>${x}</li>`).join("")}</ol>` : ""}
    <button type="button">${esc(o.btn || t("introGo"))}</button><div class="hint">${esc(t(document.body.classList.contains("touch") ? "introHintT" : "introHint"))}</div></div>`;
  const close = () => { d.remove(); document.removeEventListener("keydown", onKey, true); if (o.onClose) o.onClose(); };
  const onKey = e => { if (!document.body.contains(d)) return document.removeEventListener("keydown", onKey, true);
    if (e.key === "Enter" || e.key === " " || e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); } };
  d.querySelector("button").addEventListener("click", close);
  document.addEventListener("keydown", onKey, true);
  wrap.appendChild(d);
  setTimeout(() => d.querySelector("button").focus(), 50);
}

// each page: re-render when the panel changes size
function eduOnResize(fn) {
  let tm = 0;
  new ResizeObserver(() => { clearTimeout(tm); tm = setTimeout(fn, 120); }).observe(document.getElementById("view-educational"));
}

function drawEarthPhase(c, x, y, r, lit, ang) {
  c.save(); c.translate(x, y); c.rotate(ang);
  c.fillStyle = "rgba(56,189,248,.18)"; c.beginPath(); c.arc(0, 0, r + 5, 0, 2 * Math.PI); c.fill();
  c.fillStyle = "#0b1733"; c.beginPath(); c.arc(0, 0, r, 0, 2 * Math.PI); c.fill();
  const g = c.createLinearGradient(-r, -r, r, r); g.addColorStop(0, "#60a5fa"); g.addColorStop(.6, "#1d4ed8"); g.addColorStop(1, "#22c55e");
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, -Math.PI / 2, Math.PI / 2); c.closePath(); c.fill();   // metà verso il Sole
  c.beginPath(); c.ellipse(0, 0, r * Math.abs(1 - 2 * lit), r, 0, 0, 2 * Math.PI);
  c.fillStyle = lit > .5 ? g : "#0b1733"; c.fill();
  c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, r, 0, 2 * Math.PI); c.stroke();
  c.restore();
}
