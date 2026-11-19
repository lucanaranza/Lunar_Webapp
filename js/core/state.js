/* =====================================================================
   L.A.N.D. – mission state shared by the two Expert pages
   workspace.html (area selection) writes the chosen site into WS and opens analysis.html;
   analysis.html reads it back. Everything is saved in this browser (Store) – nothing is sent anywhere.
   ===================================================================== */

// project weights: Sun and Ice from 0 (ignored) to 10, Communication from 1 to 10 (Earth is always needed)
const PARAMS = [{ id: "sun", color: "#fbbf24", min: 0 }, { id: "earth", color: "#2dd4bf", min: 1 }, { id: "ice", color: "#93c5fd", min: 0 }];
const WMIN = id => (PARAMS.find(p => p.id === id) || { min: 1 }).min;
const toLocalInput = d => new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
function nextEarthWindow(from, C = REGION) {
  for (let h = 0; h <= 30 * 24; h += 3) {
    const d = new Date(+from + h * 36e5);
    if (elevation(C.lat, C.lon, earthAt(d)) >= 2) return d;
  }
  return from;
}
let MAX_OFFSET_H = 720;       // time evolution: 30 days, or up to the end of the period covered by the site data
const WS = { weights: { sun: 7, earth: 8, ice: 6 }, arrival: toLocalInput(nextEarthWindow(new Date())),
             layer: "score", zoom: 1, craters: true, region: null, coverageId: null, siteName: null,
             mission: { name: "Artemis-like landing", stayHours: 72, minSun: 0, minEarth: 0, maxIce: 0,
                        panelW: 1200, batteryWh: 12000, loadW: 250, loadSaveW: 80, opMode: "sun", saveBelowPct: 30, reservePct: 10,
                        dustInitPct: 0, dustYearPct: 1.3, energyHard: true,
                        maxSlope: 10, minQuota: -2000, maxQuota: 8000, maxDark: 240, maxNoCom: 240, opt: {} },
             cross: { luce: { on: true, w: 7 }, com: { on: true, w: 8 }, ice: { on: true, w: 6 }, energia: { on: false, w: 5 }, lc: { on: false, w: 5 },
                      land: { on: false, w: 5 }, pend: { on: false, w: 5 }, buio: { on: false, w: 5 }, nocom: { on: false, w: 5 }, quota: { on: false, w: 3 } },
             horizon: "cycle", offsetH: 0, meanMode: "arith" };
const isMedia = () => WS.horizon === "cycle";
const currentTime = () => new Date(new Date(WS.arrival).getTime() + WS.offsetH * 36e5);

let paramSaveTimer = null;
function saveParams(now = false) {
  clearTimeout(paramSaveTimer);
  const doSave = () => Store.set("missionParams", JSON.parse(JSON.stringify(WS))).catch(() => {});
  if (now) return doSave();
  paramSaveTimer = setTimeout(doSave, 400);
}
async function loadSavedParams() {
  try {
    const saved = await Store.get("missionParams");
    if (saved) {
      Object.assign(WS, saved, { weights: { ...WS.weights, ...saved.weights }, mission: { ...WS.mission, ...(saved.mission || {}) }, cross: WS.cross });
      if (typeof WS.zoom !== "number" || WS.zoom > 1) WS.zoom = 1;
      if (!(WS.offsetH >= 0)) WS.offsetH = 0;
      if (WS.horizon !== "cycle") WS.horizon = "stay";
      if (saved.cross) for (const k of Object.keys(WS.cross)) if (saved.cross[k]) WS.cross[k] = { ...WS.cross[k], ...saved.cross[k] };
      if (!WS.mission.opt || typeof WS.mission.opt !== "object") WS.mission.opt = {};
    }
  } catch (e) {}
}
// sites: built-in (all, or only the one named) + files imported in this browser
async function loadSites(only) {
  await loadBuiltinSites(only);
  if (!only) await loadStoredDatasets();
  dropDuplicatesOfBuiltin();
}

/* ---------- selection check: size + data coverage ---------- */
function selCheck(s) {
  if (!s) return { ok: false };
  const b = coverageFor(s.lat, s.lon, s.r), eps = 1e-6;
  if (!b) return { ok: false, code: "noData" };
  if (s.r > AREA_LIMITS.maxDeg + eps) return { ok: false, code: "tooBig", fit: Math.min(AREA_LIMITS.maxDeg, b.room), cov: b.cov };
  if (s.r > b.room + eps) return { ok: false, code: b.room < AREA_LIMITS.minDeg ? "edge" : "outside", fit: b.room, cov: b.cov };
  if (s.r < AREA_LIMITS.minDeg - eps) return { ok: false, code: "tooSmall", fit: AREA_LIMITS.minDeg, cov: b.cov };
  return { ok: true, cov: b.cov };
}
const selValid = s => selCheck(s).ok;
function applyRegion(region, covId) {
  const cov = covById(covId);
  WS.region = { ...region }; WS.coverageId = covId; WS.siteName = cov ? cov.name : null; REGION = { ...region };
  if (elevation(REGION.lat, REGION.lon, earthAt(new Date(WS.arrival))) < 0)
    WS.arrival = toLocalInput(nextEarthWindow(new Date(WS.arrival)));
}
