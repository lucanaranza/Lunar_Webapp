/* =====================================================================
   analysis.html – HEAT MAP of the chosen site
   Left panel: mission (name, import / export), weights, selectable weights (data crossing),
   timing, constraints, best sites. On the map: view (top left), legend (top right),
   map layers (bottom right), time bar and energy budget (over-time view), 3D view.
   Sections:  controls · 2D map + probe + energy · 3D view (WebGL) · mission · start
   ===================================================================== */
/* ---------- Stato del workspace e della missione ---------- */
let PX = null, SITES = [], selectedSite = -1;

document.querySelectorAll("[data-sliders]").forEach(box => {
  const pre = box.dataset.sliders;
  box.innerHTML = PARAMS.map(p => `
    <div class="slider-row" style="--c:${p.color}">
      <div class="slider-head"><span class="dot"></span><label for="${pre}-${p.id}" data-i18n="p_${p.id}"></label><output id="${pre}-${p.id}-out"></output></div>
      <input type="range" min="${p.min}" max="10" step="1" id="${pre}-${p.id}" data-param="${p.id}">
      <p class="slider-desc" data-i18n="p_${p.id}_d"></p>
    </div>`).join("");
});

function syncControls() {
  document.querySelectorAll("input[data-param]").forEach(el => {
    const v = WS.weights[el.dataset.param];
    el.value = v;
    const mn = WMIN(el.dataset.param);
    el.style.setProperty("--p", ((v - mn) / (10 - mn) * 100) + "%");
    document.getElementById(el.id + "-out").textContent = v;
  });
  document.querySelectorAll("input[data-arrival]").forEach(el => { if (document.activeElement !== el) el.value = WS.arrival; });
  document.querySelectorAll("input[data-m]").forEach(el => {
    if (el.type === "checkbox") el.checked = !!WS.mission[el.dataset.m];
    else if (document.activeElement !== el) el.value = WS.mission[el.dataset.m];
  });
  applyViewMode();
  document.querySelectorAll("#layerTabs button").forEach(b => b.classList.toggle("active", b.dataset.layer === WS.layer));
  document.querySelectorAll("#horizonMode button").forEach(b => b.classList.toggle("active", b.dataset.h === WS.horizon));
  document.getElementById("zoomSel").value = String(WS.zoom);
  document.getElementById("cratersChk").checked = WS.craters;
  updateLegend(); updateEphem(); updatePeriodUI(); updateTimeUI();
  if (document.activeElement && document.activeElement.closest && document.activeElement.closest("#optList")) return;
  try { renderOptParams(); } catch (e) {}
}

const OPT_DEFS = [
  { id: "energy", f: [["panelW", "ePanel", 50], ["batteryWh", "eBattery", 100], ["loadW", "eLoad", 10], ["loadSaveW", "eLoadSave", 10],
                      ["saveBelowPct", "eSaveBelow", 1], ["reservePct", "eReserve", 1], ["dustInitPct", "eDustInit", .5], ["dustYearPct", "eDustYear", .1]],
    sel: [["opMode", "eOpMode", ["sun", "sunEarth", "always"]]], chk: "energyHard" },
  { id: "minSun", f: [["minSun", "cSun", 1]] }, { id: "minEarth", f: [["minEarth", "cEarth", 1]] }, { id: "maxIce", f: [["maxIce", "cIce", .5]] },
  { id: "landable", f: [] }, { id: "maxSlope", f: [["maxSlope", "oSlope", 1]] }, { id: "quota", f: [["minQuota", "oQmin", 50], ["maxQuota", "oQmax", 50]] },
  { id: "maxDark", f: [["maxDark", "oDark", 6]] }, { id: "maxNoCom", f: [["maxNoCom", "oNoCom", 6]] },
];
const OPT_HELP_OPEN = new Set();
const optHelpHtml = id => `${esc(t("oh_" + id))}<span class="eff">→ ${esc(t("oe_" + id))}</span>`;
function renderOptHelpAll() {
  const p = document.getElementById("optHelpPanel"); if (!p) return;
  p.innerHTML = `<p style="margin-bottom:.6rem">${esc(t("ohIntro"))}</p><dl>${OPT_DEFS.map(d => `<div><dt>${esc(t("opt_" + d.id))}</dt><dd>${optHelpHtml(d.id)}</dd></div>`).join("")}</dl>`;
}
document.getElementById("optHelpAll").addEventListener("click", e => {
  const p = document.getElementById("optHelpPanel"), open = p.hidden;
  p.hidden = !open; e.currentTarget.classList.toggle("on", open); e.currentTarget.setAttribute("aria-expanded", open);
  if (open) renderOptHelpAll();
});
function renderOptParams() {
  const o = WS.mission.opt || (WS.mission.opt = {}), sel = document.getElementById("optAdd"), list = document.getElementById("optList");
  if (!sel) return;
  sel.innerHTML = `<option value="">＋ ${esc(t("optAdd"))}</option>` + OPT_DEFS.filter(d => !o[d.id]).map(d => `<option value="${d.id}">${esc(t("opt_" + d.id))}</option>`).join("");
  const act = OPT_DEFS.filter(d => o[d.id]);
  list.innerHTML = act.length ? act.map(d => `<div class="opt-row"><div class="opt-head"><span>${esc(t("opt_" + d.id))}</span><button type="button" class="q-btn${OPT_HELP_OPEN.has(d.id) ? " on" : ""}" data-opthelp="${d.id}" title="?">?</button><button type="button" data-optrm="${d.id}" title="${esc(t("removeData"))}">✕</button></div>
    ${OPT_HELP_OPEN.has(d.id) ? `<div class="opt-help">${optHelpHtml(d.id)}</div>` : ""}
    ${d.f.length ? `<div class="opt-fields">${(d.sel || []).map(([k, lb, ops]) => `<label class="wide">${esc(t(lb))}<select data-m="${k}">${ops.map(o => `<option value="${o}"${WS.mission[k] === o ? " selected" : ""}>${esc(t("opm_" + o))}</option>`).join("")}</select></label>`).join("")}${d.f.map(([k, lb, st]) => `<label>${esc(t(lb))}<input type="number" step="${st}" data-m="${k}" value="${WS.mission[k]}"></label>`).join("")}</div>` : `<p class="opt-empty">${esc(t("opt_" + d.id + "_d"))}</p>`}
    ${d.chk ? `<label class="chk m-chk"><input type="checkbox" data-m="${d.chk}" ${WS.mission[d.chk] ? "checked" : ""}> <span>${esc(t("eHard"))}</span></label>` : ""}</div>`).join("")
    : `<p class="opt-empty">${esc(t("optNone"))}</p>`;
}
document.getElementById("optAdd").addEventListener("change", e => {
  const id = e.target.value; if (!id) return;
  WS.mission.opt[id] = true; renderOptParams(); syncControls(); queueRecolor(true); saveParams();
});
document.getElementById("optList").addEventListener("click", e => {
  const h = e.target.closest("[data-opthelp]");
  if (h) { const id = h.dataset.opthelp; OPT_HELP_OPEN.has(id) ? OPT_HELP_OPEN.delete(id) : OPT_HELP_OPEN.add(id); renderOptParams(); return; }
  const b = e.target.closest("[data-optrm]"); if (!b) return;
  delete WS.mission.opt[b.dataset.optrm]; renderOptParams(); updateLegend(); queueRecolor(true); saveParams();
});

let recolorQueued = false, dynQueued = false;
function queueRecolor(dyn = false) {
  if (!PX) return;
  dynQueued = dynQueued || dyn;
  if (recolorQueued) return;
  recolorQueued = true;
  requestAnimationFrame(() => { recolorQueued = false; if (dynQueued) { dynQueued = false; computeDynamic(); } recolor(); });
}

document.addEventListener("input", e => {
  const el = e.target;
  if (el.dataset.param) {
    WS.weights[el.dataset.param] = +el.value;
    syncControls(); queueRecolor(); saveParams();
  } else if (el.hasAttribute("data-arrival") && el.value) {
    WS.arrival = el.value;
    if (clampToPeriod()) {
      setMissionMsg(t("periodMoved"), true);
      document.querySelectorAll("input[data-arrival]").forEach(x => { x.value = WS.arrival; });   // anche il campo in modifica
    }
    syncControls(); queueRecolor(true); saveParams();
  } else if (el.dataset.m) {
    const k = el.dataset.m;
    if (k === "name") WS.mission.name = el.value.slice(0, 60);
    else if (el.type === "checkbox") WS.mission[k] = el.checked;
    else if (el.tagName === "SELECT") WS.mission[k] = el.value;
    else {
      const v = parseFloat(el.value);
      const lim = { stayHours: [1, 720], minSun: [0, 100], minEarth: [0, 100], maxIce: [0, 500],
                    panelW: [0, 100000], batteryWh: [1, 1000000], loadW: [0, 100000], reservePct: [0, 100],
                    loadSaveW: [0, 100000], saveBelowPct: [0, 100], dustInitPct: [0, 100], dustYearPct: [0, 100],
                    maxSlope: [0, 90], minQuota: [-10000, 12000], maxQuota: [-10000, 12000], maxDark: [0, 8760], maxNoCom: [0, 8760] }[k];
      if (isFinite(v)) WS.mission[k] = Math.max(lim[0], Math.min(lim[1], v));
    }
    if (k === "stayHours") clampToPeriod();
    updateLegend(); queueRecolor(true); saveParams();
  } else if (el.id === "timeSlider") {
    WS.offsetH = +el.value; updateTimeUI(); updateEphem(); queueRecolor(true); saveParams();
  }
});
document.getElementById("layerTabs").addEventListener("click", e => {
  const b = e.target.closest("button[data-layer]"); if (!b) return;
  WS.layer = b.dataset.layer; syncControls(); queueRecolor(); saveParams();
});
document.getElementById("horizonMode").addEventListener("click", e => {
  const b = e.target.closest("button[data-h]"); if (!b) return;
  WS.horizon = b.dataset.h; if (PX) PX.mcache = {}; syncControls(); queueRecolor(true); saveParams();
});
document.getElementById("zoomSel").addEventListener("change", e => { WS.zoom = +e.target.value; selectedSite = -1; layoutMap(); saveParams(); });
document.getElementById("cratersChk").addEventListener("change", e => { WS.craters = e.target.checked; drawOverlays(); saveParams(); });

