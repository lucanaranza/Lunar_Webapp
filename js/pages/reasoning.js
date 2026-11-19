/* =====================================================================
   3) RAGIONAMENTO: missione affidata → mappe e intersezioni → esperti → scelta → ottimo spiegato
   Ogni partita genera una configurazione casuale (crateri, rilievi, luce, Terra, ghiaccio).
   ===================================================================== */
const PERSONAS = [
  { id: "geo", duck: "geo", n: "rGeoN", q: "rGeoQ", self: "rGeoSelf", w: { sun: 2, earth: 2, ice: 10 }, color: "#93c5fd", ic: "G" },
  { id: "eng", duck: "ing", n: "rEngN", q: "rEngQ", self: "rEngSelf", w: { sun: 10, earth: 3, ice: 2 }, color: "#fbbf24", ic: "E" },
  { id: "com", duck: "tech", n: "rComN", q: "rComQ", self: "rComSelf", w: { sun: 3, earth: 10, ice: 2 }, color: "#2dd4bf", ic: "C" },
];
// campi: sun, earth, ice; derivati: quiet = Terra nascosta (silenzio radio), cold = ombra (freddo)
const R_MISSIONS = [
  { id: "comms",    w: { ice: 1, sun: 4, earth: 10 } },
  { id: "rover",    w: { ice: 2, sun: 10, earth: 4 } },
  { id: "ice",      w: { ice: 10, sun: 3, earth: 3 } },
  { id: "stay",     w: { ice: 2, sun: 8, earth: 8 } },
  { id: "mixed",    w: { ice: 7, sun: 7, earth: 7 } },
  { id: "habitat",  w: { ice: 6, sun: 8, earth: 7 } },
  { id: "isru",     w: { ice: 10, sun: 8, earth: 2 } },
  { id: "radio",    w: { sun: 6, quiet: 10, ice: 1 } },
  { id: "infrared", w: { cold: 8, earth: 6, ice: 3 } },
  { id: "relay",    w: { earth: 9, sun: 7, ice: 1 } },
];
const R_SITUATIONS = [
  { id: "none", d: {} }, { id: "none", d: {} },
  { id: "storm",   d: { ice: 3 } },            // riparo naturale vicino ai crateri
  { id: "antenna", d: { earth: 4 }, noQuiet: true },
  { id: "battery", d: { sun: 4 }, noCold: true },
  { id: "water",   d: { ice: 4 } },
  { id: "satrelay", d: { earth: -4 }, noQuiet: true },
  { id: "night",   d: { sun: 3 }, noCold: true },
];
const R_FIELD = { sun: "rSun", earth: "rEarth", ice: "rIce", quiet: "rQuiet", cold: "rCold" };
const R_COL = { sun: "#fbbf24", earth: "#2dd4bf", ice: "#93c5fd", quiet: "#c084fc", cold: "#64748b" };
const rField = (f, k) => f === "quiet" ? 1 - RS.earth[k] : f === "cold" ? 1 - RS.sun[k] : RS[f][k];
const R_LAYERS = [
  { id: "ice", f: ["ice"], pal: ["#050914", "#0c2340", "#1d4ed8", "#38bdf8", "#bae6fd", "#ffffff"] },
  { id: "sun", f: ["sun"], pal: PALETTES.sun },
  { id: "earth", f: ["earth"], pal: PALETTES.earth },
  { id: "se", f: ["sun", "earth"], pal: PALETTES.score },
  { id: "si", f: ["sun", "ice"], pal: PALETTES.score },
  { id: "ei", f: ["earth", "ice"], pal: PALETTES.score },
  { id: "all", f: ["sun", "earth", "ice"], pal: PALETTES.score },
  { id: "quiet", f: ["quiet"], pal: ["#0b0712", "#2e1065", "#6d28d9", "#a78bfa", "#ede9fe"], only: "quiet" },
  { id: "cold", f: ["cold"], pal: ["#f8fafc", "#94a3b8", "#475569", "#1e293b", "#020617"], only: "cold" },
];
const RNAMES = ["Aurora", "Brina", "Selene", "Faro", "Gelo", "Nembo", "Orsa", "Vela", "Lira", "Eco", "Cometa", "Zefiro"];
const RS = { ready: false, layer: "all", pick: -1, confirmed: false, experts: false, hover: -1 };