// scala graduata accanto alla barra: valori equidistanti dal minimo (in basso) al massimo (in alto)
function setLegendTicks(lo, hi, fmt, n = 6) {
  const el = document.getElementById("legendTicks"), out = [];
  if (Array.isArray(lo)) {                                  // scala a categorie: [[posizione 0..1, testo], ...]
    for (const [p, txt] of lo) out.push(`<span style="bottom:${(p * 100).toFixed(1)}%">${esc(txt)}</span>`);
  } else if (isFinite(lo) && isFinite(hi)) {
    for (let i = 0; i < n; i++) { const p = i / (n - 1); out.push(`<span style="bottom:${(p * 100).toFixed(1)}%">${esc(fmt(lo + (hi - lo) * p))}</span>`); }
  }
  el.innerHTML = out.join("");
}
function updateLegend() {
  const L = WS.layer, stay = WS.horizon === "stay";
  document.getElementById("legendBar").style.background = `linear-gradient(0deg, ${PALETTES[layerPal(L)].join(",")})`;
  const d = MDEF[L];
  if (d || L === "cross" || L === "sunNow" || L === "earthNow") {
    const r = PX && PX.mrange, fmt = v => d && d.pct ? Math.round(v * 100) + "%" : d && d.unit === "h" ? fmtDur(v) : Math.round(v) + (d && d.unit ? " " + d.unit : "");
    const sr = PX && PX.scoreRange;
    document.getElementById("legendTitle").textContent = t("lg_" + L) + (d || L === "cross" ? ` · ${t("vMedia").toLowerCase()}` : "");
    if (L === "sunNow" || L === "earthNow") setLegendTicks([[0, t("no")], [1, t("yes")]]);
    else if (L === "cross") sr ? setLegendTicks(sr[0] * 100, sr[1] * 100, v => String(Math.round(v))) : setLegendTicks([[0, t("lo")], [1, t("hi")]]);
    else r ? setLegendTicks(r[0], r[1], fmt) : setLegendTicks([]);
    document.getElementById("legendMask").hidden = !(L === "cross" || L === "m_lcl");
    document.querySelector("#legendMask span").textContent = t("maskShort");
    document.getElementById("legendEnergy").hidden = true;
    return;
  }
  document.getElementById("legendTitle").textContent =
    stay && (L === "sun" || L === "earth") ? t(`lg_${L}_stay`, { h: WS.mission.stayHours })
    : (L === "sun" || L === "earth") && dataPeriod() ? `${t("lg_" + L)} · ${t("hYear").toLowerCase()} ${new Date(dataPeriod().start).getUTCFullYear()}` : t("lg_" + L);
  const sr = PX && PX.scoreRange;
  if (L === "ice") setLegendTicks([[0, t("far")], [1, t("near")]]);
  else if (L === "score") sr ? setLegendTicks(sr[0] * 100, sr[1] * 100, v => String(Math.round(v))) : setLegendTicks([[0, t("lo")], [1, t("hi")]]);
  else if (L === "temp") setLegendTicks(-230, 120, v => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(Math.round(v))} °C`);
  else setLegendTicks(0, 100, v => Math.round(v) + "%");
  document.getElementById("legendMask").hidden = !(L === "score" || L === "earth");
  document.getElementById("legendEnergy").hidden = !(L === "energy" || (L === "score" && energyExcl()));
  document.querySelector("#legendMask span").textContent = t("maskShort");
}
function earthMostlyHidden(ee) {     // con l'evoluzione reale: quota dell'area senza Terra in vista, dai dati
  const P = PX;
  if (!(MAPDATA && MAPDATA.evo && P)) return ee < 0;
  let n = 0, hid = 0; for (let i = 0; i < P.inside.length; i += 5) if (P.inside[i]) { n++; if (P.mask[i] === 1) hid++; }
  return n > 0 && hid / n > .5;
}
function updateEphem() {
  const d = currentTime(), s = sunAt(d), e = earthAt(d), C = REGION;
  const sg = v => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(1) + "°";
  const ee = elevation(C.lat, C.lon, e);
  document.getElementById("ephem").innerHTML = t("ephem", {
      se: sg(elevation(C.lat, C.lon, s)), sa: bearing(C.lat, C.lon, s.lat, s.lon).toFixed(0) + "°",
      ee: sg(ee), ea: bearing(C.lat, C.lon, e.lat, e.lon).toFixed(0) + "°" })
    + (earthMostlyHidden(ee) ? `<br><span style="color:#ffd38a">${t(MAPDATA && MAPDATA.evo ? "earthHiddenData" : "earthBelow")}</span>` : "");
}

/* ---------- Periodo coperto dai dati del sito (es. 1 gen 2027 + 365 giorni) ---------- */
function dataPeriod() {
  const D = MAPDATA;
  if (!D || !D.period) return null;
  const start = +D.period.start, end = start + D.period.days * DAY;
  return { start, end, days: D.period.days };
}
// atterraggio + permanenza devono stare nel periodo; se no, prima finestra valida (Terra visibile) del periodo
function clampToPeriod() {
  const p = dataPeriod(), arrIns = document.querySelectorAll("input[data-arrival]"), stayIn = document.getElementById("mStay");
  if (!p) {
    MAX_OFFSET_H = 720;
    arrIns.forEach(el => { el.removeAttribute("min"); el.removeAttribute("max"); });
    stayIn.max = 720; updatePeriodUI(); return false;
  }
  const totalH = Math.floor((p.end - p.start) / 36e5);
  WS.mission.stayHours = Math.min(WS.mission.stayHours, totalH - 1);
  const latest = p.end - WS.mission.stayHours * 36e5;
  let a = new Date(WS.arrival).getTime(), moved = false;
  if (!(a >= p.start && a <= latest)) {
    a = +nextEarthWindow(new Date(p.start));
    if (a > latest) a = p.start;
    WS.arrival = toLocalInput(new Date(a)); moved = true;
  }
  MAX_OFFSET_H = Math.max(0, Math.floor((latest - a) / 36e5));
  WS.offsetH = Math.min(WS.offsetH, MAX_OFFSET_H);
  arrIns.forEach(el => { el.min = toLocalInput(new Date(p.start)); el.max = toLocalInput(new Date(latest)); });
  stayIn.max = totalH - 1;
  updatePeriodUI();
  return moved;
}
function updatePeriodUI() {
  const p = dataPeriod(), note = document.getElementById("periodNote"), cyc = document.querySelector('#horizonMode [data-h="cycle"]');
  const fmtD = ms => new Date(ms).toLocaleDateString(lang, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  if (note) { note.hidden = !p; if (p) note.textContent = t("periodNote", { a: fmtD(p.start), b: fmtD(p.end - 1), d: p.days }); }
  if (typeof timeSlider !== "undefined") timeSlider.max = MAX_OFFSET_H;
}

/* ---------- Evoluzione temporale ---------- */
const timeSlider = document.getElementById("timeSlider");
timeSlider.max = MAX_OFFSET_H;
function updateTimeUI() {
  timeSlider.value = WS.offsetH;
  timeSlider.style.setProperty("--p", (MAX_OFFSET_H ? WS.offsetH / MAX_OFFSET_H * 100 : 0) + "%");
  const d = Math.floor(WS.offsetH / 24), h = WS.offsetH % 24, ds = t("dayShort");
  const p = dataPeriod(), dayN = p ? Math.floor((+currentTime() - p.start) / DAY) + 1 : null;
  timeSlider.max = MAX_OFFSET_H;
  document.getElementById("timeLabel").innerHTML =
    `T+ ${d}${ds} ${String(h).padStart(2, "0")}h${p ? ` · ${t("dayOf", { n: dayN, d: p.days })}` : ""}<small>${currentTime().toLocaleString(lang, { dateStyle: "medium", timeStyle: "short" })}</small>`;
  const evo = MAPDATA && MAPDATA.evo, st = evo ? Math.round(evo.stepH) : 1;
  timeSlider.step = st;
  const ps = document.getElementById("playStep"); if (evo && +ps.value < st) ps.value = String(st);
  document.querySelectorAll(".timebar .tb[data-step]").forEach(b => {
    if (Math.abs(+b.dataset.step) < 24) b.dataset.step = String(Math.sign(+b.dataset.step) * st);
    const s = +b.dataset.step;
    b.textContent = (s < 0 ? "−" : "+") + (Math.abs(s) >= 24 ? Math.abs(s) / 24 + ds : Math.abs(s) + "h");
  });
}
function stepTime(h) {
  WS.offsetH = Math.max(0, Math.min(MAX_OFFSET_H, WS.offsetH + h));
  updateTimeUI(); updateEphem(); queueRecolor(true); saveParams();
}
// rotella sulla barra del tempo: avanti / indietro di un passo (un ricalcolo per fotogramma)
document.getElementById("timebar").addEventListener("wheel", e => {
  e.preventDefault();
  const st = MAPDATA && MAPDATA.evo ? Math.round(MAPDATA.evo.stepH) : 1, dy = e.deltaY || e.deltaX;
  if (dy) stepTime((dy > 0 ? 1 : -1) * st * (e.shiftKey ? 24 : 1));
}, { passive: false });
document.getElementById("timebar").addEventListener("click", e => {
  const b = e.target.closest(".tb[data-step]"); if (b) stepTime(+b.dataset.step);
});
let playTimer = null;
const btnPlay = document.getElementById("btnPlay");
function stopPlay() { clearInterval(playTimer); playTimer = null; btnPlay.textContent = "▶"; }
btnPlay.addEventListener("click", () => {
  if (playTimer) return stopPlay();
  if (WS.offsetH >= MAX_OFFSET_H) WS.offsetH = 0;
  btnPlay.textContent = "❚❚";
  playTimer = setInterval(() => {
    stepTime(+document.getElementById("playStep").value);
    if (WS.offsetH >= MAX_OFFSET_H) stopPlay();
  }, 450);
});


/* ---------- Rendering mappa 2D ---------- */
const mapCanvas = document.getElementById("mapCanvas");
const mctx = mapCanvas.getContext("2d");
const mapWrap = document.getElementById("mapWrap");
const mapTip = document.getElementById("mapTip");

/* --- evoluzione reale (bit per cella e per istante) --- */
function nearestCell(D, x, y) {
  const c = Math.max(0, Math.min(D.nx - 1, Math.round((x - D.gx0) / D.step))), r = Math.max(0, Math.min(D.ny - 1, Math.round((D.gy0 - y) / D.step)));
  return r * D.nx + c;
}
function sampleDS(arr, D, x, y) {        // bilineare; x, y in km nella proiezione della griglia (D.pc)
  let gx = (x - D.gx0) / D.step, gy = (D.gy0 - y) / D.step;
  gx = Math.max(0, Math.min(D.nx - 1.001, gx)); gy = Math.max(0, Math.min(D.ny - 1.001, gy));
  const j = gx | 0, i = gy | 0, fx = gx - j, fy = gy - i, W = D.nx;
  const a = arr[i * W + j], b = arr[i * W + j + 1], c = arr[(i + 1) * W + j], d = arr[(i + 1) * W + j + 1];
  const v = (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
  return isFinite(v) ? v : arr[Math.round(gy) * W + Math.round(gx)];
}

// La mappa di calore si calcola al massimo a HEAT_MAX px (i dati del sito sono 40×40 celle: di più non serve)
// e si disegna ingrandita con interpolazione; reticolo, testi e simboli restano nitidi alla risoluzione dello schermo.
const HEAT_MAX = 640, heatCanvas = document.createElement("canvas"), hctx = heatCanvas.getContext("2d");
// campionamento veloce con i pesi precalcolati in layoutMap (stessa interpolazione di sampleDS)
function fastS(arr, P, i) {
  const W = MAPDATA.nx, b = P.b0[i], fx = P.bfx[i], fy = P.bfy[i];
  const v = (arr[b] * (1 - fx) + arr[b + 1] * fx) * (1 - fy) + (arr[b + W] * (1 - fx) + arr[b + W + 1] * fx) * fy;
  return isFinite(v) ? v : arr[b + (fy > .5 ? W : 0) + (fx > .5 ? 1 : 0)];
}
function layoutMap() {
  if (!MAPDATA) return;
  const media = isMedia();                       // media annua: niente barra del tempo, la mappa usa tutta l'altezza
  // spazio libero ai lati per i riquadri sulla mappa (nel tempo: bilancio energetico a sinistra, livelli a destra)
  const side = media || document.body.classList.contains("phone") ? 20 : Math.min(262, mapWrap.clientWidth * .2);
  const css = Math.max(260, Math.min(mapWrap.clientWidth - 2 * side, mapWrap.clientHeight - (media ? 24 : 96)));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const SF = Math.min(1800, Math.round(css * dpr)), S = Math.min(SF, HEAT_MAX), k = S / css;
  mapCanvas.width = mapCanvas.height = SF;
  mapCanvas.style.width = mapCanvas.style.height = css + "px";
  mapCanvas.style.marginBottom = media ? "0px" : "72px";
  heatCanvas.width = heatCanvas.height = S;
  ORBIT.dirty = true;
  const viewDeg = REGION.r * WS.zoom;
  const margin = 58 * k, R = S / 2 - margin, scale = R / rForDeg(viewDeg);
  const n = S * S, D = MAPDATA, F = () => new Float32Array(n);
  const P = { S, SF, kd: SF / S, k, R, scale, viewDeg, cx: S / 2, cy: S / 2, css, inside: new Uint8Array(n),
    b0: new Int32Array(n), bfx: F(), bfy: F(),
    sunF: F(), earthF: F(), ice: F(), sHzE: F(), sHzS: F(), sphi: F(), cphi: F(), clam: F(), slam: F(), lat: F(), lon: F(),
    sunV: F(), earthV: F(), soc: F(), efail: new Uint8Array(n), tempC: F(), lit: new Uint8Array(n),
    gx: F(), gy: F(), cell: new Int32Array(n), land: new Uint8Array(n), enow: new Uint8Array(n),
    xs: F().fill(NaN), xq: F().fill(NaN), xd: F().fill(NaN), xn: F().fill(NaN), mcache: {},
    mask: new Uint8Array(n), score: F(), img: mctx.createImageData(S, S) };
  const R2 = R * R;
  if (!D.evo && D.ensureHz) D.ensureHz();
  const LA = D.extra && D.extra.atterrabile;
  for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
    const dx = px + .5 - S / 2, dy = S / 2 - (py + .5);
    if (dx * dx + dy * dy > R2) continue;
    const i = py * S + px, [lat, lon] = projInv(dx / scale, dy / scale), [x, y] = projFwd(lat, lon, D.pc);
    P.inside[i] = 1; P.lat[i] = lat; P.lon[i] = lon; P.gx[i] = x; P.gy[i] = y;
    if (D.nx) {                                  // pesi bilineari una volta sola: poi ogni campionamento costa 4 letture
      const gx = Math.max(0, Math.min(D.nx - 1.001, (x - D.gx0) / D.step)), gy = Math.max(0, Math.min(D.ny - 1.001, (D.gy0 - y) / D.step));
      const j = gx | 0, r = gy | 0; P.b0[i] = r * D.nx + j; P.bfx[i] = gx - j; P.bfy[i] = gy - r;
    }
    if (D.nx) { const kc = P.cell[i] = nearestCell(D, x, y); P.land[i] = LA ? (LA[kc] >= 50 ? 1 : 0) : 2; } else P.land[i] = 2;
    if (D.extra) { const X = D.extra;
      if (X.pendenza) P.xs[i] = sampleDS(X.pendenza, D, x, y); if (X.quota) P.xq[i] = sampleDS(X.quota, D, x, y);
      if (X.buio) P.xd[i] = sampleDS(X.buio, D, x, y); if (X.senzaCom) P.xn[i] = sampleDS(X.senzaCom, D, x, y); }
    const sf = sampleDS(D.sun, D, x, y);
    P.sunF[i] = sf; P.earthF[i] = sampleDS(D.earth, D, x, y); P.ice[i] = sampleDS(D.ice, D, x, y);
    const cp = Math.cos(lat * DEG);
    P.sphi[i] = Math.sin(lat * DEG); P.cphi[i] = cp; P.clam[i] = Math.cos(lon * DEG); P.slam[i] = Math.sin(lon * DEG);
    P.sHzE[i] = D.hz ? Math.sin(sampleDS(D.hz, D, x, y) * DEG) : 0;
    // orizzonte verso il Sole: dal dato se presente, altrimenti ricavato dalla frazione di illuminazione
    P.sHzS[i] = D.hzs ? Math.sin(sampleDS(D.hzs, D, x, y) * DEG) : D.evo ? 0 : Math.cos(Math.PI * sf) * cp;
  }
  PX = P;
  computeDynamic(); recolor();
}

// condizioni all'istante corrente e lungo la permanenza: Sole, Terra, batteria, temperatura, esclusioni
const T_SUBSOLAR_K = 386;              // equilibrio radiativo con Sole allo zenit (S=1361, albedo .12, ε=.95)
function surfaceTempC(sinElevSun, lit, sunFrac) {
  if (lit) {   // incidenza effettiva: +8° per la pendenza media locale verso il Sole
    const e = Math.asin(Math.max(-1, Math.min(1, sinElevSun))) + 8 * DEG;
    return T_SUBSOLAR_K * Math.pow(Math.max(.002, Math.sin(Math.min(Math.PI / 2, e))), .25) - 273.15;
  }
  // in ombra: ~40 K nelle zone in ombra permanente, ~100 K nelle normali notti lunari
  return 40 + 60 * Math.min(1, sunFrac * 3) - 273.15;
}
// vincoli facoltativi (solo quelli aggiunti dall'utente nella personalizzazione della missione)
function consFail(P, i, sv, ev) {
  const m = WS.mission, o = m.opt || {};
  return (o.minSun && sv < m.minSun / 100) || (o.minEarth && ev < m.minEarth / 100) || (o.maxIce && P.ice[i] > m.maxIce)
    || (o.landable && P.land[i] === 0) || (o.maxSlope && P.xs[i] > m.maxSlope)
    || (o.quota && (P.xq[i] < m.minQuota || P.xq[i] > m.maxQuota)) || (o.maxDark && P.xd[i] > m.maxDark) || (o.maxNoCom && P.xn[i] > m.maxNoCom);
}
const energyExcl = () => !!(WS.mission.opt && WS.mission.opt.energy && WS.mission.energyHard);
/* ---------- Modello energetico (pannello + batteria), uguale per mappa, siti e grafico ----------
   A ogni passo dt:  E ← min(capacità, E + (P_pannello − consumo)·dt)
   P_pannello = panelW × rendimento disco × fattore polvere, solo con il Sole visibile
     rendimento disco: frazione media del disco solare sopra l'orizzonte quando c'è luce (dalla energia_pct della cella; 1 senza dati)
     fattore polvere (come effemeridi.py, Hollick & O'Brien 2013): (1 − perdita all'atterraggio) × (1 − degrado annuo × anni dall'atterraggio)
   consumo: operativo (loadW) oppure risparmio (loadSaveW)
     risparmio quando la regola operativa non è soddisfatta (buio, o anche Terra non visibile) oppure la carica è sotto saveBelowPct
   guasto: carica sotto la riserva minima                                                                                  */
function energyCfg() {
  const m = WS.mission, cap = m.batteryWh;
  return { m, cap, reserve: cap * m.reservePct / 100, saveAt: cap * Math.max(m.reservePct, m.saveBelowPct || 0) / 100,
           rule: m.opMode || "sun", d0: Math.max(0, 1 - (m.dustInitPct || 0) / 100), dA: (m.dustYearPct || 0) / 100 / (365.25 * 24),
           h0: Math.max(0, WS.offsetH || 0) };       // ore dall'atterraggio all'inizio della finestra
}
const dustAt = (C, h) => Math.max(0, C.d0 * (1 - C.dA * (C.h0 + h)));
let E_SAVE = false;                     // l'ultimo passo era in modalità risparmio
function energyStep(C, Eb, lit, com, k, h, dt) {
  const ruleOk = C.rule === "always" || (C.rule === "sunEarth" ? lit && com : lit);
  E_SAVE = !ruleOk || Eb < C.saveAt;
  const gen = lit ? C.m.panelW * k * dustAt(C, h) : 0;
  return Math.min(C.cap, Eb + (gen - (E_SAVE ? C.m.loadSaveW : C.m.loadW)) * dt);
}
function computeDynamicEvo(P, D) {      // dati reali: Sole e Terra cella per cella ogni 6 h
  const E = D.evo, t0 = currentTime(), m = WS.mission, stay = WS.horizon === "stay", nc = E.nc;
  const ti0 = evoIdx(E, t0), nW = Math.max(1, Math.round(m.stayHours / E.stepH));
  const C = energyCfg(), cap = C.cap, reserve = C.reserve, PK = D.panelK;
  const cSun = new Float32Array(nc), cEarth = new Float32Array(nc), cSoc = new Float32Array(nc), cFail = new Uint8Array(nc), cLit = new Uint8Array(nc), cEN = new Uint8Array(nc);
  for (let k = 0; k < nc; k++) {
    let ns = 0, ne = 0, Eb = cap, minB = cap, fail = 0;
    for (let w = 0; w < nW; w++) {
      const ti = Math.min(E.n - 1, ti0 + w), lit = evoBit(E.luce, E, ti, k), com = evoBit(E.com, E, ti, k);
      ns += lit; ne += com;
      Eb = energyStep(C, Eb, lit, com, PK ? PK[k] : 1, (w + .5) * E.stepH, E.stepH); if (Eb < minB) minB = Eb; if (Eb < reserve) fail = 1;
    }
    cSun[k] = ns / nW; cEarth[k] = ne / nW; cSoc[k] = Math.max(0, minB) / cap; cFail[k] = fail;
    cLit[k] = evoBit(E.luce, E, ti0, k); cEN[k] = evoBit(E.com, E, ti0, k);
  }
  const S0 = bodyVec(sunAt(t0)), minS = m.minSun / 100, minE = m.minEarth / 100, maxI = m.maxIce;
  for (let i = 0; i < P.inside.length; i++) {
    if (!P.inside[i]) continue;
    const kc = P.cell[i];
    const sv = stay ? fastS(cSun, P, i) : P.sunF[i], ev = stay ? fastS(cEarth, P, i) : P.earthF[i];
    P.sunV[i] = sv; P.earthV[i] = ev; P.soc[i] = fastS(cSoc, P, i); P.efail[i] = cFail[kc];
    P.lit[i] = cLit[kc]; P.enow[i] = cEN[kc];
    const sinSun = P.sphi[i] * S0[0] + P.cphi[i] * (S0[1] * P.clam[i] + S0[2] * P.slam[i]);
    P.tempC[i] = surfaceTempC(sinSun, !!cLit[kc], P.sunF[i]);
    P.mask[i] = !stay ? (consFail(P, i, sv, ev) ? 2 : 0) : !cEN[kc] ? 1 : (energyExcl() && cFail[kc]) ? 3 : consFail(P, i, sv, ev) ? 2 : 0;
  }
  updateEphem();
}
function computeDynamic() {
  const P = PX; if (!P) return;
  if (MAPDATA && MAPDATA.evo) return computeDynamicEvo(P, MAPDATA);
  const t0 = currentTime(), m = WS.mission, stay = WS.horizon === "stay";
  const E0 = bodyVec(earthAt(t0)), S0 = bodyVec(sunAt(t0));
  // campioni lungo la permanenza (servono sempre per la batteria)
  const K = Math.max(12, Math.min(96, Math.ceil(m.stayHours / 1.5))), dt = m.stayHours / K;
  const SV = [], EV = [];
  for (let k = 0; k < K; k++) {
    const d = new Date(+t0 + (k + .5) * dt * 36e5);
    SV.push(bodyVec(sunAt(d))); EV.push(bodyVec(earthAt(d)));
  }
  const C = energyCfg(), cap = C.cap, reserve = C.reserve, PK = MAPDATA && MAPDATA.panelK;
  const minS = m.minSun / 100, minE = m.minEarth / 100, maxI = m.maxIce;
  for (let i = 0; i < P.inside.length; i++) {
    if (!P.inside[i]) continue;
    const sp = P.sphi[i], cp = P.cphi[i], cl = P.clam[i], sl = P.slam[i], hs = P.sHzS[i], he = P.sHzE[i];
    let ns = 0, ne = 0, E = cap, minB = cap, fail = 0;
    for (let k = 0; k < K; k++) {
      const s = SV[k], e = EV[k], lit = sp * s[0] + cp * (s[1] * cl + s[2] * sl) > hs, com = sp * e[0] + cp * (e[1] * cl + e[2] * sl) > he;
      if (lit) ns++; if (com) ne++;
      E = energyStep(C, E, lit, com, PK ? PK[P.cell[i]] : 1, (k + .5) * dt, dt);
      if (E < minB) minB = E;
      if (E < reserve) fail = 1;
    }
    const sv = stay ? ns / K : P.sunF[i], ev = stay ? ne / K : P.earthF[i];
    P.sunV[i] = sv; P.earthV[i] = ev;
    P.soc[i] = Math.max(0, minB) / cap; P.efail[i] = fail;
    const sinSun = sp * S0[0] + cp * (S0[1] * cl + S0[2] * sl), litNow = sinSun > hs;
    P.lit[i] = litNow ? 1 : 0;
    P.tempC[i] = surfaceTempC(sinSun, litNow, P.sunF[i]);
    const earthNow = sp * E0[0] + cp * (E0[1] * cl + E0[2] * sl) > he;
    P.enow[i] = earthNow ? 1 : 0;
    P.mask[i] = !stay ? (consFail(P, i, sv, ev) ? 2 : 0) : !earthNow ? 1 : (energyExcl() && fail) ? 3 : consFail(P, i, sv, ev) ? 2 : 0;
  }
  updateEphem();
}
const tempToV = c => c < 0 ? .5 * Math.max(0, (c + 230) / 230) : .5 + .5 * Math.min(1, c / 120);

/* ---------- Strati: media annua (mappe del file) e andamento nel tempo ---------- */
const T_LAYERS = ["score", "sun", "earth", "ice", "energy", "temp"];      // "Luce ora" e "Terra ora" tolti: ridondanti
const M_LAYERS = ["cross", "m_luce", "m_com", "m_lc", "m_lcl", "m_energia", "m_buio", "m_nocom", "m_quota", "m_pend", "m_land", "m_ice"];
// sorgente per cella, palette, scala (fissa o dai dati), unità
const MDEF = {
  m_luce:    { src: D => D.sun, pal: "sun", fix: [0, 1], pct: true },
  m_com:     { src: D => D.earth, pal: "earth", fix: [0, 1], pct: true },
  m_lc:      { src: D => D.extra && D.extra.luceCom, k: .01, pal: "sun", fix: [0, 1], pct: true },
  m_lcl:     { src: D => D.extra && D.extra.luceCom, k: .01, pal: "sun", fix: [0, 1], pct: true, landOnly: true },
  m_energia: { src: D => D.extra && D.extra.energia, k: .01, pal: "copper", fix: [0, 1], pct: true },
  m_buio:    { src: D => D.extra && D.extra.buio, pal: "hours", unit: "h" },
  m_nocom:   { src: D => D.extra && D.extra.senzaCom, pal: "hours", unit: "h" },
  m_quota:   { src: D => D.extra && D.extra.quota, pal: "quota", unit: "m" },
  m_pend:    { src: D => D.extra && D.extra.pendenza, pal: "slope", fix: [0, 25], unit: "°" },
  m_land:    { src: D => D.extra && D.extra.atterrabile, k: .01, pal: "land", fix: [0, 1], pct: true },
  m_ice:     { src: D => D.iceProb, pal: "ice", fix: [0, 1], pct: true },
};
const layerPal = L => L === "cross" ? "score" : L === "sunNow" ? "sun" : L === "earthNow" ? "earth" : MDEF[L] ? MDEF[L].pal : L;
const layerAvail = L => { const d = MDEF[L]; return !d || !!(MAPDATA && d.src(MAPDATA)); };
function renderLayerTabs() {
  const list = (isMedia() ? M_LAYERS : T_LAYERS).filter(layerAvail);
  if (!list.includes(WS.layer)) WS.layer = list[0];
  const box = document.getElementById("layerTabs");
  const html = list.map(L => `<button data-layer="${L}" class="${L === WS.layer ? "active" : ""}">${esc(t("l_" + L))}</button>`).join("");
  if (box.innerHTML !== html) box.innerHTML = html;
}
// incrocio dei dati (media annua): ogni mappa normalizzata 0-1 (1 = meglio), media pesata delle mappe scelte
const CROSS = [
  { id: "luce", up: true, get: D => D.sun }, { id: "com", up: true, get: D => D.earth },
  { id: "ice", up: true, get: D => D.iceProb ? iceNear(D) : Float32Array.from(D.ice, iceScore) },
  { id: "energia", up: true, get: D => D.extra && D.extra.energia, k: .01 }, { id: "lc", up: true, get: D => D.extra && D.extra.luceCom, k: .01 },
  { id: "land", up: true, get: D => D.extra && D.extra.atterrabile, k: .01 }, { id: "pend", up: false, get: D => D.extra && D.extra.pendenza, fix: [0, 25] },
  { id: "buio", up: false, get: D => D.extra && D.extra.buio, rel: true }, { id: "nocom", up: false, get: D => D.extra && D.extra.senzaCom, rel: true },
  { id: "quota", up: true, get: D => D.extra && D.extra.quota, rel: true },
];
function iceNear(D, km = 2) {           // indice di ghiaccio più alto entro km dalla cella
  if (D._iceNear) return D._iceNear;
  const n = D.sun.length, out = new Float32Array(n), R = Math.max(1, Math.round(km / D.step));
  for (let k = 0; k < n; k++) {
    const r = Math.floor(k / D.nx), c = k % D.nx; let m = 0;
    for (let dr = -R; dr <= R; dr++) for (let dc = -R; dc <= R; dc++) {
      const rr = r + dr, cc = c + dc; if (rr < 0 || cc < 0 || rr >= D.ny || cc >= D.nx || dr * dr + dc * dc > R * R) continue;
      m = Math.max(m, D.iceProb[rr * D.nx + cc]);
    }
    out[k] = m;
  }
  return (D._iceNear = out);
}
function crossNorm(D, c) {
  D._cn = D._cn || {};
  if (D._cn[c.id] !== undefined) return D._cn[c.id];
  const a = c.get(D); if (!a) return (D._cn[c.id] = null);
  const n = a.length, out = new Float32Array(n);
  let lo = Infinity, hi = -Infinity; for (const v of a) if (isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  if (c.fix) [lo, hi] = c.fix;
  for (let k = 0; k < n; k++) {
    const v = a[k]; let u = !isFinite(v) ? 0 : c.rel || c.fix ? (v - lo) / Math.max(1e-9, hi - lo) : v * (c.k || 1);
    u = Math.max(0, Math.min(1, u)); out[k] = c.up ? u : 1 - u;
  }
  return (D._cn[c.id] = out);
}
/* ---------- Score: un solo modo di combinare i pesi, in tutte e due le viste ----------
   media aritmetica pesata  Σ wᵢ·xᵢ / Σ wᵢ            (compensativa: una risorsa alta compensa una bassa)
   media geometrica pesata  exp(Σ wᵢ·ln xᵢ / Σ wᵢ)    (se una risorsa con peso > 0 manca, il punteggio crolla)
   Sole, Comunicazione e Ghiaccio usano SEMPRE i pesi di progetto (anche nell'incrocio della media annua).
   Ghiaccio = indice del gruppo Effemeridi (ombra permanente) più alto entro 2 km: 1, 0,5 o 0.          */
const GEO_EPS = .02;
function wMean(ws, xs) {
  let sw = 0, acc = 0; const geo = WS.meanMode === "geo";
  for (let j = 0; j < ws.length; j++) { const w = ws[j]; if (!(w > 0)) continue; const x = Math.max(0, Math.min(1, xs[j])); sw += w; acc += geo ? w * Math.log(Math.max(GEO_EPS, x)) : w * x; }
  return sw > 0 ? (geo ? Math.exp(acc / sw) : acc / sw) : 0;
}
const LINKED_W = { luce: "sun", com: "earth", ice: "ice" };           // righe dell'incrocio legate ai pesi di progetto
const crossW = c => LINKED_W[c.id] ? WS.weights[LINKED_W[c.id]] : (WS.cross[c.id] && WS.cross[c.id].on ? WS.cross[c.id].w : 0);
function crossCells(D) {
  const n = D.sun.length, out = new Float32Array(n), ws = [], arrs = [];
  for (const c of CROSS) { const w = crossW(c); if (!(w > 0)) continue; const a = crossNorm(D, c); if (!a) continue; ws.push(w); arrs.push(a); }
  const xs = new Array(arrs.length);
  for (let k = 0; k < n; k++) { for (let j = 0; j < arrs.length; j++) xs[j] = arrs[j][k]; out[k] = wMean(ws, xs); }
  return out;
}
// ghiaccio per pixel, con la stessa definizione della media annua (fallback: distanza dal ghiaccio per dati senza indice)
function iceU(P, i) {
  if (!P.iceU) {
    const D = MAPDATA, n = P.inside.length; P.iceU = new Float32Array(n);
    const IN = D && D.iceProb ? iceNear(D) : null;
    for (let q = 0; q < n; q++) if (P.inside[q]) P.iceU[q] = IN ? Math.max(0, Math.min(1, sampleDS(IN, D, P.gx[q], P.gy[q]))) : iceScore(P.ice[q]);
  }
  return P.iceU[i];
}
function renderCrossBox() {
  const box = document.getElementById("crossBox"), D = MAPDATA;
  const html = CROSS.filter(c => !D || c.get(D)).map(c => { const st = WS.cross[c.id], lk = LINKED_W[c.id];
    if (lk) { const w = WS.weights[lk], mn = WMIN(lk);
      return `<div class="cross-row linked ${w > 0 ? "" : "off"}"><label title="${esc(t("xLinked"))}"><span class="lk">🔗</span>${esc(t("x_" + c.id))} <small>↑</small></label>
      <input type="range" min="${mn}" max="10" step="1" value="${w}" id="cross-${lk}" data-param="${lk}" style="--p:${(w - mn) / (10 - mn) * 100}%"><output id="cross-${lk}-out">${w}</output></div>`; }
    return `<div class="cross-row ${st.on ? "" : "off"}"><label><input type="checkbox" data-cross-on="${c.id}" ${st.on ? "checked" : ""}>${esc(t("x_" + c.id))} <small>${c.up ? "↑" : "↓"}</small></label>
      <input type="range" min="1" max="10" step="1" value="${st.w}" data-cross-w="${c.id}" style="--p:${(st.w - 1) / 9 * 100}%"><output>${st.w}</output></div>`; }).join("")
      + `<p class="cross-note">🔗 ${esc(t("xLinked"))}</p>`;
  if (box.dataset.h !== html) { box.innerHTML = html; box.dataset.h = html; }
}
document.getElementById("crossBox").addEventListener("input", e => {
  const el = e.target, id = el.dataset.crossOn || el.dataset.crossW; if (!id) return;
  if (el.dataset.crossOn) WS.cross[id].on = el.checked; else WS.cross[id].w = +el.value;
  renderCrossBox(); queueRecolor(); saveParams();
});
function applyViewMode() {
  const media = isMedia(), sm = document.getElementById("stageMap"), was = sm.classList.contains("media");
  sm.classList.toggle("media", media);
  if (was !== media && PX) requestAnimationFrame(() => layoutMap());   // cambia lo spazio disponibile
  if (media) { try { if (ORBIT.on) setOrbit(false); if (playTimer) stopPlay(); } catch (e) {} }
  renderLayerTabs(); renderCrossBox();
}
// valori per pixel di uno strato del file (media annua), con la scala per la legenda
function mediaLayer(P, D, L) {
  if (P.mcache[L]) return P.mcache[L];
  const d = MDEF[L], a = d.src(D), n = P.inside.length, out = new Float32Array(n).fill(NaN);
  let lo = Infinity, hi = -Infinity;
  if (d.fix) [lo, hi] = d.fix;
  else for (const v of a) if (isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  const k = d.k || 1;
  for (let i = 0; i < n; i++) if (P.inside[i]) {
    if (d.landOnly && P.land[i] === 0) continue;
    const v = (D.nx ? fastS(a, P, i) : sampleDS(a, D, P.gx[i], P.gy[i])) * k;
    out[i] = (v - (d.fix ? lo : lo)) / Math.max(1e-9, hi - lo);
  }
  return (P.mcache[L] = { v: out, lo, hi });
}
function recolor() {
  const P = PX; if (!P) return;
  const d = P.img.data, w = WS.weights, WV = [w.sun, w.earth, w.ice], L = WS.layer, lut = LUTS[layerPal(L)], D = MAPDATA, media = isMedia();
  const CC = media ? crossCells(D) : null, ML = MDEF[L] ? mediaLayer(P, D, L) : null;
  const hatch = Math.max(6, 7 * P.k) | 0, hw = Math.max(2, 2.5 * P.k);
  let lo = 1, hi = 0;
  for (let i = 0; i < P.inside.length; i++) if (P.inside[i]) {
    const sc = P.score[i] = media ? (D.nx ? fastS(CC, P, i) : sampleDS(CC, D, P.gx[i], P.gy[i])) : wMean(WV, [P.sunV[i], P.earthV[i], iceU(P, i)]);
    if (!P.mask[i]) { if (sc < lo) lo = sc; if (sc > hi) hi = sc; }
  }
  if (hi <= lo) { lo = 0; hi = 1; }
  if (hi - lo < .2) { const mm = (hi + lo) / 2; lo = Math.max(0, mm - .1); hi = Math.min(1, lo + .2); }
  P.scoreRange = [lo, hi];
  updateLegend();
  for (let py = 0; py < P.S; py++) for (let px = 0; px < P.S; px++) {
    const i = py * P.S + px, o = i * 4;
    if (!P.inside[i]) { d[o + 3] = 0; continue; }
    const v = L === "score" || L === "cross" ? (P.score[i] - lo) / (hi - lo) : L === "sun" ? P.sunV[i] : L === "earth" ? P.earthV[i]
      : L === "sunNow" ? (P.lit[i] ? .9 : .04) : L === "earthNow" ? (P.enow[i] ? .9 : .04)
      : ML ? ML.v[i] : L === "energy" ? P.soc[i] : L === "temp" ? tempToV(P.tempC[i]) : iceU(P, i);
    if (ML && !isFinite(v)) { const on = (px + py) % hatch < hw; d[o] = on ? 70 : 38; d[o + 1] = on ? 72 : 40; d[o + 2] = on ? 78 : 46; d[o + 3] = 255; continue; }
    const li = Math.max(0, Math.min(255, v * 255 | 0)) * 3;
    const red = (L === "energy" && P.efail[i]) || (L === "score" && P.mask[i] === 3);
    const masked = !red && P.mask[i] && (L === "score" || L === "cross" || (L === "earth" && P.mask[i] === 1));
    if (red) {                       // batteria sotto riserva: tratteggio rosso
      const on = (px - py + 4096) % hatch < hw;
      d[o] = on ? 220 : 59; d[o + 1] = on ? 38 : 13; d[o + 2] = on ? 38 : 16;
    } else if (masked) {
      const g = (lut[li] + lut[li + 1] + lut[li + 2]) / 3, on = (px + py) % hatch < hw;
      const f = on ? .55 : .22, base = on ? 70 : 14;
      d[o] = base + g * f; d[o + 1] = base + 4 + g * f; d[o + 2] = base + 14 + g * f;
    } else { d[o] = lut[li]; d[o + 1] = lut[li + 1]; d[o + 2] = lut[li + 2]; }
    d[o + 3] = 255;
  }
  P.mrange = ML ? [ML.lo, ML.hi] : null; updateLegend();
  computeSites(); drawOverlays(); renderSites(); updateProbe();
  ORBIT.dirty = true;
}

function computeSites() {
  const P = PX, step = Math.max(3, (P.S / 170) | 0), cand = [];   // ~14k candidates: enough for 5 well-spaced sites
  for (let py = 0; py < P.S; py += step) for (let px = 0; px < P.S; px += step) {
    const i = py * P.S + px;
    if (P.inside[i] && !P.mask[i]) cand.push(i);
  }
  // a parità di punteggio, preferisci i punti migliori sul lungo periodo (ciclo lunare)
  const w = WS.weights, WV = [w.sun, w.earth, w.ice];
  const key = i => P.score[i] + .01 * wMean(WV, [P.sunF[i], P.earthF[i], iceU(P, i)]);
  const keys = new Map(cand.map(i => [i, key(i)]));
  cand.sort((a, b) => keys.get(b) - keys.get(a));
  const minPx = Math.max(.4, degToKm(P.viewDeg) * .07) * P.scale, picks = [];
  for (const i of cand) {
    const px = i % P.S, py = (i / P.S) | 0;
    if (picks.every(p => Math.hypot(p.px - px, p.py - py) > minPx)) {
      picks.push({ px, py, lat: P.lat[i], lon: P.lon[i], score: P.score[i], sun: P.sunV[i], earth: P.earthV[i], ice: P.ice[i], soc: P.soc[i] });
      if (picks.length === 5) break;
    }
  }
  SITES = picks;
  if (selectedSite >= SITES.length) selectedSite = -1;
}

function niceStep(raw) { return [.01, .02, .05, .1, .25, .5, 1, 2, 5, 10, 15, 30, 45].find(s => s >= raw) || 45; }


// assi cardinali sulla mappa 2D: direzioni N-S-E-W valide al centro dell'area
function drawCardinals() {
  const P = PX; if (!P) return;
  const c = mctx, k = P.k, d = .01 * Math.max(.05, P.viewDeg);   // (disegnato dopo drawOverlays0: stessa trasformazione)
  const [x0, y0] = projFwd(REGION.lat, REGION.lon), [x1, y1] = projFwd(Math.min(89.99, REGION.lat + d), REGION.lon);
  let ang = Math.atan2(x1 - x0, y1 - y0);               // 0 = nord in alto
  if (!isFinite(ang)) ang = 0;
  const dirs = [["N", 0, "#fde047"], ["E", Math.PI / 2, "#e5e7eb"], ["S", Math.PI, "#e5e7eb"], ["W", -Math.PI / 2, "#e5e7eb"]];
  c.save();
  c.beginPath(); c.arc(P.cx, P.cy, P.R, 0, 2 * Math.PI); c.clip();
  c.setLineDash([6 * k, 6 * k]); c.lineWidth = 1 * k; c.strokeStyle = "rgba(253,224,71,.22)";
  for (const a of [ang, ang + Math.PI / 2]) {
    c.beginPath(); c.moveTo(P.cx - Math.sin(a) * P.R, P.cy + Math.cos(a) * P.R); c.lineTo(P.cx + Math.sin(a) * P.R, P.cy - Math.cos(a) * P.R); c.stroke();
  }
  c.restore(); c.save();
  for (const [lab, off, col] of dirs) {
    const a = ang + off, r = P.R + 17 * k, x = P.cx + Math.sin(a) * r, y = P.cy - Math.cos(a) * r;
    c.strokeStyle = col; c.lineWidth = 1.5 * k;
    c.beginPath(); c.moveTo(P.cx + Math.sin(a) * P.R, P.cy - Math.cos(a) * P.R); c.lineTo(P.cx + Math.sin(a) * (P.R + 6 * k), P.cy - Math.cos(a) * (P.R + 6 * k)); c.stroke();
    c.fillStyle = "rgba(15,17,21,.95)"; c.lineWidth = 1.5 * k;
    c.beginPath(); c.arc(x, y, 10 * k, 0, 2 * Math.PI); c.fill(); c.stroke();
    c.fillStyle = col; c.font = `600 ${11 * k}px "IBM Plex Sans", Inter, sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(lab, x, y + .5 * k);
  }
  c.restore();
}
function drawOverlays() { drawOverlays0(); try { drawCardinals(); } catch (e) {} }
function buildGraticule(P, cen, toPx, inView) {
  const k = P.k, path = new Path2D(), labels = [];
  const latStep = niceStep(P.viewDeg / 5);
  const lonStep = niceStep(latStep / Math.max(.005, Math.cos(REGION.lat * DEG)));   // vicino al polo i meridiani convergono
  const poleIn = Math.abs(REGION.lat) + P.viewDeg * 1.25 >= 90;
  const lonWin = la => poleIn ? 180 : Math.min(180, P.viewDeg * 1.4 / Math.max(.01, Math.cos(la * DEG)));
  const drawLine = (pts, label) => {
    let pen = false, best = null;
    for (const [la, lo] of pts) {
      if (!inView(la, lo)) { pen = false; continue; }
      const [x, y] = toPx(la, lo);
      pen ? path.lineTo(x, y) : path.moveTo(x, y); pen = true;
      const rr = Math.hypot(x - P.cx, y - P.cy);
      if (rr < P.R - 18 * k && (!best || rr > best[2])) best = [x, y, rr];
    }
    if (best && label) labels.push([label, best[0], best[1]]);
  };
  const latFrom = Math.ceil((Math.max(-89.999, REGION.lat - P.viewDeg * 1.2)) / latStep) * latStep;
  const latTo = Math.min(89.999, REGION.lat + P.viewDeg * 1.2);
  for (let la = latFrom; la <= latTo; la += latStep) {
    if (Math.abs(la) >= 90) continue;
    const w = lonWin(la), pts = [], dl = Math.max(.02, Math.min(.25, P.viewDeg / 40 / Math.max(.01, Math.cos(la * DEG))));
    for (let lo = REGION.lon - w; lo <= REGION.lon + w; lo += dl) pts.push([la, lo]);
    drawLine(pts, `${Math.abs(la).toFixed(latStep < .1 ? 2 : latStep < 1 ? 1 : 0)}°${la >= 0 ? "N" : "S"}`);
  }
  const la0 = Math.max(-89.999, REGION.lat - P.viewDeg * 1.25), la1 = Math.min(89.999, REGION.lat + P.viewDeg * 1.25), w0 = lonWin(REGION.lat);
  for (let lo = -180; lo < 180; lo += lonStep) {
    if (!poleIn && Math.abs(wrap180(lo - REGION.lon)) > w0) continue;
    const pts = [], dla = Math.max(.002, Math.min(.1, P.viewDeg / 60));
    for (let la = la0; la <= la1; la += dla) pts.push([la, lo]);
    drawLine(pts, lo === 0 ? "0°" : Math.abs(lo) === 180 ? "180°" : `${Math.abs(lo)}°${lo > 0 ? "E" : "W"}`);
  }
  return { path, labels };
}
function drawOverlays0() {
  if (!PX) return;
  const P = PX, c = mctx, k = P.k, cen = unit(REGION.lat, REGION.lon);
  const toPx = (lat, lon) => { const [x, y] = projFwd(lat, lon); return [P.cx + x * P.scale, P.cy - y * P.scale]; };
  const inView = (lat, lon, pad = 1.15) => angDeg(cen, unit(lat, lon)) <= P.viewDeg * pad;
  hctx.putImageData(P.img, 0, 0);
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, P.SF, P.SF);
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = "high";
  c.drawImage(heatCanvas, 0, 0, P.SF, P.SF);
  c.setTransform(P.kd, 0, 0, P.kd, 0, 0);
  c.save();
  c.beginPath(); c.arc(P.cx, P.cy, P.R, 0, 2 * Math.PI); c.clip();
  c.lineWidth = 1 * k; c.strokeStyle = "rgba(255,255,255,.2)";
  c.font = `${10 * k}px Inter, sans-serif`; c.textBaseline = "middle";
  // reticolo: calcolato una volta per disposizione (P.grat) e solo nella zona visibile; poi si ridisegna dalla cache
  if (!P.grat) P.grat = buildGraticule(P, cen, toPx, inView);
  c.stroke(P.grat.path);
  const labels = P.grat.labels;
  c.textAlign = "center";
  for (const [txt, x, y] of labels) {
    const tw = c.measureText(txt).width;
    c.fillStyle = "rgba(17,18,20,.6)"; c.fillRect(x - tw / 2 - 3 * k, y - 7 * k, tw + 6 * k, 14 * k);
    c.fillStyle = "rgba(240,242,248,.85)"; c.fillText(txt, x, y);
  }
  if (WS.craters) {
    c.setLineDash([4 * k, 3 * k]); c.lineWidth = 1.2 * k; c.font = `600 ${10.5 * k}px Inter, sans-serif`;
    for (const cr of MAPDATA.craters) {
      if (angDeg(cen, unit(cr.lat, cr.lon)) > P.viewDeg + cr.d / 2 / MOON_R / DEG) continue;
      const [x, y] = toPx(cr.lat, cr.lon), r = cr.d / 2 * P.scale;
      c.strokeStyle = cr.ice ? "rgba(169,216,255,.8)" : "rgba(255,255,255,.55)";
      c.beginPath(); c.arc(x, y, r, 0, 2 * Math.PI); c.stroke();
      // etichetta: al centro se è nella mappa, altrimenti sul bordo del cratere visibile (con "bordo")
      let lx = x, ly = y, txt = cr.name;
      const dc = Math.hypot(x - P.cx, y - P.cy);
      if (dc > P.R - 12 * k) {
        const ux = (P.cx - x) / dc, uy = (P.cy - y) / dc;
        lx = x + ux * (r + 14 * k); ly = y + uy * (r + 14 * k);
        if (Math.hypot(lx - P.cx, ly - P.cy) > P.R - 10 * k) continue;
        txt = t("craterRim", { n: cr.name });
      }
      const tw = c.measureText(txt).width;
      c.fillStyle = "rgba(17,18,20,.7)"; c.fillRect(lx - tw / 2 - 3 * k, ly - 7 * k, tw + 6 * k, 14 * k);
      c.fillStyle = cr.ice ? "#cfe9ff" : "#fff"; c.fillText(txt, lx, ly);
    }
    c.setLineDash([]);
  }
  c.strokeStyle = "#fff"; c.lineWidth = 1.5 * k;
  c.beginPath(); c.moveTo(P.cx - 5 * k, P.cy); c.lineTo(P.cx + 5 * k, P.cy); c.moveTo(P.cx, P.cy - 5 * k); c.lineTo(P.cx, P.cy + 5 * k); c.stroke();
  SITES.forEach((s, n) => {
    const sel = n === selectedSite, r = (sel ? 12 : 9) * k;
    if (sel) { c.beginPath(); c.arc(s.px, s.py, r + 6 * k, 0, 2 * Math.PI); c.fillStyle = "rgba(255,255,255,.18)"; c.fill(); }
    c.beginPath(); c.arc(s.px, s.py, r, 0, 2 * Math.PI);
    c.fillStyle = "#fff"; c.fill(); c.lineWidth = 2 * k; c.strokeStyle = "#111214"; c.stroke();
    c.fillStyle = "#111214"; c.font = `700 ${(sel ? 12 : 10) * k}px Orbitron, Inter, sans-serif`;
    c.fillText(n + 1, s.px, s.py + .5 * k);
  });
  if (PROBE) {                       // punto scelto con un clic
    const [x, y] = toPx(PROBE.lat, PROBE.lon);
    c.strokeStyle = "#fff"; c.lineWidth = 2 * k;
    c.beginPath(); c.arc(x, y, 8 * k, 0, 2 * Math.PI); c.stroke();
    c.beginPath(); c.moveTo(x - 13 * k, y); c.lineTo(x - 4 * k, y); c.moveTo(x + 4 * k, y); c.lineTo(x + 13 * k, y);
    c.moveTo(x, y - 13 * k); c.lineTo(x, y - 4 * k); c.moveTo(x, y + 4 * k); c.lineTo(x, y + 13 * k); c.stroke();
  }
  c.restore();
  c.lineWidth = 1.5 * k; c.strokeStyle = "rgba(127,211,255,.6)";
  c.beginPath(); c.arc(P.cx, P.cy, P.R, 0, 2 * Math.PI); c.stroke();
  const d = currentTime();
  if (!isMedia()) { drawBody(sunAt(d), "sun"); drawBody(earthAt(d), "earth"); }
}

function screenAngle(body) {
  const a = unit(REGION.lat, REGION.lon), b = unit(body.lat, body.lon), dd = angDeg(a, b) * DEG;
  if (dd < 1e-6) return 0;
  const tt = Math.min(dd, PX.viewDeg * DEG * .5) / dd, s = Math.sin(dd);
  const w1 = Math.sin((1 - tt) * dd) / s, w2 = Math.sin(tt * dd) / s;
  const v = [a[0] * w1 + b[0] * w2, a[1] * w1 + b[1] * w2, a[2] * w1 + b[2] * w2];
  const [x, y] = projFwd(Math.asin(v[2]) / DEG, Math.atan2(v[1], v[0]) / DEG);
  return Math.atan2(x, y);
}

function drawBody(body, kind) {
  const P = PX, c = mctx, k = P.k, a = screenAngle(body), rr = P.R + 41 * k;
  const x = P.cx + rr * Math.sin(a), y = P.cy - rr * Math.cos(a), r = 13 * k;
  const up = elevation(REGION.lat, REGION.lon, body) > 0;
  c.save(); c.globalAlpha = up ? 1 : .45;
  c.strokeStyle = kind === "sun" ? "#fbbf24" : "#38bdf8"; c.lineWidth = 2.5 * k;
  c.beginPath(); c.moveTo(P.cx + (P.R - 6 * k) * Math.sin(a), P.cy - (P.R - 6 * k) * Math.cos(a));
  c.lineTo(P.cx + (P.R + 9 * k) * Math.sin(a), P.cy - (P.R + 9 * k) * Math.cos(a)); c.stroke();
  if (kind === "sun") {
    c.strokeStyle = "#fbbf24"; c.lineWidth = 2 * k;
    for (let i = 0; i < 8; i++) {
      const b = i * Math.PI / 4;
      c.beginPath(); c.moveTo(x + Math.cos(b) * (r + 3 * k), y + Math.sin(b) * (r + 3 * k));
      c.lineTo(x + Math.cos(b) * (r + 8 * k), y + Math.sin(b) * (r + 8 * k)); c.stroke();
    }
    const g = c.createRadialGradient(x - 3 * k, y - 3 * k, 1, x, y, r);
    g.addColorStop(0, "#fffbe6"); g.addColorStop(.5, "#fcd34d"); g.addColorStop(1, "#f59e0b");
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 2 * Math.PI); c.fill();
  } else {
    c.fillStyle = "rgba(56,189,248,.28)"; c.beginPath(); c.arc(x, y, r + 5 * k, 0, 2 * Math.PI); c.fill();
    const g = c.createRadialGradient(x - 4 * k, y - 4 * k, 1, x, y, r);
    g.addColorStop(0, "#7dd3fc"); g.addColorStop(1, "#1d4ed8");
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 2 * Math.PI); c.fill();
    c.save(); c.beginPath(); c.arc(x, y, r, 0, 2 * Math.PI); c.clip();
    c.fillStyle = "#4ade80";
    c.beginPath(); c.ellipse(x - 4 * k, y - 2 * k, 5.5 * k, 3.8 * k, .6, 0, 2 * Math.PI); c.fill();
    c.beginPath(); c.ellipse(x + 5 * k, y + 5 * k, 4.4 * k, 2.8 * k, -.4, 0, 2 * Math.PI); c.fill();
    c.restore();
    c.strokeStyle = "rgba(255,255,255,.85)"; c.lineWidth = 1.5 * k;
    c.beginPath(); c.arc(x, y, r, 0, 2 * Math.PI); c.stroke();
  }
  c.font = `600 ${10.5 * k}px Inter, sans-serif`; c.fillStyle = kind === "sun" ? "#fde68a" : "#bae6fd";
  c.textAlign = "center"; c.textBaseline = "middle";
  const lbl = t(kind === "sun" ? "sunLbl" : "earthLbl"), tw = c.measureText(lbl).width;
  const lx = Math.max(tw / 2 + 3 * k, Math.min(P.S - tw / 2 - 3 * k, x)), ly = Math.max(8 * k, Math.min(P.S - 8 * k, y + r + 13 * k));
  c.lineWidth = 3 * k; c.strokeStyle = "rgba(10,11,13,.85)"; c.strokeText(lbl, lx, ly); c.fillText(lbl, lx, ly);
  c.restore();
}