function rGenerate() {
  const G = eduGrid(), N = G.N, n = G.n, seed = (Math.random() * 2 ** 31) | 0, rnd = mulberry32(seed);
  const cell = 2 * G.D.ext / N, cx = (N - 1) / 2, Rg = N / 2;
  const inArea = (x, y, f = .82) => Math.hypot(x - cx, y - cx) < Rg * f;
  const pick = (f) => { let x, y; do { x = rnd() * N; y = rnd() * N; } while (!inArea(x, y, f)); return [x, y]; };
  // rilievi (massicci) e crateri, sempre diversi
  const massifs = Array.from({ length: 3 + Math.floor(rnd() * 3) }, () => { const [x, y] = pick(.9); return { x, y, s: N * (.07 + rnd() * .14), h: .55 + rnd() * .45 }; });
  const names = [...RNAMES].sort(() => rnd() - .5);
  const craters = Array.from({ length: 7 + Math.floor(rnd() * 4) }, (_, i) => { const [x, y] = pick(.8); return { x, y, r: N * (.045 + rnd() * .09), ice: i < 2 || rnd() < .55, name: names[i % names.length] }; });
  const waves = Array.from({ length: 6 }, () => [rnd() * .5 + .1, rnd() * .5 + .1, rnd() * 6.3, rnd() * 2 - 1]);
  const h = new Float32Array(n), floor = new Float32Array(n), iceFloor = new Uint8Array(n);
  let hlo = Infinity, hhi = -Infinity;
  for (let k = 0; k < n; k++) {
    if (!G.inside[k]) continue;
    const x = k % N, y = Math.floor(k / N);
    let v = 0;
    for (const m of massifs) v += m.h * Math.exp(-((x - m.x) ** 2 + (y - m.y) ** 2) / (2 * m.s * m.s));
    for (const [a, b, c, s] of waves) v += .05 * s * Math.sin(a * x + b * y + c);
    for (const cr of craters) {
      const d = Math.hypot(x - cr.x, y - cr.y) / cr.r;
      if (d < 1) { v -= .55 * (1 - d * d); floor[k] = Math.max(floor[k], 1 - d); if (cr.ice && d < .8) iceFloor[k] = 1; }
      else if (d < 1.3) v += .12 * (1 - (d - 1) / .3);
    }
    h[k] = v; hlo = Math.min(hlo, v); hhi = Math.max(hhi, v);
  }
  const phi0 = rnd() * 2 * Math.PI;                       // da che parte "guarda" la Terra in questa partita
  const sun = new Float32Array(n), earth = new Float32Array(n), dep = [];
  for (let k = 0; k < n; k++) {
    if (!G.inside[k]) continue;
    const x = k % N, y = Math.floor(k / N), hn = (h[k] - hlo) / (hhi - hlo), rr = Math.hypot(x - cx, y - cx) / Rg, az = Math.atan2(x - cx, cx - y);
    let s = .06 + .9 * Math.pow(hn, 1.25) - .35 * floor[k];
    if (iceFloor[k]) s *= .08;                           // fondo dei crateri freddi: ombra (quasi) permanente
    let e = .3 + .22 * hn + .5 * rr * Math.cos(az - phi0) - .3 * floor[k];      // Terra: conta soprattutto il lato rivolto verso di lei
    sun[k] = Math.max(0, Math.min(1, s)); earth[k] = Math.max(0, Math.min(1, e));
    if (iceFloor[k] && sun[k] < .06) dep.push(k);
  }
  const iceKm = new Float32Array(n), ice = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    if (!G.inside[k]) continue;
    const x = k % N, y = Math.floor(k / N); let d = Infinity;
    for (const p of dep) { const dd = (p % N - x) ** 2 + (Math.floor(p / N) - y) ** 2; if (dd < d) d = dd; }
    const dc = dep.length ? Math.sqrt(d) : Infinity;          // distanza in celle
    iceKm[k] = dc * cell;
    ice[k] = isFinite(dc) ? Math.exp(-Math.max(0, dc - .5) / (.07 * N)) : 0;   // 1 sul deposito, cala in ~7% del raggio dell'area
  }
  const base = R_MISSIONS[Math.floor(rnd() * R_MISSIONS.length)];
  const sits = R_SITUATIONS.filter(x => !(x.noQuiet && base.w.quiet) && !(x.noCold && base.w.cold));
  const sit = sits[Math.floor(rnd() * sits.length)], w = { ...base.w };
  for (const [f, d] of Object.entries(sit.d)) w[f] = Math.max(1, Math.min(10, (w[f] || 0) + d));
  const mission = { id: base.id, w, sit: sit.id };
  const dv = () => 1 + Math.floor(rnd() * 3);                       // variante delle battute (1-3)
  Object.assign(RS, { ready: true, seed, sun, earth, ice, iceKm, craters, phi0, mission, pick: -1, confirmed: false, experts: false, layer: "all", cell,
                      lines: { need: dv(), geo: dv(), eng: dv(), com: dv(), react: dv() } });
  // punteggio della missione: media geometrica pesata (basta una risorsa a zero per abbassarlo)
  RS.score = rScoreMap(mission.w);
  RS.opt = rArgmax(RS.score);
  // gli esperti ragionano con le loro priorità: non centrano mai l'ottimo (restano fuori da un disco attorno a esso)
  const ox = RS.opt % N, oy = Math.floor(RS.opt / N), excl = (.05 + rnd() * .04) * N;
  for (const p of PERSONAS) {
    const own = rScoreMap(p.w), cap = RS.score[RS.opt] * (.8 + rnd() * .13); p.v = new Float32Array(n); let b = -1, bv = -1;   // mai oltre ~93% dell'ottimo
    for (let k = 0; k < n; k++) if (G.inside[k]) {
      p.v[k] = .3 * RS.score[k] + .7 * own[k];
      if (Math.hypot(k % N - ox, Math.floor(k / N) - oy) < excl || RS.score[k] > cap) continue;
      if (p.v[k] > bv) { bv = p.v[k]; b = k; }
    }
    p.best = b;
  }
}
function rScoreMap(w) {
  const G = eduGrid(), out = new Float32Array(G.n), ent = Object.entries(w).filter(([, v]) => v > 0), ws = ent.reduce((a, [, v]) => a + v, 0);
  for (let k = 0; k < G.n; k++) if (G.inside[k]) {
    let s = 0; for (const [f, v] of ent) s += v * Math.log(rField(f, k) + .02);
    out[k] = Math.exp(s / ws);
  }
  return out;
}
function rArgmax(a) { const G = eduGrid(); let b = -1, bv = -Infinity; for (let k = 0; k < G.n; k++) if (G.inside[k] && a[k] > bv) { bv = a[k]; b = k; } return b; }
function rLayerVal(L, k) {
  const vals = L.f.map(f => rField(f, k));
  return vals.length === 1 ? vals[0] : Math.pow(vals.reduce((a, b) => a * b, 1), 1 / vals.length);   // intersezione: media geometrica
}
const rFacts = k => ({ c: fmtLL(eduGrid().lat[k], eduGrid().lon[k]), s: Math.round(RS.sun[k] * 100), e: Math.round(RS.earth[k] * 100), i: !isFinite(RS.iceKm[k]) ? "—" : RS.iceKm[k] < 10 ? RS.iceKm[k].toFixed(1) : Math.round(RS.iceKm[k]) });
const rPts = k => Math.round(100 * RS.score[k] / RS.score[RS.opt]);
const rPtsCol = p => p >= 80 ? "#c4f06a" : p >= 60 ? "#fbbf24" : "#f87171";