function renderSites() {
  const ol = document.getElementById("sitesList");
  if (!SITES.length) { ol.innerHTML = `<li class="empty">${t("noSites")}</li>`; return; }
  ol.innerHTML = SITES.map((s, n) => `
    <li><button data-site="${n}" class="${n === selectedSite ? "sel" : ""}">
      <span class="n">${n + 1}</span>
      <span>${fmtLL(s.lat, s.lon)}</span>
      <span class="sc">${Math.round(s.score * 100)}</span>
      <span class="vals">
        <span><i style="background:#fbbf24"></i>${Math.round(s.sun * 100)}%</span>
        <span><i style="background:#2dd4bf"></i>${Math.round(s.earth * 100)}%</span>
        <span><i style="background:#93c5fd"></i>${s.ice > 999 ? "—" : s.ice.toFixed(1) + " km"}</span>
      </span>
    </button></li>`).join("");
}
document.getElementById("sitesList").addEventListener("click", e => {
  const b = e.target.closest("button[data-site]"); if (!b) return;
  selectedSite = +b.dataset.site === selectedSite ? -1 : +b.dataset.site;
  PROBE = null;
  drawOverlays(); renderSites(); updateProbe();
});

mapCanvas.addEventListener("mousemove", e => {
  if (!PX) return;
  const rect = mapCanvas.getBoundingClientRect(), P = PX;
  const px = (e.clientX - rect.left) * P.k, py = (e.clientY - rect.top) * P.k;
  const i = (py | 0) * P.S + (px | 0);
  if (!P.inside[i]) { mapTip.style.display = "none"; return; }
  const now = currentTime(), sNow = elevation(P.lat[i], P.lon[i], sunAt(now)), eNow = elevation(P.lat[i], P.lon[i], earthAt(now));
  const litNow = Math.sin(sNow * DEG) > P.sHzS[i], earthNow = Math.sin(eNow * DEG) > P.sHzE[i];
  mapTip.innerHTML = `<b>${fmtLL(P.lat[i], P.lon[i])}</b>
    <div class="row"><span>${t("tNow")}</span><span>${t(litNow ? "sunUp" : "sunDown")} · ${t(earthNow ? "earthUp" : "earthDown")}</span></div>
    <div class="row"><span>${t("tipSun")}</span><span>${Math.round(P.sunV[i] * 100)}%</span></div>
    <div class="row"><span>${t("tipEarth")}</span><span>${Math.round(P.earthV[i] * 100)}%</span></div>
    <div class="row"><span>${t("tipIce")}</span><span>${P.ice[i] > 999 ? "—" : P.ice[i].toFixed(1) + " km"}</span></div>
    <div class="row"><span>${t("tipTemp")}</span><span>${Math.round(P.tempC[i])} °C</span></div>
    ${siteExtraRows(P.lat[i], P.lon[i])}
    <div class="row"><span>${t("tipBatt")}</span><span>${Math.round(P.soc[i] * 100)}%${P.efail[i] ? " ✕" : ""}</span></div>
    ${P.mask[i] ? `<div class="warn">${t(P.mask[i] === 1 ? "maskEarth" : P.mask[i] === 3 ? "maskEnergy" : "maskCons")}</div>` : `<div class="row"><span>${t("tipScore")}</span><span>${Math.round(P.score[i] * 100)}</span></div>`}`;
  const wr = mapWrap.getBoundingClientRect();
  let tx = e.clientX - wr.left + 16, ty = e.clientY - wr.top + 16;
  mapTip.style.display = "block";
  if (tx + mapTip.offsetWidth > wr.width - 8) tx -= mapTip.offsetWidth + 32;
  if (ty + mapTip.offsetHeight > wr.height - 8) ty -= mapTip.offsetHeight + 32;
  tx = Math.max(6, Math.min(wr.width - mapTip.offsetWidth - 6, tx)); ty = Math.max(6, Math.min(wr.height - mapTip.offsetHeight - 6, ty));
  mapTip.style.left = tx + "px"; mapTip.style.top = ty + "px";
});
mapCanvas.addEventListener("mouseleave", () => { mapTip.style.display = "none"; });
function siteExtraRows(lat, lon) {           // solo per dati reali: valori originali del file
  const D = MAPDATA; if (!D || !D.extra) return "";
  const [x, y] = projFwd(lat, lon, D.pc), v = a => a ? sampleDS(a, D, x, y) : null, rows = [];
  const q = v(D.extra.quota), b = v(D.extra.buio), sc = v(D.extra.senzaCom), en = v(D.extra.energia);
  if (q != null) rows.push([t("tipQuota"), `${Math.round(q)} m`]);
  if (b != null) rows.push([t("tipBuio"), fmtDur(b)]);
  if (sc != null) rows.push([t("tipNoCom"), fmtDur(sc)]);
  if (en != null) rows.push([t("tipEnergia"), `${Math.round(en)}%`]);
  const pe = v(D.extra.pendenza), at = D.extra.atterrabile ? D.extra.atterrabile[nearestCell(D, x, y)] : null;
  if (pe != null) rows.push([t("tipSlope"), `${pe.toFixed(1)}°`]);
  if (at != null) rows.push([t("tipLand"), `${Math.round(at)}% ${at >= 50 ? "✓" : "✕"}`]);
  if (D.evo) rows.push([t("tipEvo"), t("tipEvoV", { h: D.evo.stepH })]);
  return `<div class="row" style="margin-top:.3rem"><span style="color:#86efac">${esc(t("tipReal", { n: D.name }))}</span><span></span></div>`
    + rows.map(([a, b2]) => `<div class="row"><span>${a}</span><span>${b2}</span></div>`).join("");
}

/* =====================================================================
   PUNTO ANALIZZATO: grafico della batteria + Mission Control (LOS / AOS)
   Il punto è il sito selezionato, oppure quello cliccato, oppure il sito #1.
   ===================================================================== */
let PROBE = null;                    // { lat, lon } scelto con un clic sulla mappa
function probeTarget() {
  if (selectedSite >= 0 && SITES[selectedSite]) { const s = SITES[selectedSite]; return { lat: s.lat, lon: s.lon, label: t("sitePt", { n: selectedSite + 1 }) }; }
  if (PROBE) return { ...PROBE, label: t("probePt") };
  if (SITES[0]) return { lat: SITES[0].lat, lon: SITES[0].lon, label: t("sitePt", { n: 1 }) };
  return { lat: REGION.lat, lon: REGION.lon, label: t("centerPt") };
}
function pixelOf(lat, lon) {
  const P = PX, [x, y] = projFwd(lat, lon);
  const px = Math.floor(P.cx + x * P.scale), py = Math.floor(P.cy - y * P.scale);
  if (px < 0 || py < 0 || px >= P.S || py >= P.S) return -1;
  const i = py * P.S + px;
  return P.inside[i] ? i : -1;
}
const fmtDur = h => {
  if (h <= 0) return "0 h";
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  const d = Math.floor(h / 24), hh = Math.floor(h % 24), mm = Math.round((h % 1) * 60), ds = t("dayShort");
  return d ? `${d} ${ds} ${hh} h` : `${hh} h ${String(mm).padStart(2, "0")} min`;
};
const visibleAt = (lat, lon, sinHz, body) => {
  const p = lat * DEG, b = body.lat * DEG;
  return Math.sin(p) * Math.sin(b) + Math.cos(p) * Math.cos(b) * Math.cos((lon - body.lon) * DEG) > sinHz;
};
// prossimo cambio di stato (visibile ↔ non visibile) entro 30 giorni, passo 10 minuti
function nextChange(lat, lon, sinHz, bodyFn, t0) {
  const now = visibleAt(lat, lon, sinHz, bodyFn(t0));
  for (let m = 10; m <= 30 * 24 * 60; m += 10)
    if (visibleAt(lat, lon, sinHz, bodyFn(new Date(+t0 + m * 6e4))) !== now) return { now, inH: m / 60 };
  return { now, inH: null };
}