function renderReasonSide() {
  const m = RS.mission, w = m.w, ent = Object.entries(w).filter(([, v]) => v > 0), ws = ent.reduce((a, [, v]) => a + v, 0), bar = (lbl, v, col) =>
    `<div class="r-wbar"><span>${lbl}</span><i><b style="width:${v / 10 * 100}%;background:${col}"></b></i><em>${Math.round(v / ws * 100)}%</em></div>`;
  document.getElementById("rMission").innerHTML = `<p class="r-mname">${esc(t("rm_" + m.id))}</p><p class="slider-desc">${esc(t("rm_" + m.id + "_d"))}</p>
    ${m.sit !== "none" ? `<p class="r-sit">⚠ ${esc(t("rs_" + m.sit))}</p>` : ""}
    ${ent.map(([f, v]) => bar(t(R_FIELD[f]), v, R_COL[f])).join("")}`;
  document.getElementById("rLayers").innerHTML = R_LAYERS.filter(L => !L.only || m.w[L.only]).map(L => `<button data-rl="${L.id}" class="${RS.layer === L.id ? "active" : ""}">${esc(t("rl_" + L.id))}</button>`).join("");
  document.getElementById("rPersonas").innerHTML = PERSONAS.map(p => `
    <div class="persona r-p${R_DUCK_OPEN.has(p.id) ? " open" : ""}" style="--c:${p.color}" data-pduck="${p.id}" role="button" tabindex="0"
         aria-expanded="${R_DUCK_OPEN.has(p.id)}" title="${esc(t("rDuckHint"))}">
      <div class="who"><span class="ic">${p.ic}</span>${esc(t(p.n))}<span class="tg">▾</span></div>
      ${R_DUCK_OPEN.has(p.id) ? `<img class="p-duck" src="${EXPERT_DUCKS[p.duck]}" alt="${esc(t(p.n))}">` : ""}
      <div class="q">${esc(t(p.q))}</div>
      <div class="w">${t("rWeights", { s: p.w.sun, e: p.w.earth, i: p.w.ice })}</div>
      ${RS.experts ? `<div class="w" style="color:${p.color}">→ ${esc(rFacts(p.best).c)}</div>` : ""}
    </div>`).join("");
  document.getElementById("rAsk").hidden = RS.experts;
  const st = document.getElementById("rPickTxt");
  st.innerHTML = RS.pick < 0 ? t("rPickHint") : t("rPicked", rFacts(RS.pick));
  document.getElementById("rConfirm").disabled = RS.pick < 0 || RS.confirmed;
  document.getElementById("rConfirm").hidden = RS.confirmed;
}
function rDrawMap() {
  const G = eduGrid(), cv = document.getElementById("rMap"), L = R_LAYERS.find(x => x.id === RS.layer), lut = makeLut(L.pal), BANDS = 12;
  const T = RS.T = drawGridMap(cv, G, k => {
    let v = rLayerVal(L, k); v = (Math.floor(v * BANDS) + .5) / BANDS;           // a bande, come una mappa meteo
    const li = Math.max(0, Math.min(255, v * 255 | 0)) * 3; return [lut[li], lut[li + 1], lut[li + 2]];
  }, { widthFrac: .6, craters: false });
  const c = T.c, N = G.N, px = (x, y) => [T.m + (x + .5) / N * T.size, T.m + (y + .5) / N * T.size];
  drawLLGrid(T, G);
  // crateri della partita
  c.font = "600 10px Inter, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.setLineDash([3, 3]);
  for (const cr of RS.craters) {
    const [x, y] = px(cr.x, cr.y), r = cr.r / N * T.size;
    c.strokeStyle = cr.ice ? "rgba(186,230,253,.85)" : "rgba(255,255,255,.45)"; c.beginPath(); c.arc(x, y, r, 0, 2 * Math.PI); c.stroke();
    const txt = (cr.ice ? "❄ " : "") + cr.name, tw = c.measureText(txt).width;
    c.fillStyle = "rgba(10,11,13,.65)"; c.fillRect(x - tw / 2 - 3, y - 7, tw + 6, 14); c.fillStyle = "#e0f2fe"; c.fillText(txt, x, y);
  }
  c.setLineDash([]);
  // direzione della Terra in questa partita
  const R = T.size / 2, ex = T.css / 2 + Math.sin(RS.phi0) * (R + 6), ey = T.css / 2 - Math.cos(RS.phi0) * (R + 6);
  c.fillStyle = "#38bdf8"; c.beginPath(); c.arc(ex, ey, 7, 0, 2 * Math.PI); c.fill(); c.strokeStyle = "#fff"; c.lineWidth = 1.5; c.stroke();
  c.fillStyle = "#bae6fd"; c.font = "600 10px Inter"; c.fillText(t("rEarthDir"), ex, ey + (ey > T.css / 2 ? 16 : -16));
  const mark = (k, col, txt, r = 11) => { const [x, y] = T.kToPx(k); c.fillStyle = col; c.strokeStyle = "#111"; c.lineWidth = 2; c.beginPath(); c.arc(x, y, r, 0, 2 * Math.PI); c.fill(); c.stroke(); c.fillStyle = "#111"; c.font = "800 11px Inter"; c.fillText(txt, x, y + .5); };
  if (RS.experts) for (const p of PERSONAS) mark(p.best, p.color, p.ic);
  if (RS.pick >= 0) mark(RS.pick, "#ffffff", "✕", 10);
  if (RS.confirmed) {
    const [x1, y1] = T.kToPx(RS.pick), [x2, y2] = T.kToPx(RS.opt);
    c.setLineDash([4, 4]); c.strokeStyle = "rgba(255,255,255,.7)"; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); c.setLineDash([]);
    const [x, y] = T.kToPx(RS.opt); c.fillStyle = "#c4f06a"; c.strokeStyle = "#111"; c.lineWidth = 2; c.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 6 : 14, a = -Math.PI / 2 + i * Math.PI / 5; c.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)); }
    c.closePath(); c.fill(); c.stroke();
  }
  // legenda (HTML, a sinistra della mappa)
  const grad = Array.from({ length: BANDS }, (_, i) => { const li = Math.round((i + .5) / BANDS * 255) * 3; return `<i style="background:rgb(${lut[li]},${lut[li + 1]},${lut[li + 2]})"></i>`; }).reverse().join("");
  const single = L.f.length === 1, f0 = L.f[0];
  const ends = single ? (f0 === "ice" ? [t("rLgIceHi"), t("rLgIceLo")] : f0 === "quiet" ? [t("rLgQuietHi"), t("rLgQuietLo")] : f0 === "cold" ? [t("rLgColdLo"), t("rLgColdHi")] : ["100%", "0%"]) : [t("rLgBoth"), t("rLgNone")];
  document.getElementById("rLegend").innerHTML = `<div class="r-lg-t">${esc(t("rl_" + L.id + "_lg"))}</div>
    <div class="r-lg-d">${esc(t(single ? "rLgD_" + f0 : "rLgD_inter"))}</div>
    <div class="r-lg-bar"><div class="r-lg-g">${grad}</div><div class="r-lg-l"><span>${esc(ends[0])}</span><span>${esc(ends[1])}</span></div></div>
    <div class="r-lg-sym"><span><b class="d"></b>${esc(t("rLgCrater"))}</span><span><b class="d ice"></b>❄ ${esc(t("rLgIceCr"))}</span>
      <span><b class="e"></b>${esc(t("rLgEarth"))}</span><span><b class="x">✕</b>${esc(t("rLgYou"))}</span>
      ${RS.experts ? `<span><b class="g">G E C</b>${esc(t("rLgExp"))}</span>` : ""}${RS.confirmed ? `<span><b class="s">★</b>${esc(t("rLgOpt"))}</span>` : ""}</div>`;
}
function rExplainHTML() {
  const m = RS.mission, w = m.w, ws = Object.values(w).reduce((a, v) => a + Math.max(0, v), 0);
  if (!RS.confirmed) {
    let h = `<h4>${esc(t("rm_" + m.id))}</h4><p>${esc(t("rm_" + m.id + "_d"))}</p>`
      + (m.sit !== "none" ? `<p class="r-sit">⚠ ${esc(t("rs_" + m.sit))}</p>` : "")
      + `<p>${t("rBrief2", { l: Object.entries(w).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([f, v]) => `${t(R_FIELD[f]).toLowerCase()} <b>${Math.round(v / ws * 100)}%</b>`).join(", ") })}</p>`;
    h += `<p>${t("rHowTo")}</p>`;
    if (RS.experts) PERSONAS.forEach((p, i) => {
      const f = rFacts(p.best), L = RS.lines, v = ((L[p.id] + i) % 3) + 1;
      const need = i === 0 ? t("rNeed_" + m.id + (L.need > 1 ? "_" + L.need : "")) : "";
      const sit = m.sit !== "none" && i === (L.react % 3) ? " " + t("rSitC_" + m.sit) : "";
      h += `<p class="pp" style="--c:${p.color}"><b>${esc(t(p.n).split(" · ")[0])}</b>: «${esc(need ? need + " " : "")}${esc(t("rProp" + v, f))} ${esc(t(p.self + (L[p.id] > 1 ? "_" + L[p.id] : "")))}${esc(sit)}»</p>`;
    });
    return h + `<p class="lesson">${t("rLesson")}</p>`;
  }
  const o = RS.opt, k = RS.pick, fo = rFacts(o), fk = rFacts(k), pts = rPts(k), G = eduGrid();
  const contrib = kk => Object.fromEntries(Object.entries(w).filter(([, v]) => v > 0).map(([f, v]) => [f, v * Math.log(rField(f, kk) + .02)]));
  // migliori punti per una sola risorsa, per spiegare perché non sono stati scelti
  const bestOf = f => rArgmax(RS[f]), bS = bestOf("sun"), bE = bestOf("earth"), bI = bestOf("ice");
  const dist = (a, b) => gcKm(G.lat[a], G.lon[a], G.lat[b], G.lon[b]).toFixed(1);
  const ws2 = Object.entries(w).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const top = ws2.length > 2 && ws2[0][1] - ws2[2][1] <= 1 ? "mixed" : ws2.length > 1 && ws2[0][1] === ws2[1][1] ? "pair" : ws2[0][0];
  let h = `<h4>${t("rResult")}</h4><div class="big-score" style="color:${rPtsCol(pts)}">${pts}/100</div>`;
  h += `<p>${t(pts >= 95 ? "rR_great" : pts >= 80 ? "rR_good" : pts >= 60 ? "rR_ok" : "rR_bad", { d: dist(k, o) })}</p>`;
  h += `<h5>${t("rWhyOpt")}</h5><p>${t("rOptIs", fo)}</p>`;
  h += `<p>${t("rOptTop_" + top, { a: t(R_FIELD[ws2[0][0]]).toLowerCase(), b: t(R_FIELD[(ws2[1] || ws2[0])[0]]).toLowerCase() })}</p>`;
  if (m.sit !== "none") h += `<p>${t("rSitR_" + m.sit)}</p>`;
  const lines = [];
  if (bS !== o) lines.push(t("rNotSun", { ...rFacts(bS), d: dist(bS, o) }));
  if (bE !== o) lines.push(t("rNotEarth", { ...rFacts(bE), d: dist(bE, o) }));
  if (bI !== o) lines.push(t("rNotIce", { ...rFacts(bI), d: dist(bI, o) }));
  h += `<ul class="r-why">${lines.map(x => `<li>${x}</li>`).join("")}</ul>`;
  h += `<p>${t("rGeo")}</p>`;
  h += `<h5>${t("rYouVsOpt")}</h5><table class="r-cmp"><tr><th></th><th>${t("rYou")}</th><th>★</th></tr>
    <tr><td>${t("rSun")}</td><td>${fk.s}%</td><td>${fo.s}%</td></tr><tr><td>${t("rEarth")}</td><td>${fk.e}%</td><td>${fo.e}%</td></tr>
    <tr><td>${t("rIceKm")}</td><td>${fk.i} km</td><td>${fo.i} km</td></tr></table>`;
  const ck = contrib(k), co = contrib(o), loss = Object.keys(ck).map(f => [f, co[f] - ck[f]]).sort((a, b) => b[1] - a[1])[0];
  if (pts < 98) h += `<p>${t("rLossMost", { f: t(R_FIELD[loss[0]]).toLowerCase() })}</p>`;
  h += `<h5>${t("rExperts")}</h5>` + PERSONAS.map(p => { const pp = rPts(p.best);
    return `<p class="pp" style="--c:${p.color}">${esc(t("rExpScore2", { n: t(p.n).split(" · ")[0], d: dist(p.best, o) }))} <b style="color:${rPtsCol(pp)}">${pp}/100</b></p>`; }).join("")
    + `<p>${t("rExpWhy")}</p>`;
  return h + `<p class="lesson">${t("rLesson2")}</p>`;
}
function renderReason() {
  if (!RS.ready) return;
  renderReasonSide(); rDrawMap();
  document.getElementById("rExplain").innerHTML = rExplainHTML();
}
document.getElementById("rLayers").addEventListener("click", e => { const b = e.target.closest("[data-rl]"); if (!b) return; RS.layer = b.dataset.rl; renderReason(); });