let ESERIES = null;
function updateProbe() {
  if (!PX) return;
  const P = PX, tg = probeTarget(), i = pixelOf(tg.lat, tg.lon);
  const mc = document.getElementById("mcPanel");
  if (i < 0) { mc.innerHTML = ""; ESERIES = null; drawEnergyChart(); return; }
  const sHzS = P.sHzS[i], sHzE = P.sHzE[i], t0 = currentTime(), m = WS.mission, coord = fmtLL(tg.lat, tg.lon);
  const D = MAPDATA, EV = D && D.evo, kc = EV ? P.cell[i] : -1;
  // visibilità nel tempo: dai bit reali della cella (se ci sono), altrimenti dal modello con l'orizzonte efficace
  const sunVis = d => EV ? !!evoBit(EV.luce, EV, evoIdx(EV, d), kc) : visibleAt(tg.lat, tg.lon, sHzS, sunAt(d));
  const nextCh = (arr, sinHz, bodyFn) => {
    if (!EV) return nextChange(tg.lat, tg.lon, sinHz, bodyFn, t0);
    const ti0 = evoIdx(EV, t0), now = !!evoBit(arr, EV, ti0, kc);
    for (let ti = ti0 + 1; ti < EV.n; ti++) if (!!evoBit(arr, EV, ti, kc) !== now) return { now, inH: Math.max(.1, (EV.start + ti * EV.stepH * 36e5 - t0) / 36e5) };
    return { now, inH: null };
  };

  // --- Mission Control: segnale (Terra) e luce (Sole)
  const com = nextCh(EV && EV.com, sHzE, earthAt), sun = nextCh(EV && EV.luce, sHzS, sunAt);
  const comLine = com.inH == null ? t("mcNever") : t(com.now ? "mcLosIn" : "mcAosIn", { d: fmtDur(com.inH) });
  const sunLine = sun.inH == null ? t("mcSunNever") : t(sun.now ? "mcSunset" : "mcSunrise", { d: fmtDur(sun.inH) });
  // copertura istantanea dell'intera area (dati della mappa in questo istante)
  let nIn = 0, nCom = 0, nSun = 0, bestCom = -1;
  for (let q = 0; q < P.inside.length; q += 3) if (P.inside[q]) { nIn++; if (P.enow[q]) { nCom++; if (bestCom < 0) bestCom = q; } if (P.lit[q]) nSun++; }
  const pc = x => nIn ? Math.round(100 * x / nIn) : 0;
  const areaCom = nCom === 0 ? `<span class="bad">${esc(t("mcAreaNoCom"))}</span>` : esc(t("mcAreaCom", { p: pc(nCom) }));
  const areaSun = nSun === 0 ? `<span class="bad">${esc(t("mcAreaNoSun"))}</span>` : esc(t("mcAreaSun", { p: pc(nSun) }));
  // spie per il punto scelto (sito n.1 o sonda): luce verde = sì, ✗ rossa = no; il dettaglio resta nel tooltip
  const lamp = (on, key, tip) => `<div class="mc-lamp ${on ? "on" : "off"}" title="${esc(tip)}"><span class="lamp">${on ? "" : "✗"}</span>${esc(t(key))}</div>`;
  mc.innerHTML = lamp(com.now, "mcLink", `${com.inH == null ? t("mcNever") : t(com.now ? "mcLosClear" : "mcAosClear", { d: fmtDur(com.inH) })} · ${t("mcFor", { p: tg.label, c: coord })}`)
    + lamp(sun.now, "mcIllum", `${sunLine} · ${t("mcFor", { p: tg.label, c: coord })}`);
  void areaCom; void areaSun;

  // --- batteria lungo la permanenza (passo fine)
  const C = energyCfg(), H = m.stayHours, step = Math.max(.25, H / 480), cap = C.cap, reserve = C.reserve;
  const comVis = d => EV ? !!evoBit(EV.com, EV, evoIdx(EV, d), kc) : visibleAt(tg.lat, tg.lon, sHzE, earthAt(d));
  const pk = D && D.panelK ? D.panelK[P.cell[i]] : 1;
  let E = cap, minB = cap, failAt = null, night = 0, maxNight = 0, saveH = 0;
  const pts = [{ h: 0, soc: 1, lit: sunVis(t0) }];
  for (let h = step; h <= H + 1e-9; h += step) {
    const dm = new Date(+t0 + (h - step / 2) * 36e5), lit = sunVis(dm);
    E = energyStep(C, E, lit, comVis(dm), pk, h - step / 2, step); if (E_SAVE) saveH += step;
    if (E < minB) minB = E;
    if (E < reserve && failAt == null) failAt = h;
    night = lit ? 0 : night + step; maxNight = Math.max(maxNight, night);
    pts.push({ h, soc: Math.max(0, E) / cap, lit });
  }
  ESERIES = { pts, H, reserve: m.reservePct / 100, failAt };
  document.getElementById("eFor").textContent = t("eFor", { h: H, p: tg.label, c: coord });
  document.getElementById("eStats").innerHTML =
    `${t("eMin", { v: Math.round(Math.max(0, minB) / cap * 100) })} · ${t("eNight", { h: fmtDur(maxNight) })}<br>`
    + `${t("eSaveH", { h: fmtDur(saveH) })}<br>`
    + `<span class="e-dust">${t("ePanelEff", { d: (pk * 100).toFixed(1), p: (dustAt(C, H) * 100).toFixed(2), r: (pk * dustAt(C, H) * 100).toFixed(1) })}<br>`
    + `${t("eDust", { a: +m.dustInitPct.toFixed(2), y: +m.dustYearPct.toFixed(2), l: ((1 - dustAt(C, H)) * 100).toFixed(2) })}</span><br>`
    + (failAt == null ? `<span class="good">${t("eOk")}</span>` : `<span class="bad">${t("eFail", { h: fmtDur(failAt) })}</span>`);
  drawEnergyChart();
}

// grafico: una serie (carica %), bande per le ore di ombra, riserva tratteggiata, crosshair al passaggio del mouse
const eCanvas = document.getElementById("eChart"), eTip = document.getElementById("eTip");
let eGeom = null;
function drawEnergyChart(hoverX = null) {
  const css = eCanvas.clientWidth || 280, H = 150, dpr = Math.min(window.devicePixelRatio || 1, 2);
  eCanvas.width = css * dpr; eCanvas.height = H * dpr;
  const c = eCanvas.getContext("2d");
  c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, css, H);
  if (!ESERIES) { c.fillStyle = "#8a93b8"; c.font = "12px Inter, sans-serif"; c.fillText(t("clickHint"), 4, H / 2); return; }
  const { pts, reserve, failAt } = ESERIES, Hh = ESERIES.H;
  const L = 30, R = 6, T = 8, B = 22, w = css - L - R, h = H - T - B;
  const X = v => L + v / Hh * w, Y = v => T + (1 - v) * h;
  eGeom = { X, Y, L, w, Hh, pts };
  // bande d'ombra (notte)
  c.fillStyle = "rgba(255,255,255,.07)";
  for (let k = 1; k < pts.length; k++) if (!pts[k].lit) c.fillRect(X(pts[k - 1].h), T, X(pts[k].h) - X(pts[k - 1].h) + .5, h);
  // griglia e assi (recessivi)
  c.strokeStyle = "rgba(255,255,255,.1)"; c.lineWidth = 1; c.fillStyle = "#8a93b8"; c.font = "10px Inter, sans-serif";
  c.textAlign = "right"; c.textBaseline = "middle";
  for (const v of [0, .5, 1]) { c.beginPath(); c.moveTo(L, Y(v) + .5); c.lineTo(L + w, Y(v) + .5); c.stroke(); c.fillText(Math.round(v * 100) + "%", L - 4, Y(v)); }
  c.textAlign = "center"; c.textBaseline = "top";
  for (const v of [0, Hh / 2, Hh]) c.fillText(Math.round(v) + " h", Math.min(L + w - 10, Math.max(L + 8, X(v))), T + h + 6);
  // riserva
  c.setLineDash([4, 3]); c.strokeStyle = "rgba(255,255,255,.45)";
  c.beginPath(); c.moveTo(L, Y(reserve) + .5); c.lineTo(L + w, Y(reserve) + .5); c.stroke(); c.setLineDash([]);
  c.textAlign = "left"; c.textBaseline = "bottom"; c.fillStyle = "#8a93b8"; c.fillText(t("reserveLbl"), L + 3, Y(reserve) - 1);
  // linea della carica: chiara, poi rossa dal momento in cui scende sotto la riserva
  c.lineWidth = 2; c.lineJoin = "round";
  const seg = (from, to, color) => {
    c.strokeStyle = color; c.beginPath();
    pts.forEach((p, k) => { if (p.h < from - 1e-9 || p.h > to + 1e-9) return; k && p.h > from ? c.lineTo(X(p.h), Y(p.soc)) : c.moveTo(X(p.h), Y(p.soc)); });
    c.stroke();
  };
  if (failAt == null) seg(0, Hh, "#7fd3ff");
  else { seg(0, failAt, "#7fd3ff"); seg(failAt - (pts[1] ? pts[1].h : 0), Hh, "#f87171"); }
  // crosshair
  if (hoverX != null) {
    const hh = Math.max(0, Math.min(Hh, (hoverX - L) / w * Hh));
    const p = pts.reduce((a, b) => Math.abs(b.h - hh) < Math.abs(a.h - hh) ? b : a);
    c.strokeStyle = "rgba(255,255,255,.35)"; c.lineWidth = 1;
    c.beginPath(); c.moveTo(X(p.h) + .5, T); c.lineTo(X(p.h) + .5, T + h); c.stroke();
    c.fillStyle = "#fff"; c.beginPath(); c.arc(X(p.h), Y(p.soc), 4, 0, 2 * Math.PI); c.fill();
    eTip.innerHTML = `<b>T+${fmtDur(p.h)}</b><div class="row"><span>${t("tipBatt").split(" ")[0]}</span><span>${Math.round(p.soc * 100)}%</span></div>
      <div class="row"><span>${t("tipSun")}</span><span>${t(p.lit ? "eTipSun" : "eTipShade")}</span></div>`;
    eTip.style.display = "block";
    const x = X(p.h) + 12;
    eTip.style.left = (x + eTip.offsetWidth > css ? X(p.h) - eTip.offsetWidth - 12 : x) + "px";
    eTip.style.top = "4px";
  } else eTip.style.display = "none";
}
eCanvas.addEventListener("mousemove", e => { if (ESERIES) drawEnergyChart(e.clientX - eCanvas.getBoundingClientRect().left); });
eCanvas.addEventListener("mouseleave", () => drawEnergyChart());

// clic sulla mappa: su un sito → lo seleziona; altrove → punto da analizzare
mapCanvas.addEventListener("click", e => {
  if (!PX) return;
  const rect = mapCanvas.getBoundingClientRect(), P = PX;
  const px = (e.clientX - rect.left) * P.k, py = (e.clientY - rect.top) * P.k;
  const hit = SITES.findIndex(s => Math.hypot(s.px - px, s.py - py) < 13 * P.k);
  if (hit >= 0) { selectedSite = hit; PROBE = null; }
  else {
    const i = (py | 0) * P.S + (px | 0);
    if (!P.inside[i]) return;
    selectedSite = -1; PROBE = { lat: P.lat[i], lon: P.lon[i] };
  }
  drawOverlays(); renderSites(); updateProbe();
});


const orbitCanvas = document.getElementById("orbitCanvas"), octx = orbitCanvas.getContext("2d");   // davanti: Sole, Terra, testi
const orbitBack = document.getElementById("orbitBack"), obctx = orbitBack.getContext("2d");          // dietro: coni e onde
const orbitGL = document.getElementById("orbitGL"), ORBIT_MOON = createMoonView(orbitGL);            // Luna (WebGL)
const ORBIT = { on: false, lat: -60, lon: 0, zoom: 1, dirty: true, raf: 0, t0: performance.now(), size: "" };

function camBasis() {
  const p = ORBIT.lat * DEG, l = ORBIT.lon * DEG;
  return { c: [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)],
           e: [-Math.sin(l), Math.cos(l), 0],
           n: [-Math.sin(p) * Math.cos(l), -Math.sin(p) * Math.sin(l), Math.cos(p)] };
}
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function orbitLayout() {
  const w = orbitCanvas.clientWidth, h = orbitCanvas.clientHeight - 64;          // spazio per la barra del tempo
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  return { w, h, dpr, cx: w / 2, cy: h / 2 + 8, Rm: Math.min(w, h) * .2 * ORBIT.zoom };
}

// Luna: disegnata dalla GPU a ogni fotogramma; quando cambia la mappa si aggiorna solo la sua texture
function orbitAreaZoom(P) { return Math.max(1, 20 / Math.max(1e-6, P.viewDeg)); }
function orbitSize(L) {
  const key = `${L.w}x${orbitCanvas.clientHeight}@${L.dpr}`;
  if (key === ORBIT.size) return;
  ORBIT.size = key;
  for (const cv of [orbitCanvas, orbitBack, orbitGL]) { cv.width = Math.max(1, Math.round(L.w * L.dpr)); cv.height = Math.max(1, Math.round(orbitCanvas.clientHeight * L.dpr)); }
}
function renderMoon(L) {
  if (!ORBIT_MOON.ok) return;
  const P = PX, tNow = currentTime(), sb = sunAt(tNow), eb = earthAt(tNow);
  if (ORBIT.dirty && P) { ORBIT_MOON.setOverlay(P.img); ORBIT.dirty = false; }
  let ov = null;
  if (P && WS.region) {
    const X = orbitAreaZoom(P), dispDeg = P.viewDeg * X, B = localBasis(WS.region.lat, WS.region.lon);
    ov = { c: B.c, e: B.e, n: B.n, scale: P.scale, S: P.S, cx: P.cx, cy: P.cy, X, cosView: Math.cos(dispDeg * DEG), cosEdge: Math.cos(dispDeg * DEG * .985) };
  }
  ORBIT_MOON.draw({ cx: L.cx, cy: L.cy, R: L.Rm, dpr: L.dpr, lat: ORBIT.lat, lon: ORBIT.lon, mode: 2,
    sun: unit(sb.lat, sb.lon), earth: unit(eb.lat, eb.lon), earthViz: true, ov });
}

function areaLinkShare() {           // quota dell'area da cui la Terra è visibile adesso
  const P = PX; if (!P) return 0;
  let n = 0, ok = 0;
  for (let i = 0; i < P.inside.length; i += 7) if (P.inside[i]) { n++; if (P.mask[i] !== 1) ok++; }
  return n ? ok / n : 0;
}


function drawOrbit(now) {
  const L = orbitLayout(), B = camBasis(), tNow = currentTime();
  orbitSize(L);
  let c = obctx;                                   // prima i coni e le onde (dietro la Luna)
  c.setTransform(L.dpr, 0, 0, L.dpr, 0, 0);
  c.fillStyle = "#000"; c.fillRect(0, 0, L.w, orbitCanvas.clientHeight);
  // direzioni di Sole e Terra sullo schermo (proiezione nel sistema della camera)
  const place = (body, distF) => {
    const u = unit(body.lat, body.lon);
    let sx = dot3(u, B.e), sy = dot3(u, B.n); const depth = dot3(u, B.c);
    let len = Math.hypot(sx, sy);
    if (len < .12) { sx = .7; sy = .7; len = Math.hypot(sx, sy); }        // quasi alle spalle dell'osservatore
    const D = Math.min(L.w, L.h) * distF;
    let x = L.cx + sx / len * D, y = L.cy - sy / len * D;
    x = Math.max(40, Math.min(L.w - 40, x)); y = Math.max(40, Math.min(L.h - 30, y));
    return { x, y, depth, dx: sx / len, dy: -sy / len };
  };
  const S = place(sunAt(tNow), .46), E = place(earthAt(tNow), .36);

  // cono di luce del Sole verso la Luna
  const vx = L.cx - S.x, vy = L.cy - S.y, dist = Math.hypot(vx, vy), ux = vx / dist, uy = vy / dist, px = -uy, py = ux;
  const reach = dist + L.Rm * 1.3, half = L.Rm * 1.18;
  c.save(); c.globalCompositeOperation = "lighter";
  const g = c.createLinearGradient(S.x, S.y, S.x + ux * reach, S.y + uy * reach);
  g.addColorStop(0, "rgba(253,224,71,.42)"); g.addColorStop(.75, "rgba(253,224,71,.12)"); g.addColorStop(1, "rgba(253,224,71,0)");
  c.fillStyle = g;
  c.beginPath(); c.moveTo(S.x + px * 10, S.y + py * 10); c.lineTo(S.x - px * 10, S.y - py * 10);
  c.lineTo(S.x + ux * reach - px * half * (reach / dist), S.y + uy * reach - py * half * (reach / dist));
  c.lineTo(S.x + ux * reach + px * half * (reach / dist), S.y + uy * reach + py * half * (reach / dist));
  c.closePath(); c.fill();
  c.restore();

  // cono della Terra: fin dove arriva la sua "vista" sulla Luna
  {
    const vx2 = L.cx - E.x, vy2 = L.cy - E.y, d2 = Math.hypot(vx2, vy2), ux2 = vx2 / d2, uy2 = vy2 / d2, px2 = -uy2, py2 = ux2;
    const reach2 = d2 + L.Rm * .15, half2 = L.Rm * 1.02;
    c.save(); c.globalCompositeOperation = "lighter";
    const g2 = c.createLinearGradient(E.x, E.y, E.x + ux2 * reach2, E.y + uy2 * reach2);
    g2.addColorStop(0, "rgba(56,189,248,.30)"); g2.addColorStop(1, "rgba(56,189,248,.06)");
    c.fillStyle = g2;
    c.beginPath(); c.moveTo(E.x + px2 * 6, E.y + py2 * 6); c.lineTo(E.x - px2 * 6, E.y - py2 * 6);
    c.lineTo(E.x + ux2 * reach2 - px2 * half2, E.y + uy2 * reach2 - py2 * half2);
    c.lineTo(E.x + ux2 * reach2 + px2 * half2, E.y + uy2 * reach2 + py2 * half2);
    c.closePath(); c.fill();
    c.strokeStyle = "rgba(125,211,252,.35)"; c.lineWidth = 1; c.setLineDash([5, 4]);
    c.beginPath(); c.moveTo(E.x, E.y); c.lineTo(E.x + ux2 * reach2 - px2 * half2, E.y + uy2 * reach2 - py2 * half2);
    c.moveTo(E.x, E.y); c.lineTo(E.x + ux2 * reach2 + px2 * half2, E.y + uy2 * reach2 + py2 * half2); c.stroke();
    c.restore();
  }
  // onde dalla Terra verso l'area (intensità = quota dell'area con la Terra in vista)
  const share = areaLinkShare(), ex = L.cx - E.x, ey = L.cy - E.y, ed = Math.hypot(ex, ey), ang = Math.atan2(ey, ex);
  const period = 2200, rings = 5, maxR = share > 0 ? ed - L.Rm * .2 : ed * .45;
  c.save();
  for (let k = 0; k < rings; k++) {
    const ph = ((now - ORBIT.t0) / period + k / rings) % 1, rad = 16 + ph * (maxR - 16);
    const alpha = (share > 0 ? .25 + .65 * share : .45) * (1 - ph) ** 1.2;
    c.strokeStyle = share > 0 ? `rgba(56,189,248,${alpha})` : `rgba(248,113,113,${alpha})`;
    c.lineWidth = share > 0 ? 1.5 + 2.5 * share : 1.5;
    c.beginPath(); c.arc(E.x, E.y, rad, ang - .32, ang + .32); c.stroke();
  }
  c.restore();

  // alone leggero attorno alla Luna, poi la Luna (GPU)
  const halo = c.createRadialGradient(L.cx, L.cy, L.Rm * .9, L.cx, L.cy, L.Rm * 1.25);
  halo.addColorStop(0, "rgba(127,211,255,.10)"); halo.addColorStop(1, "rgba(127,211,255,0)");
  c.fillStyle = halo; c.beginPath(); c.arc(L.cx, L.cy, L.Rm * 1.25, 0, 2 * Math.PI); c.fill();
  renderMoon(L);
  c = octx;                                        // davanti alla Luna: Sole, Terra, etichette, legenda
  c.setTransform(L.dpr, 0, 0, L.dpr, 0, 0); c.clearRect(0, 0, L.w, orbitCanvas.clientHeight);

  // Sole
  const sg = c.createRadialGradient(S.x, S.y, 2, S.x, S.y, 46);
  sg.addColorStop(0, "#fffbe6"); sg.addColorStop(.25, "#fde047"); sg.addColorStop(.6, "rgba(245,158,11,.35)"); sg.addColorStop(1, "rgba(245,158,11,0)");
  c.fillStyle = sg; c.beginPath(); c.arc(S.x, S.y, 46, 0, 2 * Math.PI); c.fill();
  // Terra con il lato giorno rivolto al Sole
  const er = 17, sd = Math.atan2(S.y - E.y, S.x - E.x);
  const eg = c.createRadialGradient(E.x + Math.cos(sd) * 6, E.y + Math.sin(sd) * 6, 2, E.x, E.y, er);
  eg.addColorStop(0, "#7dd3fc"); eg.addColorStop(.7, "#1d4ed8"); eg.addColorStop(1, "#0b1a4a");
  c.fillStyle = "rgba(56,189,248,.18)"; c.beginPath(); c.arc(E.x, E.y, er + 6, 0, 2 * Math.PI); c.fill();
  c.fillStyle = eg; c.beginPath(); c.arc(E.x, E.y, er, 0, 2 * Math.PI); c.fill();
  c.save(); c.beginPath(); c.arc(E.x, E.y, er, 0, 2 * Math.PI); c.clip();
  c.fillStyle = "#4ade80";
  c.beginPath(); c.ellipse(E.x - 5, E.y - 3, 7, 4.5, .6, 0, 2 * Math.PI); c.fill();
  c.beginPath(); c.ellipse(E.x + 6, E.y + 6, 5, 3, -.4, 0, 2 * Math.PI); c.fill();
  c.restore();
  c.strokeStyle = "rgba(255,255,255,.85)"; c.lineWidth = 1.5; c.beginPath(); c.arc(E.x, E.y, er, 0, 2 * Math.PI); c.stroke();

  // etichette
  c.font = "600 12px Inter, sans-serif"; c.textAlign = "center"; c.textBaseline = "top";
  c.fillStyle = "#fde68a"; c.fillText(t("sunLbl"), S.x, S.y + 30);
  c.fillStyle = "#bae6fd"; c.fillText(t("earthLbl"), E.x, E.y + er + 8);
  c.font = "11px Inter, sans-serif"; c.fillStyle = share > 0 ? "#7dd3fc" : "#fca5a5";
  c.fillText(share > 0 ? t("linkStrength", { p: Math.round(share * 100) }) : t("noLink"), E.x, E.y + er + 24);
  const cov = covById(WS.coverageId);
  if (cov) { c.fillStyle = "#7fd3ff"; c.font = "600 12px Inter, sans-serif"; c.fillText(cov.name, L.cx, L.cy + L.Rm + 14); }
  // aree molto piccole (pochi km): anello che ne indica la posizione sulla Luna
  const XZ = PX ? orbitAreaZoom(PX) : 1;
  if (XZ > 1) {
    const a = unit(WS.region.lat, WS.region.lon);
    if (dot3(a, B.c) > 0) {
      const x = L.cx + dot3(a, B.e) * L.Rm, y = L.cy - dot3(a, B.n) * L.Rm;
      c.font = "600 11px Inter, sans-serif"; c.textAlign = "center"; c.textBaseline = "bottom";
      const txt = t("areaZoomed", { x: Math.round(XZ) }), tw = c.measureText(txt).width;
      const ty = y - Math.sin(20 * DEG) * L.Rm * Math.max(.35, dot3(a, B.c)) - 8;
      c.fillStyle = "rgba(11,12,16,.75)"; c.fillRect(x - tw / 2 - 5, ty - 15, tw + 10, 17);
      c.fillStyle = "#7fd3ff"; c.fillText(txt, x, ty);
    }
  } else if (WS.region && WS.region.r * DEG * L.Rm < 8) {
    const a = unit(WS.region.lat, WS.region.lon);
    if (dot3(a, B.c) > 0) {
      const x = L.cx + dot3(a, B.e) * L.Rm, y = L.cy - dot3(a, B.n) * L.Rm, pulse = 9 + 3 * Math.sin(now / 300);
      c.strokeStyle = "#7fd3ff"; c.lineWidth = 2; c.beginPath(); c.arc(x, y, pulse, 0, 2 * Math.PI); c.stroke();
      c.fillStyle = "#7fd3ff"; c.beginPath(); c.arc(x, y, 2.5, 0, 2 * Math.PI); c.fill();
    }
  }
  const items = [
    [ctx => { ctx.fillStyle = "rgba(253,224,71,.55)"; ctx.fillRect(0, -5, 18, 10); }, t("lgSunCone")],
    [ctx => { ctx.fillStyle = "rgba(56,189,248,.45)"; ctx.fillRect(0, -5, 18, 10); }, t("lgEarthCone")],
    [ctx => { ctx.fillStyle = "#7dd3fc"; ctx.fillRect(0, -1.5, 18, 3); }, t("lgEarthLimit")],
    [ctx => { ctx.fillStyle = "rgba(56,189,248,.5)"; for (let k = 0; k < 18; k += 4) ctx.fillRect(k, -5, 1.5, 10); }, t("lgEarthBand")],
  ];
  c.font = "11px Inter, sans-serif"; c.textAlign = "left"; c.textBaseline = "middle";
  let ly = L.h - items.length * 18 + 4;
  for (const [sw, label] of items) {
    c.save(); c.translate(18, ly); sw(c); c.restore();
    c.fillStyle = "#9ca3af"; c.fillText(label, 44, ly); ly += 18;
  }
}

function orbitLoop(now) {
  if (!ORBIT.on) return;
  drawOrbit(now);
  ORBIT.raf = requestAnimationFrame(orbitLoop);
}
function setOrbit(on) {
  ORBIT.on = on;
  mapWrap.classList.toggle("orbit", on);
  document.getElementById("btnOrbit").classList.toggle("on", on);
  document.getElementById("btnOrbitLbl").textContent = t(on ? "zoomIn" : "zoomOut");
  cancelAnimationFrame(ORBIT.raf);
  if (on) {
    // camera inclinata di ~18° rispetto all'area: l'area è ben visibile e si vede anche la curvatura della Luna
    if (WS.region) { ORBIT.lat = Math.max(-72, Math.min(72, WS.region.lat)); ORBIT.lon = WS.region.lon; }
    ORBIT.zoom = 1; ORBIT.dirty = true; ORBIT.t0 = performance.now();
    const ps = document.getElementById("playStep");
    if (ps.value === "1") ps.value = "6";                       // animazione nel tempo più evidente
    if (!playTimer) btnPlay.click();
    ORBIT.raf = requestAnimationFrame(orbitLoop);
  } else if (playTimer) stopPlay();
}
document.getElementById("btnOrbit").addEventListener("click", () => setOrbit(!ORBIT.on));