// Papere degli esperti: clic (o Invio / Spazio) sulla scheda per mostrarla o nasconderla
const EXPERT_DUCKS = {
  geo: "images/duck-geo.webp",
  ing: "images/duck-ing.webp",
  tech: "images/duck-tech.webp",
};
const R_DUCK_OPEN = new Set();
function toggleExpertDuck(card) {
  const id = card.dataset.pduck; if (!id) return;
  R_DUCK_OPEN.has(id) ? R_DUCK_OPEN.delete(id) : R_DUCK_OPEN.add(id);
  renderReasonSide();
}
document.getElementById("rPersonas").addEventListener("click", e => { const c = e.target.closest("[data-pduck]"); if (c) toggleExpertDuck(c); });
document.getElementById("rPersonas").addEventListener("keydown", e => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const c = e.target.closest("[data-pduck]"); if (!c) return;
  e.preventDefault(); toggleExpertDuck(c);
  const again = document.querySelector(`#rPersonas [data-pduck="${c.dataset.pduck}"]`); if (again) again.focus();
});
document.getElementById("rAsk").addEventListener("click", () => { RS.experts = true; renderReason(); });
document.getElementById("rNew").addEventListener("click", () => { rGenerate(); renderReason(); introReason(); });
document.getElementById("rConfirm").addEventListener("click", () => { if (RS.pick < 0) return; RS.confirmed = true; RS.experts = true; renderReason(); document.getElementById("rExplain").scrollTop = 0; });
document.getElementById("rMap").addEventListener("click", e => {
  if (!RS.T || RS.confirmed) return;
  const r = e.currentTarget.getBoundingClientRect(), k = RS.T.pxToK(e.clientX - r.left, e.clientY - r.top);
  if (k < 0) return; RS.pick = k; renderReasonSide(); rDrawMap();
});
document.getElementById("rMap").addEventListener("mousemove", e => {
  const tip = document.getElementById("rTip"); if (!RS.T) return;
  const r = e.currentTarget.getBoundingClientRect(), k = RS.T.pxToK(e.clientX - r.left, e.clientY - r.top);
  if (k < 0) { tip.style.display = "none"; return; }
  const f = rFacts(k), wr = document.getElementById("rWrap").getBoundingClientRect();
  tip.innerHTML = `<b>${f.c}</b><div class="row"><span>${t("rSun")}</span><span>${f.s}%</span></div><div class="row"><span>${t("rEarth")}</span><span>${f.e}%</span></div><div class="row"><span>${t("rIceKm")}</span><span>${f.i} km</span></div>`
    + (RS.confirmed ? `<div class="row"><span>${t("rMissionPts")}</span><span style="color:${rPtsCol(rPts(k))}">${rPts(k)}/100</span></div>` : "");
  tip.style.display = "block"; tip.style.left = (e.clientX - wr.left + 14) + "px"; tip.style.top = (e.clientY - wr.top + 14) + "px";
});
document.getElementById("rMap").addEventListener("mouseleave", () => { document.getElementById("rTip").style.display = "none"; });



function introReason() {
  const m = RS.mission, sit = RS.situation;
  showIntro("rWrap", { ico: "🧑‍🚀", kick: t("introRKick"), title: t("introRTitle"), text: t("introRText"),
    mission: m ? `<b>${esc(t("introMission"))}:</b> ${esc(t("rm_" + m.id))}${sit && sit.id !== "none" ? `<br>${esc(t("rs_" + sit.id))}` : ""}` : "",
    steps: [t("introR1"), t("introR2"), t("introR3"), t("introR4")] });
}

function openReason() {
  if (RS.ready) return renderReason();
  const busy = document.getElementById("rBusy"); busy.classList.add("show");
  setTimeout(() => { rGenerate(); busy.classList.remove("show"); renderReason(); introReason(); }, 40);
}


/* ---------- start ---------- */
mChip("rExplain", "chipExplain", true);
onLang(() => { if (RS.ready) renderReason(); });
eduOnResize(() => { if (RS.ready) renderReason(); });
requestAnimationFrame(openReason);
landBoot();