// rotazione e zoom della vista 3D
let oDrag = null;
orbitCanvas.addEventListener("pointerdown", e => { orbitCanvas.setPointerCapture(e.pointerId); oDrag = { x: e.clientX, y: e.clientY }; orbitCanvas.style.cursor = "grabbing"; });
orbitCanvas.addEventListener("pointermove", e => {
  if (!oDrag || orbitCanvas._pinch) return;
  const Rm = orbitLayout().Rm;
  ORBIT.lon = wrap180(ORBIT.lon - (e.clientX - oDrag.x) / Rm / DEG);
  ORBIT.lat = Math.max(-90, Math.min(90, ORBIT.lat + (e.clientY - oDrag.y) / Rm / DEG));
  oDrag = { x: e.clientX, y: e.clientY };
});
const oEnd = () => { if (!oDrag) return; oDrag = null; orbitCanvas.style.cursor = ""; };
orbitCanvas.addEventListener("pointerup", oEnd);
orbitCanvas.addEventListener("pointercancel", oEnd);
orbitCanvas.addEventListener("wheel", e => {
  e.preventDefault();
  ORBIT.zoom = Math.max(.6, Math.min(2.2, ORBIT.zoom * Math.exp(-e.deltaY * .0012)));
}, { passive: false });



/* =====================================================================
   MISSION: name, weights, timing and constraints are all in the left panel (no pop-up window any more)
   ===================================================================== */
const mapBusy = document.getElementById("mapBusy");
const missionMsg = document.getElementById("missionMsg");
function setMissionMsg(text, bad) { missionMsg.textContent = text || ""; missionMsg.classList.toggle("bad", !!bad); }
function syncMean() {
  const sel = document.getElementById("meanMode"); if (!sel) return;
  sel.value = WS.meanMode || "arith";
  document.getElementById("meanHint").textContent = t(WS.meanMode === "geo" ? "meanGeoD" : "meanArithD");
}
document.getElementById("meanMode").addEventListener("change", e => { WS.meanMode = e.target.value; syncMean(); queueRecolor(); saveParams(); });

// menu ▾ next to "Import mission": export mission / export area data
const fileMenu = document.getElementById("missionMenu"), fileMenuBtn = document.getElementById("btnMissionMenu");
fileMenuBtn.addEventListener("click", e => { e.stopPropagation(); const open = fileMenu.hidden; fileMenu.hidden = !open; fileMenuBtn.setAttribute("aria-expanded", String(open)); });
document.addEventListener("click", e => { if (!fileMenu.hidden && !e.target.closest("#missionMenu")) { fileMenu.hidden = true; fileMenuBtn.setAttribute("aria-expanded", "false"); } });
fileMenu.addEventListener("click", () => { fileMenu.hidden = true; });

// export mission + current results (plain JSON: for Python or colleagues)
document.getElementById("btnExportMission").addEventListener("click", () => {
  const cov = covById(WS.coverageId), m = WS.mission;
  download({
    format: "mlsn-mission", version: 1, name: m.name, exportedAt: new Date().toISOString(),
    region: WS.region ? { lat: WS.region.lat, lon: WS.region.lon, radiusDeg: WS.region.r } : null,
    dataset: cov ? { id: cov.id, name: cov.name, source: cov.source } : null,
    weights: { ...WS.weights }, scoring: { mean: WS.meanMode, combine: WS.meanMode === "geo" ? "weighted geometric mean" : "weighted arithmetic mean", ice: "Effemeridi index (permanent shadow) within 2 km" },
    landing: new Date(WS.arrival).toISOString(), stayHours: m.stayHours, evaluateOn: WS.horizon,
    constraints: { minSunPct: m.minSun, minEarthPct: m.minEarth, maxIceKm: m.maxIce, maxSlopeDeg: m.maxSlope, minQuotaM: m.minQuota, maxQuotaM: m.maxQuota,
                   maxDarkH: m.maxDark, maxNoComH: m.maxNoCom, active: Object.keys(m.opt || {}).filter(k => m.opt[k]) },
    energy: { panelW: m.panelW, batteryWh: m.batteryWh, loadW: m.loadW, loadSaveW: m.loadSaveW, operationalWhen: m.opMode, saveBelowPct: m.saveBelowPct,
              reservePct: m.reservePct, dustInitPct: m.dustInitPct, dustYearPct: m.dustYearPct, excludeBelowReserve: m.energyHard },
    results: PX ? {
      time: currentTime().toISOString(), offsetHours: WS.offsetH,
      sites: SITES.map((s, i) => ({ rank: i + 1, lat: +s.lat.toFixed(4), lon: +s.lon.toFixed(4), score: +(s.score * 100).toFixed(1),
        sunPct: +(s.sun * 100).toFixed(1), earthPct: +(s.earth * 100).toFixed(1), iceKm: s.ice > 999 ? null : +s.ice.toFixed(2),
        minBatteryPct: s.soc != null ? +(s.soc * 100).toFixed(1) : null })),
    } : null,
    note: "Demo ephemerides and, for demo areas, synthetic data — not for operational use.",
  }, `mlsn-mission-${slug(m.name)}.json`);
});

// import mission
const missionFile = document.getElementById("missionFile");
document.getElementById("btnImportMission").addEventListener("click", () => missionFile.click());
missionFile.addEventListener("change", async () => {
  const f = missionFile.files[0]; missionFile.value = "";
  if (!f) return;
  try {
    const j = JSON.parse(await f.text());
    if (!j || j.format !== "mlsn-mission") throw 0;
    const num = (v, lo, hi, def) => (isFinite(+v) ? Math.max(lo, Math.min(hi, +v)) : def);
    const m = WS.mission;
    m.name = String(j.name || m.name).slice(0, 60);
    if (j.weights) for (const k of ["sun", "earth", "ice"]) WS.weights[k] = Math.round(num(j.weights[k], WMIN(k), 10, WS.weights[k]));
    if (j.scoring && ["arith", "geo"].includes(j.scoring.mean)) WS.meanMode = j.scoring.mean;
    m.stayHours = num(j.stayHours, 1, 720, m.stayHours);
    if (j.constraints) {
      m.minSun = num(j.constraints.minSunPct, 0, 100, 0);
      m.minEarth = num(j.constraints.minEarthPct, 0, 100, 0);
      m.maxIce = num(j.constraints.maxIceKm, 0, 500, 0);
      m.maxSlope = num(j.constraints.maxSlopeDeg, 0, 90, m.maxSlope); m.minQuota = num(j.constraints.minQuotaM, -10000, 12000, m.minQuota);
      m.maxQuota = num(j.constraints.maxQuotaM, -10000, 12000, m.maxQuota); m.maxDark = num(j.constraints.maxDarkH, 0, 8760, m.maxDark);
      m.maxNoCom = num(j.constraints.maxNoComH, 0, 8760, m.maxNoCom);
      if (Array.isArray(j.constraints.active)) m.opt = Object.fromEntries(j.constraints.active.filter(k => OPT_DEFS.some(d => d.id === k)).map(k => [k, true]));
    }
    if (j.energy) {
      m.panelW = num(j.energy.panelW, 0, 100000, m.panelW); m.batteryWh = num(j.energy.batteryWh, 1, 1000000, m.batteryWh);
      m.loadW = num(j.energy.loadW, 0, 100000, m.loadW); m.reservePct = num(j.energy.reservePct, 0, 100, m.reservePct);
      m.loadSaveW = num(j.energy.loadSaveW, 0, 100000, m.loadSaveW); m.saveBelowPct = num(j.energy.saveBelowPct, 0, 100, m.saveBelowPct);
      m.dustInitPct = num(j.energy.dustInitPct, 0, 100, m.dustInitPct); m.dustYearPct = num(j.energy.dustYearPct, 0, 100, m.dustYearPct);
      if (["sun", "sunEarth", "always"].includes(j.energy.operationalWhen)) m.opMode = j.energy.operationalWhen;
      if (typeof j.energy.excludeBelowReserve === "boolean") m.energyHard = j.energy.excludeBelowReserve;
    }
    if (j.landing && !isNaN(new Date(j.landing))) WS.arrival = toLocalInput(new Date(j.landing));
    if (j.evaluateOn === "stay" || j.evaluateOn === "cycle") WS.horizon = j.evaluateOn;
    WS.offsetH = 0;
    // the mission is for another site: open that one (its data are loaded by the page)
    const other = j.dataset && j.dataset.source === "builtin" && j.dataset.name && j.dataset.name !== WS.siteName;
    if (other) {
      WS.region = null; WS.coverageId = null; WS.siteName = j.dataset.name;
      await saveParams(true);
      location.href = "analysis.html?site=" + encodeURIComponent(j.dataset.name);
      return;
    }
    let msg = t("missionImported", { n: m.name });
    if (clampToPeriod()) msg += " · " + t("periodMoved");
    syncControls(); syncMean(); saveParams();
    setMissionMsg(msg, false);
    if (PX) { PX.mcache = {}; queueRecolor(true); }
  } catch (e) { setMissionMsg(t("missionErr"), true); }
});

// export the data of the current area (same format as the import: useful as a template for Python)
document.getElementById("btnExportData").addEventListener("click", () => {
  if (!MAPDATA) return;
  download(datasetToJSON(MAPDATA), `mlsn-area-${slug(MAPDATA.name)}.json`);
});

/* ---------- site data of this page ---------- */
let MAPDATA = null;
async function ensureMapData() {
  if (MAPDATA) return MAPDATA;
  const cov = covById(WS.coverageId) || (coverageFor(REGION.lat, REGION.lon, REGION.r) || {}).cov;
  try { MAPDATA = cov ? await getDatasetAsync(cov) : null; if (MAPDATA) await ensureEvo(MAPDATA); }
  catch (e) { MAPDATA = null; setMissionMsg(t("serverError"), true); }
  document.getElementById("demoBadge").hidden = !(MAPDATA && MAPDATA.demo);
  return MAPDATA;
}
function updateStageSub() {
  const el = document.getElementById("stageSub"), cov = covById(WS.coverageId);
  el.textContent = WS.region ? t("areaSub", { n: cov ? cov.name : "", c: fmtLL(WS.region.lat, WS.region.lon), r: WS.region.r.toFixed(1) }) : "";
}

/* ---------- guided tour of this page ---------- */
const TOUR_STEPS = [
  { k: 7, sel: "#anPanel .as-head" },
  { k: 8, sel: "#secWeights" },
  { k: 15, sel: "#secCross", pre: () => setHorizon("cycle") },
  { k: 9, sel: "#secTiming", pre: () => setHorizon("stay") },
  { k: 10, sel: "#secOpt" },
  { k: 11, sel: "#anPanel .as-add" },
  { k: 13, sel: "#mapCanvas", pre: () => setHorizon("cycle") },
  { k: 14, sel: "#horizonMode" },
  { k: 16, sel: "#layersBox" },
  { k: 17, sel: "#mapLegend" },
  { k: 18, sel: "#secSites" },
  { k: 19, sel: "#timebar", pre: () => setHorizon("stay") },
  { k: 20, sel: "#mcPanel", pre: () => setHorizon("stay") },
  { k: 21, sel: "#energyBox", pre: () => setHorizon("stay") },
  { k: 22, sel: "#btnOrbit", pre: () => setHorizon("stay") },
  { k: 24, sel: ".ws-top-actions" },
  { k: 25 },
];
function setHorizon(h) {
  if (WS.horizon === h) return;
  const b = document.querySelector(`#horizonMode [data-h="${h}"]`); if (b) b.click();
  return wait(500);
}
document.getElementById("btnGuide").addEventListener("click", () => tourStart(TOUR_STEPS));

/* ---------- phone: zoom buttons, pinch, folding panels ---------- */
const zMap = (f, live) => {
  if (ORBIT.on) { ORBIT.zoom = Math.max(.6, Math.min(2.2, ORBIT.zoom * f)); return; }
  if (live || f === 1) return;
  const steps = [1, .6, .3], i = steps.indexOf(WS.zoom), sel = document.getElementById("zoomSel");
  const ni = Math.max(0, Math.min(2, (i < 0 ? 0 : i) + (f > 1 ? 1 : -1)));
  if (steps[ni] !== WS.zoom) { sel.value = String(steps[ni]); sel.dispatchEvent(new Event("change", { bubbles: true })); }
};
let zMapAcc = 1;
const zMapPinch = (f, live) => { if (ORBIT.on) return zMap(f, live); if (live) { zMapAcc *= f; return; } if (Math.abs(Math.log(zMapAcc)) > .25) zMap(zMapAcc, false); zMapAcc = 1; };
zoomCtl("mapWrap", zMap);
pinch(mapCanvas, zMapPinch); pinch(orbitCanvas, f => { ORBIT.zoom = Math.max(.6, Math.min(2.2, ORBIT.zoom * f)); });
mChip("mapLegend", "chipLegend", false); mChip("mcPanel", "chipInfo", false); mChip("layersBox", "layers", false);

// the energy card on the map can be folded
document.getElementById("energyToggle").addEventListener("click", () => {
  const b = document.getElementById("energyBox"), open = b.classList.toggle("folded");
  document.getElementById("energyToggle").setAttribute("aria-expanded", String(!open));
  if (!open) requestAnimationFrame(() => { if (ESERIES) drawEnergyChart(); });
});

let resizeTimer = null;
new ResizeObserver(() => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (PX) layoutMap(); }, 120); }).observe(mapWrap);

onLang(() => {
  updateLegend(); updateEphem(); updateStageSub(); updateTimeUI(); syncMean();
  renderLayerTabs(); renderCrossBox(); renderOptParams();
  if (PX) { drawOverlays(); renderSites(); updateProbe(); }
  document.getElementById("btnOrbitLbl").textContent = t(ORBIT.on ? "zoomIn" : "zoomOut");
});

/* ---------- start: site from the address (?site=Sito_NPA), otherwise the last one chosen ---------- */
(async function start() {
  mapBusy.classList.add("show");
  await loadSavedParams();
  const want = new URLSearchParams(location.search).get("site") || WS.siteName;
  if (!want) { location.replace("workspace.html"); return; }
  await loadSites(want.startsWith("imp-") ? null : want);
  let cov = covById(want) || COVERAGE.find(c => c.name === want);
  if (!cov) { location.replace("workspace.html"); return; }
  if (!WS.region || WS.coverageId !== cov.id) { applyRegion({ lat: cov.lat, lon: cov.lon, r: cov.r }, cov.id); WS.offsetH = 0; }
  REGION = { ...WS.region };
  if (location.search.indexOf("site=") < 0) history.replaceState(null, "", "analysis.html?site=" + encodeURIComponent(cov.source === "builtin" ? cov.name : cov.id));
  document.title = `${cov.name} · L.A.N.D.`;
  updateStageSub();
  await wait(20);
  await ensureMapData();
  mapBusy.classList.remove("show");
  if (!MAPDATA) { setMissionMsg(t("serverError"), true); return; }
  clampToPeriod(); syncControls(); syncMean(); saveParams();
  layoutMap();
})();
landBoot();
