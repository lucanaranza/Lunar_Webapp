/* =====================================================================
   mission.html – the landing game: difficulty → choose the site → manual landing → mission patch
   ===================================================================== */
/* =====================================================================
   4) MISSIONE: indovina il sito → allunaggio → toppa
   ===================================================================== */
const GM = { step: 0, diff: null, time: null, pick: -1, best: -1, revealed: false, score: null, lit: null, earthNow: null, stay: null, sitePts: 0, landPts: 0, land: null, T: null };
const gMapCv = document.getElementById("gMap"), gWrap = document.getElementById("gWrap");
function gNewScenario() {
  const G = eduGrid(), D = G.D;
  GM.time = new Date(Math.round((Date.now() + Math.random() * 29 * 864e5) / 36e5) * 36e5);
  const S0 = bodyVec(sunAt(GM.time)), E0 = bodyVec(earthAt(GM.time)), K = 12, SV = [];
  for (let k = 0; k < K; k++) SV.push(bodyVec(sunAt(new Date(+GM.time + (k + .5) * 4 * 36e5))));
  GM.lit = new Uint8Array(G.n); GM.earthNow = new Uint8Array(G.n); GM.stay = new Float32Array(G.n); GM.score = new Float32Array(G.n);
  let bv = -1;
  for (let k = 0; k < G.n; k++) if (G.inside[k]) {
    const dot = v => G.sp[k] * v[0] + G.cp[k] * (v[1] * G.cl[k] + v[2] * G.sl[k]);
    GM.lit[k] = dot(S0) > G.sHzS[k] ? 1 : 0; GM.earthNow[k] = dot(E0) > G.sHzE[k] ? 1 : 0;
    let n = 0; for (const v of SV) if (dot(v) > G.sHzS[k]) n++;
    GM.stay[k] = n / K;
    GM.score[k] = (GM.stay[k] + GM.earthNow[k] + G.iceS[k]) / 3;
    if (GM.score[k] > bv) { bv = GM.score[k]; GM.best = k; }
  }
  GM.pick = -1; GM.revealed = false; GM.sitePts = GM.landPts = 0;
  gSetStep(1);
  document.getElementById("gConfirm").disabled = true;
  document.getElementById("gResult").innerHTML = ""; document.getElementById("gToLand").hidden = true;
  gBriefing(); gDrawMap();
}
function gBriefing() {
  const D = eduGrid().D, s = sunAt(GM.time), e = earthAt(GM.time), C = D.region;
  // al polo "nord" è in ogni direzione: si usa la longitudine, che sulla mappa si legge sul bordo
  const lonW = v => fmtLon(v);
  document.getElementById("gBrief").innerHTML = [
    t("gBrief1", { d: esc(fmtDateL(GM.time)) }),
    GM.diff === "hard" ? t("gBriefHard") : t("gBrief2", { sa: `${lonW(s.lon)}`, ea: `${lonW(e.lon)}`, ev: t(elevation(C.lat, C.lon, e) > 0 ? "gEarthUp" : "gEarthDown") }),
    t("gBrief3"), `<span class="k">${t("gBrief4")}</span>`].map(x => `<p>${x}</p>`).join("");
}
function gRimAngle(body) {   // direzione sul bordo della mappa polare (0° in alto, senso orario verso est)
  const [x, y] = projFwd(-89.5 + 0 * body.lat, body.lon, eduGrid().D.region); return Math.atan2(x, y);
}
function gDrawMap() {
  const G = eduGrid(), D = G.D, lutS = LUTS.score, bvS = GM.score[GM.best];
  const T = GM.T = drawGridMap(gMapCv, G, k => {
    // "foto dall'orbita": chiaro dove c'è Sole adesso, scuro in ombra
    const tex = .55 + .45 * D.sun[k] - .08 * Math.min(1, Math.abs(D.hz[k]) / 6);
    let v = GM.lit[k] ? 70 + 170 * tex : 10 + 10 * D.sun[k];
    let rgb = [v, v * .98, v * .95];
    if (GM.revealed) { const li = Math.round(Math.max(0, GM.score[k] / bvS) * 255) * 3; rgb = rgb.map((c, i) => c * .35 + lutS[li + i] * .65); }
    return rgb;
  }, { widthFrac: 1, labels: true, margin: 52 });
  const c = T.c, cx = T.css / 2, cy = T.css / 2, R = T.size / 2;
  drawLLGrid(T, G, { inside: true, color: "rgba(127,211,255,.25)" }); drawNorthArrows(T);
  // Sole e Terra sul bordo
  const s = sunAt(GM.time), e = earthAt(GM.time);
  if (GM.diff !== "hard") [[s, "#fde047", t("xSun")], [e, "#38bdf8", t("xEarth")]].forEach(([b, col, lb]) => {
    const a = gRimAngle(b), x = cx + (R + 18) * Math.sin(a), y = cy - (R + 18) * Math.cos(a);
    c.fillStyle = col; c.beginPath(); c.arc(x, y, 9, 0, 2 * Math.PI); c.fill();
    if (b === e) { c.strokeStyle = "#fff"; c.lineWidth = 1.5; c.stroke(); }
    c.font = "600 11px Inter, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText(lb, cx + (R + 38) * Math.sin(a), cy - (R + 38) * Math.cos(a));
  });
  const mark = (k, col, txt) => { const [x, y] = T.kToPx(k); c.fillStyle = col; c.strokeStyle = "#111"; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 9, 0, 2 * Math.PI); c.fill(); c.stroke(); c.fillStyle = "#111"; c.font = "800 10px Inter"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(txt, x, y + .5); };
  if (GM.pick >= 0) mark(GM.pick, "#fff", "✕");
  if (GM.revealed) {
    const [x1, y1] = T.kToPx(GM.pick), [x2, y2] = T.kToPx(GM.best);
    c.setLineDash([4, 4]); c.strokeStyle = "rgba(255,255,255,.7)"; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); c.setLineDash([]);
    mark(GM.best, "#c4f06a", "★");
  }
}
gMapCv.addEventListener("click", e => {
  if (GM.step !== 1 || GM.revealed || !GM.T) return;
  const r = gMapCv.getBoundingClientRect(), k = GM.T.pxToK(e.clientX - r.left, e.clientY - r.top);
  if (k < 0) return;
  GM.pick = k; document.getElementById("gConfirm").disabled = false;
  document.getElementById("gResult").textContent = t("gPick", { c: fmtLL(eduGrid().lat[k], eduGrid().lon[k]) });
  gDrawMap();
});
document.getElementById("gConfirm").addEventListener("click", () => {
  if (GM.pick < 0) return;
  const G = eduGrid(), D = G.D, k = GM.pick;
  GM.revealed = true; GM.sitePts = Math.round(100 * Math.pow(Math.max(0, GM.score[k] / GM.score[GM.best]), DIFF[GM.diff || "easy"].exp));
  const dist = gcKm(G.lat[k], G.lon[k], G.lat[GM.best], G.lon[GM.best]);
  document.getElementById("gResult").innerHTML = `${t("gScore")}<div class="big">${GM.sitePts}/100</div>`
    + `<p>${t("gDetail", { s: Math.round(GM.stay[k] * 100), e: t(GM.earthNow[k] ? "gYes" : "gNo"), i: D.ice[k].toFixed(1) })}</p>`
    + `<p>${t("gBest", { d: dist.toFixed(1) })}</p>`;
  document.getElementById("gConfirm").disabled = true; document.getElementById("gToLand").hidden = false;
  gDrawMap();
});
document.getElementById("gNew1").addEventListener("click", gNewScenario);
document.getElementById("gNew3").addEventListener("click", gNewScenario);
document.getElementById("gToLand").addEventListener("click", () => gStartLanding());
function gSetStep(s) {
  const prev = GM.step; GM.step = s;
  if (prev !== s) setTimeout(() => introGame(s), 0);
  document.querySelectorAll("#gSteps li").forEach(li => { const n = +li.dataset.s; li.classList.toggle("on", n === s); li.classList.toggle("done", n < s); });
  document.getElementById("gSide0").hidden = s !== 0; document.getElementById("gSide1").hidden = s !== 1; document.getElementById("gSide2").hidden = s !== 2; document.getElementById("gSide3").hidden = s !== 3;
  if (s === 0) { document.querySelectorAll("#gDiff [data-d]").forEach(x => x.classList.toggle("active", x.dataset.d === GM.diff)); if (GM.time) gDrawMap(); }
  gWrap.classList.toggle("landing", s === 2); gWrap.classList.toggle("patch", s === 3);
  document.getElementById("gPadCtl").hidden = s !== 2; document.getElementById("gCompass").hidden = s !== 1;
  if (s !== 2) cancelAnimationFrame(LD.raf);
}

/* ---------- Difficoltà ---------- */
const DIFF = {
  easy:   { fuel: Infinity, burn: 1,   meteor: 0,   pad: [8, 25],   exp: 1 },
  medium: { fuel: 75,       burn: 1,   meteor: .4,  pad: [35, 60],  exp: 2 },
  hard:   { fuel: 45,       burn: 1.5, meteor: .8,  pad: [70, 105], exp: 3 },
};
document.getElementById("gDiff").addEventListener("click", e => {
  const b = e.target.closest("[data-d]"); if (!b) return;
  GM.diff = b.dataset.d;
  document.querySelectorAll("#gDiff [data-d]").forEach(x => x.classList.toggle("active", x === b));
  gNewScenario();
});
document.getElementById("gChangeDiff").addEventListener("click", () => gSetStep(0));

/* ---------- Paperella (immagine del team) ---------- */
const DUCK = new Image();
DUCK.src = "images/duck.webp";
const DUCK_SPLAT = new Image();          // papera stordita: schianto nel gioco
DUCK_SPLAT.src = "images/duck-splat.webp";
function drawDuck(c, x, y, h, opt = {}) {           // (x, y) = centro dei piedi
  const img = opt.img || DUCK;
  if (!img.complete || !img.naturalWidth) return;
  const w = h * img.naturalWidth / img.naturalHeight;
  c.save(); c.translate(x, y); if (opt.rot) c.rotate(opt.rot);
  c.scale((opt.flip ? -1 : 1) * (opt.sx || 1), opt.sy || 1);
  if (opt.alpha != null) c.globalAlpha = opt.alpha;
  c.drawImage(img, -w / 2, -h, w, h); c.restore();
}

/* ---------- Allunaggio (vista laterale) ---------- */
const LD = { raf: 0, keys: {}, state: null, spaceHold: false };
const gLc = document.getElementById("gLander");
const Y0 = 150;                                        // quota di partenza (m)
function gStartLanding() {
  const G = eduGrid(), D = G.D, k = GM.pick, N = G.N, i0 = Math.floor(k / N), j0 = k % N, P = DIFF[GM.diff || "easy"];
  // rugosità dal dato: variabilità dell'orizzonte nei dintorni del sito
  let s = 0, s2 = 0, n = 0;
  for (let di = -3; di <= 3; di++) for (let dj = -3; dj <= 3; dj++) { const kk = (i0 + di) * N + (j0 + dj); if (G.inside[kk]) { s += D.hz[kk]; s2 += D.hz[kk] ** 2; n++; } }
  const rough = Math.max(.1, Math.min(1, Math.sqrt(Math.max(0, s2 / n - (s / n) ** 2)) / 1.2));
  const padX = (Math.random() < .5 ? -1 : 1) * (P.pad[0] + Math.random() * (P.pad[1] - P.pad[0]));
  const seed = Math.random() * 100, tilt = (Math.random() < .5 ? -1 : 1) * rough * 7 * DEG, pw = 16 - 8 * rough, amp = 4 + 14 * rough;
  const ground = x => {
    const u = x - padX;
    const pad = Math.tan(tilt) * u, hills = amp * (Math.sin(x * .045 + seed) * .6 + Math.sin(x * .11 + seed * 2) * .3 + Math.sin(x * .27 + seed * 3) * .1) - amp * .3;
    const w = Math.min(1, Math.max(0, (Math.abs(u) - pw / 2) / 14));
    return pad * (1 - w) + hills * w * w * (3 - 2 * w);
  };
  LD.state = { x: (Math.random() - .5) * 10, y: Y0, vx: 0, vy: -2, fuel: P.fuel, fuel0: P.fuel, burn: P.burn, meteorRate: P.meteor,
               ground, rough, pw, padX, lit: !!GM.lit[k], t: 0, phase: "ready", thrust: false, side: 0, result: null,
               auto: false, usedAuto: false, meteors: [], dust: [], craters: [], nextMeteor: 2.5,
               flyby: null, duckT: 0 };
  document.getElementById("gLandRes").innerHTML = "";
  document.getElementById("gRetry").hidden = true; document.getElementById("gToPatch").hidden = true;
  document.getElementById("gAuto").classList.remove("active"); document.getElementById("gStartDescent").hidden = false;
  gSetStep(2);
  setTimeout(() => gLc.focus(), 50);
  gLoop();
}
function gBeginDescent() {
  const L = LD.state; if (!L || L.phase !== "ready") return;
  L.phase = "fly"; L.t = 0; document.getElementById("gStartDescent").hidden = true;
  const kinds = ["comet", "ufo", "orion"], dir = Math.random() < .5 ? 1 : -1;
  L.flyby = { kind: kinds[Math.floor(Math.random() * kinds.length)], dir, t: 0, y: .12 + Math.random() * .14 };
}
function gToggleAuto(on) {
  const L = LD.state; if (!L || L.phase !== "fly") return;
  L.auto = on == null ? !L.auto : on; if (L.auto) L.usedAuto = true;
  document.getElementById("gAuto").classList.toggle("active", L.auto);
}
function gLoop() {               // (ri)avvia il ciclo senza azzerare lo stato del lander
  let last = performance.now(), acc = 0;
  const loop = now => {
    acc += Math.min(.1, (now - last) / 1000); last = now;
    while (acc >= 1 / 60) { gPhysics(1 / 60); acc -= 1 / 60; }
    gDrawLander(); LD.raf = requestAnimationFrame(loop);
  };
  cancelAnimationFrame(LD.raf); LD.raf = requestAnimationFrame(loop);
}
const groundUnder = L => Math.max(L.ground(L.x - 2.5), L.ground(L.x + 2.5));
function autopilot(L) {           // pilota automatico: va sopra il sito e scende piano (non schiva i meteoriti)
  const alt = L.y - groundUnder(L), dx = L.padX - L.x, over = Math.abs(dx) < L.pw / 2 - 1;
  const vxT = Math.max(-7, Math.min(7, dx * .3));
  const side = L.vx < vxT - .25 ? 1 : L.vx > vxT + .25 ? -1 : 0;
  // profilo di discesa efficiente: cade finché può ancora frenare con margine, poi rallenta fino a ~1 m/s
  let vyT = -Math.max(.9, Math.min(16, Math.sqrt(2 * 2.2 * Math.max(0, alt - 1.5))));
  const tGo = Math.abs(dx) / Math.max(1.5, Math.abs(L.vx));
  if (!over && alt < 12 + tGo * 1.2) vyT = Math.max(vyT, -.4);   // non ancora sopra il sito: non scendere troppo
  return { up: L.vy < vyT, side };
}
function gFinish(L, kind, extra = {}) {
  L.phase = kind; L.t = 0; L.thrust = false; L.side = 0; L.auto = false;
  document.getElementById("gPadCtl").hidden = true;
  document.getElementById("gAuto").classList.remove("active");
  const R = document.getElementById("gLandRes");
  if (kind === "landed") {
    const { vy, vx, slope, dist } = extra;
    const soft = Math.round(35 * Math.max(0, 1 - vy / 3.2) * (vx < 1 ? 1 : .7));
    const sl = Math.round(15 * Math.max(0, 1 - slope / 14));
    const pr = Math.round(dist <= L.pw / 2 ? 35 : 35 * Math.max(0, 1 - (dist - L.pw / 2) / 30));
    const li = L.lit ? 15 : 5;
    let pts = soft + sl + pr + li; if (L.usedAuto) pts = Math.round(pts / 2);
    GM.landPts = pts;
    R.innerHTML = `<div class="big">${pts}/100</div>${t(vy > 2.2 || vx > 1.2 || slope > 9 ? "gLandHard" : "gLandOk", { p: pts })}`
      + `<p>${t("gLandWhy2", { a: soft, b: sl, c: pr, d: li })}</p>` + (L.usedAuto ? `<p>${t("gAutoHalf")}</p>` : "");
  } else {
    GM.landPts = 0;
    R.innerHTML = `<span class="bad">${t(kind === "escape" ? "gEscaped" : extra.meteor ? "gHitMeteor" : "gLandCrash")}</span>`;
  }
  document.getElementById("gRetry").hidden = false; document.getElementById("gToPatch").hidden = kind !== "landed";
}
function gPhysics(dt) {
  const L = LD.state; if (!L) return;
  L.t += dt;
  if (L.flyby) { L.flyby.t += dt; if (L.flyby.t > 5) L.flyby = null; }
  // polvere e meteoriti continuano anche dopo l'atterraggio (finché sono in aria)
  for (const p of L.dust) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= 1.62 * dt; p.life -= dt; }
  L.dust = L.dust.filter(p => p.life > 0);
  for (const m of L.meteors) {
    m.x += m.vx * dt; m.y += m.vy * dt; m.rot += dt * 3;
    if (m.y <= L.ground(m.x) + m.r * .3) {
      m.dead = true; L.craters.push({ x: m.x, r: m.r * 1.8 });
      for (let i = 0; i < 12; i++) L.dust.push({ x: m.x, y: L.ground(m.x) + 1, vx: (Math.random() - .5) * 16, vy: 3 + Math.random() * 9, life: .8 + Math.random() * .8 });
    }
    if (!m.dead && L.phase === "fly" && Math.hypot(m.x - L.x, m.y - (L.y + 6)) < m.r + 5.5) { m.dead = true; L.hitBy = m; gFinish(L, "crash", { meteor: true }); }
  }
  L.meteors = L.meteors.filter(m => !m.dead && m.y > -60);
  if (L.phase === "escape") { L.vy += 7 * dt; L.y += L.vy * dt; L.thrust = true; return; }
  if (L.phase !== "fly") return;
  // meteoriti (medio / difficile)
  if (L.meteorRate > 0 && L.t > 2.5) {
    L.nextMeteor -= dt;
    if (L.nextMeteor <= 0) {
      L.nextMeteor = (.4 + Math.random() * 1.2) / L.meteorRate;
      const aim = Math.random() < .35 ? L.x + (Math.random() - .5) * 80 : (Math.random() - .5) * 260;
      const vy = -(24 + Math.random() * 16), vx = (Math.random() - .5) * 14, tFall = (215 - L.ground(aim)) / -vy;
      L.meteors.push({ x: aim - vx * tFall, y: 215, vx, vy, r: 1.3 + Math.random() * 1.6, rot: Math.random() * 6, seed: Math.random() * 1e4 });
    }
  }
  // comandi: manuali o pilota automatico (un comando manuale lo disattiva)
  const manual = LD.keys.up || LD.keys.left || LD.keys.right;
  if (manual && L.auto) gToggleAuto(false);
  let up, side;
  if (L.auto) ({ up, side } = autopilot(L));
  else { up = !!LD.keys.up; side = (LD.keys.right ? 1 : 0) - (LD.keys.left ? 1 : 0); }
  const hasFuel = L.fuel > 0;
  up = up && hasFuel; side = hasFuel ? side : 0;
  L.thrust = up; L.side = side;
  // più reattivo: motore 5,0 m/s², laterali 3,2 m/s²
  const ax = 3.2 * side, ay = -1.62 + (up ? 5.0 : 0);
  if (isFinite(L.fuel)) L.fuel = Math.max(0, L.fuel - dt * L.burn * ((up ? 3.6 : 0) + (side ? 1.5 : 0)));
  L.vx += ax * dt; L.vy += ay * dt;
  L.vx *= 1 - .02 * dt;                                // piccolo smorzamento: controllo più preciso
  L.x += L.vx * dt; L.y += L.vy * dt;
  if (L.x < -128 || L.x > 128) { L.x = Math.max(-128, Math.min(128, L.x)); L.vx = 0; }
  // troppa spinta: il lander supera la quota di partenza e se ne va
  if (L.y > Y0 + 8) { L.vy = Math.max(L.vy, 4); gFinish(L, "escape"); return; }
  const gl = groundUnder(L);
  if (L.y <= gl) {
    L.y = gl; const slope = Math.atan(Math.abs(L.ground(L.x + 2.5) - L.ground(L.x - 2.5)) / 5) / DEG;
    const vy = Math.abs(L.vy), vx = Math.abs(L.vx), dist = Math.abs(L.x - L.padX);
    L.vx = L.vy = 0;
    for (let i = 0; i < 18; i++) L.dust.push({ x: L.x + (Math.random() - .5) * 6, y: gl + .5, vx: (Math.random() - .5) * 12, vy: 1 + Math.random() * 4, life: .6 + Math.random() * .9 });
    if (vy > 3.2 || vx > 2 || slope > 14) gFinish(L, "crash", { vy, vx, slope });
    else gFinish(L, "landed", { vy, vx, slope, dist });
  }
}

/* --- disegni --- */
function drawFlyby(c, F, W, H) {
  const p = F.t / 5, x = F.dir > 0 ? -80 + p * (W + 160) : W + 80 - p * (W + 160), y = H * F.y + Math.sin(F.t * 1.7) * 6;
  c.save(); c.translate(x, y); c.scale(1.6, 1.6);
  if (F.kind === "comet") {
    const g = c.createLinearGradient(0, 0, -F.dir * 170, -18); g.addColorStop(0, "rgba(186,230,253,.85)"); g.addColorStop(1, "rgba(186,230,253,0)");
    c.fillStyle = g; c.beginPath(); c.moveTo(0, -5); c.lineTo(-F.dir * 170, -26); c.lineTo(-F.dir * 170, 6); c.lineTo(0, 5); c.closePath(); c.fill();
    const h = c.createRadialGradient(0, 0, 1, 0, 0, 12); h.addColorStop(0, "#fff"); h.addColorStop(.4, "rgba(165,243,252,.9)"); h.addColorStop(1, "rgba(165,243,252,0)");
    c.fillStyle = h; c.beginPath(); c.arc(0, 0, 12, 0, 2 * Math.PI); c.fill();
  } else if (F.kind === "ufo") {
    c.fillStyle = "rgba(125,211,252,.55)"; c.beginPath(); c.ellipse(0, -6, 9, 8, 0, Math.PI, 0); c.fill();
    c.fillStyle = "#9ca3af"; c.strokeStyle = "#e5e7eb"; c.lineWidth = 1; c.beginPath(); c.ellipse(0, 0, 24, 6.5, 0, 0, 2 * Math.PI); c.fill(); c.stroke();
    for (let i = -2; i <= 2; i++) { c.fillStyle = (Math.floor(F.t * 6) + i) % 2 ? "#facc15" : "#4ade80"; c.beginPath(); c.arc(i * 8, 1.5, 1.8, 0, 2 * Math.PI); c.fill(); }
    const b = c.createLinearGradient(0, 6, 0, 40); b.addColorStop(0, "rgba(190,242,100,.25)"); b.addColorStop(1, "rgba(190,242,100,0)");
    c.fillStyle = b; c.beginPath(); c.moveTo(-8, 6); c.lineTo(8, 6); c.lineTo(16, 40); c.lineTo(-16, 40); c.closePath(); c.fill();
  } else {                                     // capsula Orion con modulo di servizio e pannelli
    c.scale(F.dir, 1);
    c.fillStyle = "#1e3a8a"; [[-26, -15], [-26, 9]].forEach(([px, py]) => c.fillRect(px, py, 22, 6));
    c.strokeStyle = "#93c5fd"; c.lineWidth = .6; [[-26, -15], [-26, 9]].forEach(([px, py]) => c.strokeRect(px, py, 22, 6));
    c.fillStyle = "#d1d5db"; c.fillRect(-8, -6, 14, 12);
    c.fillStyle = "#f3f4f6"; c.beginPath(); c.moveTo(6, -7); c.lineTo(18, -3); c.lineTo(18, 3); c.lineTo(6, 7); c.closePath(); c.fill();
    c.fillStyle = "#6b7280"; c.fillRect(-12, -3, 4, 6);
    c.fillStyle = "rgba(253,186,116,.8)"; c.beginPath(); c.moveTo(-12, -2); c.lineTo(-20 - Math.random() * 6, 0); c.lineTo(-12, 2); c.fill();
  }
  c.restore();
  c.font = "600 12px Inter, sans-serif"; c.textAlign = "center"; c.fillStyle = "rgba(229,231,235,.9)";
  c.fillText(t({ comet: "gComet", ufo: "gUfo", orion: "gOrion" }[F.kind]), x, y + 40);
}
function drawFlag(c, x, y, k, t0) {           // bandiera NASA piantata (k: 0→1 mentre sale)
  const h = 52 * k, fw = 36, fh = 22;
  c.strokeStyle = "#e5e7eb"; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - h); c.stroke();
  if (k < .99) return;
  c.save(); c.translate(x, y - h);
  c.beginPath(); c.moveTo(0, 0);
  for (let i = 0; i <= 8; i++) c.lineTo(i / 8 * fw, Math.sin(t0 * 3 + i * .8) * 1.4);
  for (let i = 8; i >= 0; i--) c.lineTo(i / 8 * fw, fh + Math.sin(t0 * 3 + i * .8) * 1.4);
  c.closePath(); c.fillStyle = "#0b3d91"; c.fill();
  c.fillStyle = "#fff"; c.font = "800 11px Inter, Arial, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
  c.fillText("NASA", fw / 2, fh / 2 + Math.sin(t0 * 3 + 4) * 1.2);
  c.restore();
}
function drawLanderBody(c, L, lx, ly) {
  c.save(); c.translate(lx, ly); c.scale(1.6, 1.6);
  if (L.thrust) { const f = 10 + Math.random() * 10; const g = c.createLinearGradient(0, 0, 0, f + 6); g.addColorStop(0, "#fff7c2"); g.addColorStop(1, "rgba(249,115,22,0)"); c.fillStyle = g; c.beginPath(); c.moveTo(-4, -2); c.lineTo(4, -2); c.lineTo(0, f + 6); c.closePath(); c.fill(); }
  if (L.side && L.phase === "fly") { c.fillStyle = "#fde68a"; c.fillRect(L.side > 0 ? -16 : 12, -16, 4, 2); }
  if (L.phase === "crash") c.rotate(.5);
  c.fillStyle = L.phase === "crash" ? "#6b7280" : "#d4d4d8"; c.strokeStyle = "#111"; c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(-9, -6); c.lineTo(9, -6); c.lineTo(7, -20); c.lineTo(-7, -20); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = "#f59e0b"; c.fillRect(-6, -18, 12, 5);
  c.strokeStyle = "#d4d4d8"; c.lineWidth = 1.8; c.beginPath(); c.moveTo(-7, -6); c.lineTo(-12, 0); c.moveTo(7, -6); c.lineTo(12, 0); c.stroke();
  if (L.auto) { c.fillStyle = "#4ade80"; c.beginPath(); c.arc(0, -23, 2, 0, 2 * Math.PI); c.fill(); }
  c.restore();
}
/* --- easter egg: troppa spinta → viaggio tra i pianeti --- */
function drawPlanet(c, kind, x, y, r, tt) {
  c.save(); c.translate(x, y);
  const shade = () => { const g = c.createRadialGradient(-r * .35, -r * .35, r * .2, 0, 0, r * 1.05); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.55)"); c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, 2 * Math.PI); c.fill(); };
  const disc = col => { c.fillStyle = col; c.beginPath(); c.arc(0, 0, r, 0, 2 * Math.PI); c.fill(); };
  const clip = () => { c.beginPath(); c.arc(0, 0, r, 0, 2 * Math.PI); c.clip(); };
  if (kind === "earth") {
    disc("#1d4ed8"); c.save(); clip();
    c.fillStyle = "#22c55e"; [[-.3, -.2, .38, .25, .5], [.35, .25, .3, .22, -.4], [.1, -.55, .25, .12, .2]].forEach(([a, b, w, h, rt]) => { c.beginPath(); c.ellipse(a * r, b * r, w * r, h * r, rt, 0, 2 * Math.PI); c.fill(); });
    c.fillStyle = "rgba(255,255,255,.7)"; [[-.5, .35, .35, .07], [.2, -.3, .4, .06], [.4, .6, .3, .05]].forEach(([a, b, w, h]) => { c.beginPath(); c.ellipse(a * r + tt * 4 % r, b * r, w * r, h * r, 0, 0, 2 * Math.PI); c.fill(); });
    c.restore(); shade(); c.strokeStyle = "rgba(125,211,252,.5)"; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, r + 2, 0, 2 * Math.PI); c.stroke();
  } else if (kind === "mars") {
    disc("#c2410c"); c.save(); clip();
    c.fillStyle = "rgba(127,29,29,.55)"; [[-.2, .1, .4, .15], [.3, -.3, .25, .1], [0, .5, .5, .12]].forEach(([a, b, w, h]) => { c.beginPath(); c.ellipse(a * r, b * r, w * r, h * r, .3, 0, 2 * Math.PI); c.fill(); });
    c.fillStyle = "rgba(255,255,255,.8)"; c.beginPath(); c.ellipse(0, -r * .92, r * .35, r * .12, 0, 0, 2 * Math.PI); c.fill();
    c.restore(); shade();
  } else if (kind === "jupiter") {
    disc("#d6b98c"); c.save(); clip();
    const bands = ["#b07b4f", "#e8d3b0", "#9a6a43", "#f1e2c6", "#b98a5e", "#e2c8a0", "#8c5e3c"];
    bands.forEach((col, i) => { c.fillStyle = col; c.fillRect(-r, -r + i * 2 * r / bands.length + Math.sin(i * 2 + tt) * 2, 2 * r, r / bands.length * 1.2); });
    c.fillStyle = "#b4442b"; c.beginPath(); c.ellipse(r * .3, r * .3, r * .2, r * .11, 0, 0, 2 * Math.PI); c.fill();
    c.restore(); shade();
  } else if (kind === "saturn") {
    const ring = front => { c.save(); c.rotate(-.35); c.strokeStyle = "rgba(231,215,170,.85)"; c.lineWidth = r * .18; c.beginPath(); c.ellipse(0, 0, r * 1.9, r * .5, 0, front ? 0 : Math.PI, front ? Math.PI : 2 * Math.PI); c.stroke(); c.strokeStyle = "rgba(180,160,120,.7)"; c.lineWidth = r * .08; c.beginPath(); c.ellipse(0, 0, r * 1.55, r * .38, 0, front ? 0 : Math.PI, front ? Math.PI : 2 * Math.PI); c.stroke(); c.restore(); };
    ring(false); disc("#e3c98f"); c.save(); clip();
    ["#cfae6e", "#f0dcae", "#c49a5a"].forEach((col, i) => { c.fillStyle = col; c.fillRect(-r, -r * .5 + i * r * .4, 2 * r, r * .18); });
    c.restore(); shade(); ring(true);
  } else if (kind === "neptune") {
    disc("#3b82f6"); c.save(); clip(); c.fillStyle = "rgba(191,219,254,.35)"; c.fillRect(-r, -r * .2, 2 * r, r * .12); c.fillStyle = "#1e3a8a"; c.beginPath(); c.ellipse(-r * .3, r * .25, r * .18, r * .1, 0, 0, 2 * Math.PI); c.fill(); c.restore(); shade();
  }
  c.restore();
}
const J_PER = 2.2, J_HYPER = 1 + 4 * J_PER + 4.4;     // dopo Nettuno: salto nell'iperspazio
function drawHyperspace(c, W, H, h) {
  const cx = W / 2, cy = H * .5, rn = mulberry32(23), D = Math.hypot(W, H) * .6;
  c.fillStyle = "#01020a"; c.fillRect(0, 0, W, H);
  const charge = Math.min(1, h / 1.3);                         // le stelle si allungano verso il centro…
  for (let i = 0; i < 260; i++) {
    const a = rn() * Math.PI * 2, d0 = rn(), sp = .5 + rn();
    let r1, r2;
    if (h < 1.3) { r2 = 30 + d0 * D; r1 = r2 - (2 + charge * charge * r2 * .9); }
    else { const u = ((d0 + (h - 1.3) * sp * .9) % 1); r1 = 20 + u * u * D; r2 = r1 + 30 + u * u * D * .55; }   // …poi il tunnel
    const col = i % 5 ? "rgba(219,234,254," : "rgba(147,197,253,";
    c.strokeStyle = col + (.35 + .6 * rn()) + ")"; c.lineWidth = h < 1.3 ? 1.2 : 1 + rn() * 1.6;
    c.beginPath(); c.moveTo(cx + Math.cos(a) * Math.max(0, r1), cy + Math.sin(a) * Math.max(0, r1)); c.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); c.stroke();
  }
  if (h >= 1.3) { const g = c.createRadialGradient(cx, cy, 0, cx, cy, 120); g.addColorStop(0, "rgba(191,219,254,.55)"); g.addColorStop(1, "rgba(191,219,254,0)"); c.fillStyle = g; c.fillRect(0, 0, W, H); }
  // l'astronave trema, rimpicciolisce e sparisce nel punto di fuga
  if (h < 1.6) {
    const k = Math.max(0, (h - .6) / 1), sc = 2.2 * (1 - k * .97), sx = W * .47 + (cx - W * .47) * k + (h < .6 ? (Math.random() - .5) * 4 : 0), sy = H * .55 + (cy - H * .55) * k;
    if (sc > .05) { c.save(); c.translate(sx, sy); c.scale(sc, sc); c.translate(-sx, -sy); drawLanderBody(c, { thrust: true, side: 0, phase: "escape", auto: false }, sx, sy); c.restore(); }
  }
  if (h > 1.25 && h < 1.75) { c.fillStyle = `rgba(255,255,255,${.9 * (1 - Math.abs(h - 1.4) / .35)})`; c.fillRect(0, 0, W, H); }
  // la domanda finale
  if (h > 1.9) {
    const a = Math.min(1, (h - 1.9) / .8), lines = t("gGalaxies").split("\n");
    c.save(); c.globalAlpha = a; c.textAlign = "center"; c.textBaseline = "middle";
    const fs = Math.max(18, Math.min(34, W / 30)); c.font = `800 ${fs}px Orbitron, Inter, sans-serif`;
    c.fillStyle = "#fde047"; c.strokeStyle = "rgba(0,0,0,.75)"; c.lineWidth = 5;
    lines.forEach((ln, i) => { const y = H * .36 + (i - (lines.length - 1) / 2) * fs * 1.35; c.strokeText(ln, cx, y); c.fillText(ln, cx, y); });
    c.restore();
  }
}
function drawJourney(c, L, W, H, s) {
  if (s >= J_HYPER) return drawHyperspace(c, W, H, s - J_HYPER);
  c.fillStyle = "#02030a"; c.fillRect(0, 0, W, H);
  // stelle che sfrecciano (l'astronave sale)
  const rn = mulberry32(11), speed = 240 + Math.min(900, s * 160);
  for (let i = 0; i < 220; i++) {
    const x = rn() * W, d = .2 + rn() * .8, y = ((rn() * H + s * speed * d) % (H + 40)) - 20, len = Math.min(60, speed * d * .06);
    c.strokeStyle = `rgba(255,255,255,${.25 + .6 * d})`; c.lineWidth = d * 1.6; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - len); c.stroke();
  }
  // la Luna che si allontana in basso
  if (s < 3) { const R = W * .9, y = H + R * .75 + s * s * 70; c.fillStyle = "#8f8d87"; c.beginPath(); c.arc(W / 2, y, R, 0, 2 * Math.PI); c.fill(); }
  // pianeti in sequenza (si ripete)
  const seq = [["earth", .2, .11], ["mars", .78, .07], ["jupiter", .22, .2], ["saturn", .76, .14], ["neptune", .25, .1]];
  const per = J_PER;
  for (let i = 0; i < seq.length; i++) {
    const [kind, fx, fr] = seq[i], r = Math.min(W, H) * fr * 1.6;
    const u = s - 1 - i * per; if (u < 0) continue;
    const y = -r * 2 + u * (H + r * 4) / (per * 2.2);
    if (y > H + r * 2.2) continue;
    drawPlanet(c, kind, W * fx, y, r, s);
    c.font = "600 13px Inter, sans-serif"; c.textAlign = "center"; c.fillStyle = "rgba(229,231,235,.85)";
    c.fillText(t({ earth: "gPlEarth", mars: "gPlMars", jupiter: "gPlJupiter", saturn: "gPlSaturn", neptune: "gPlNeptune" }[kind]), W * fx, y + r * (kind === "saturn" ? 1.1 : 1) + 22);
  }
  // l'astronave al centro, grande, con fiamma e leggero tremolio
  const sx = W * .47 + Math.sin(s * 2.1) * 10, sy = H * .55 + Math.sin(s * 3.3) * 6;
  c.save(); c.translate(sx, sy); c.scale(2.2, 2.2); c.translate(-sx, -sy);
  drawLanderBody(c, { thrust: true, side: 0, phase: "escape", auto: false }, sx, sy);
  c.restore();
}
function gDrawLander() {
  const L = LD.state; if (!L) return;
  const W = gLc.clientWidth, H = gLc.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (gLc.width !== Math.round(W * dpr)) { gLc.width = Math.round(W * dpr); gLc.height = Math.round(H * dpr); }
  const c = gLc.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const sc = Math.min(W / 262, (H - 60) / 182), X = x => W / 2 + x * sc, Y = y => H - 50 - (y + 20) * sc;
  c.fillStyle = "#000"; c.fillRect(0, 0, W, H);
  const rnd = mulberry32(5); for (let i = 0; i < (L.lit ? 40 : 160); i++) { c.fillStyle = `rgba(255,255,255,${.2 + rnd() * .5})`; c.fillRect(rnd() * W, rnd() * H * .6, 1.2, 1.2); }
  if (GM.earthNow[GM.pick]) drawEarthPhase(c, W * .82, H * .16, 16, .6, Math.PI);
  if (L.lit) { const g = c.createRadialGradient(W * .06, H * .55, 4, W * .06, H * .55, 140); g.addColorStop(0, "rgba(255,251,230,.95)"); g.addColorStop(.1, "rgba(253,224,71,.6)"); g.addColorStop(1, "rgba(253,224,71,0)"); c.fillStyle = g; c.fillRect(0, 0, W, H); }
  if (L.flyby) drawFlyby(c, L.flyby, W, H);
  // terreno
  c.beginPath(); c.moveTo(0, H);
  for (let px = 0; px <= W; px += 3) c.lineTo(px, Y(L.ground((px - W / 2) / sc)));
  c.lineTo(W, H); c.closePath();
  if (L.lit) { const g = c.createLinearGradient(0, 0, W, 0); g.addColorStop(0, "#b8b5ad"); g.addColorStop(1, "#5c5a55"); c.fillStyle = g; }
  else c.fillStyle = GM.earthNow[GM.pick] ? "#22232a" : "#17181d";
  c.fill();
  c.strokeStyle = L.lit ? "rgba(255,255,255,.25)" : "rgba(170,180,200,.45)"; c.lineWidth = 1.2;
  c.beginPath(); for (let px = 0; px <= W; px += 3) { const y = Y(L.ground((px - W / 2) / sc)); px ? c.lineTo(px, y) : c.moveTo(px, y); } c.stroke();
  for (const cr of L.craters) { c.fillStyle = "rgba(0,0,0,.35)"; c.beginPath(); c.ellipse(X(cr.x), Y(L.ground(cr.x)) + 1, cr.r * sc, cr.r * sc * .3, 0, 0, 2 * Math.PI); c.fill(); }
  const lx = X(L.x), ly = Y(L.y);
  if (!L.lit && L.phase !== "escape") {
    c.save(); c.globalCompositeOperation = "lighter";
    const gy = Y(L.ground(L.x)), g = c.createRadialGradient(lx, gy, 4, lx, gy, 22 * sc);
    g.addColorStop(0, "rgba(220,230,255,.55)"); g.addColorStop(1, "rgba(220,230,255,0)"); c.fillStyle = g;
    c.beginPath(); c.moveTo(lx - 4, ly - 6); c.lineTo(lx - 22 * sc, gy + 10); c.lineTo(lx + 22 * sc, gy + 10); c.lineTo(lx + 4, ly - 6); c.closePath(); c.fill();
    c.restore();
  }
  // sito d'atterraggio: luci ai bordi e segnale verticale
  const pxL = L.padX - L.pw / 2, pxR = L.padX + L.pw / 2, blink = (Math.sin(performance.now() / 250) + 1) / 2;
  [pxL, pxR].forEach(x => { c.fillStyle = `rgba(56,189,248,${.5 + .5 * blink})`; c.beginPath(); c.arc(X(x), Y(L.ground(x)) - 2, 3, 0, 2 * Math.PI); c.fill(); });
  if (L.phase === "ready" || L.phase === "fly") {
    const gx = X(L.padX), gy = Y(L.ground(L.padX));
    c.strokeStyle = "rgba(56,189,248,.35)"; c.setLineDash([3, 5]); c.beginPath(); c.moveTo(gx, gy - 6); c.lineTo(gx, gy - 70); c.stroke(); c.setLineDash([]);
    c.font = "700 11px Inter, sans-serif"; c.textAlign = "center"; c.fillStyle = "#7dd3fc"; c.fillText(t("gSiteLbl"), gx, gy - 76);
  }
  // meteoriti (con segnale di pericolo prima che entrino nell'inquadratura)
  for (const m of L.meteors) {
    const mx = X(m.x), my = Y(m.y);
    if (my < 0) { c.fillStyle = "#f87171"; c.font = "800 13px Inter"; c.textAlign = "center"; c.fillText("▼", mx, 14); continue; }
    c.strokeStyle = "rgba(203,213,225,.25)"; c.lineWidth = m.r * sc * .9; c.beginPath(); c.moveTo(mx, my); c.lineTo(mx - m.vx * .35 * sc, my + m.vy * .35 * sc); c.stroke();
    c.save(); c.translate(mx, my); c.rotate(m.rot); c.fillStyle = "#78716c"; c.strokeStyle = "#292524"; c.lineWidth = 1;
    const rr = m.r * sc, rn = mulberry32(m.seed | 0); c.beginPath();
    for (let i = 0; i < 7; i++) { const a = i / 7 * 2 * Math.PI, q = rr * (.75 + rn() * .35); i ? c.lineTo(Math.cos(a) * q, Math.sin(a) * q) : c.moveTo(q, 0); }
    c.closePath(); c.fill(); c.stroke(); c.restore();
  }
  for (const p of L.dust) { c.fillStyle = `rgba(200,200,200,${Math.min(.7, p.life)})`; c.fillRect(X(p.x), Y(p.y), 2, 2); }
  // lander e paperella
  if (L.phase === "landed") {
    const tt = L.t, dir = L.padX >= L.x ? -1 : 1;
    drawLanderBody(c, L, lx, ly);
    if (tt > .5) {                                   // la paperella scende e pianta la bandiera
      const k = Math.min(1, (tt - .5) / .9), dx = L.x + dir * (3 + 9 * k), wob = k < 1 ? Math.sin(tt * 14) * .08 : 0, fx = L.x + dir * 22;
      drawFlag(c, X(fx), Y(L.ground(fx)), Math.max(0, Math.min(1, (tt - 1.5) / .6)), tt);
      drawDuck(c, X(dx), Y(L.ground(dx)) + 2, 70, { rot: wob });
    }
    c.textAlign = "center"; c.font = "800 22px Orbitron, Inter, sans-serif"; c.fillStyle = "#4ade80";
    c.fillText(t(tt > 2 ? "gMissionOk" : "gContact"), W / 2, H * .3);
  } else if (L.phase === "crash") {
    drawLanderBody(c, L, lx, ly);
    const tt = L.t;
    if (tt < .5) { c.fillStyle = `rgba(214,211,209,${.6 * (1 - tt / .5)})`; c.beginPath(); c.arc(lx, ly - 8, 10 + tt * 50, 0, 2 * Math.PI); c.fill(); }
    if (tt < 1.4) {                                  // la paperella schizza fuori e vola verso lo schermo
      const k = Math.min(1, tt / 1.4), e = k * k, sx0 = lx, sy0 = ly - 20, tx = W / 2, ty = H * .62;
      const x = sx0 + (tx - sx0) * e, y = sy0 + (ty - sy0) * e - Math.sin(k * Math.PI) * H * .25;
      drawDuck(c, x, y, 16 + (H * .5 - 16) * e, { rot: k * 6.3 });
    } else {                                         // splat (dolce) sul vetro dello schermo
      const s = tt - 1.4, sq = s < .25 ? 1 - Math.sin(s / .25 * Math.PI) * .25 : 1, slide = Math.min(H * .08, s * 14);
      drawDuck(c, W / 2, H * .62 + slide, H * .5, { img: DUCK_SPLAT, sx: 1.18 / sq, sy: .86 * sq, rot: -.06, alpha: s > 3 ? Math.max(.8, 1 - (s - 3) * .1) : 1 });
      c.font = "900 34px Orbitron, Inter, sans-serif"; c.textAlign = "center"; c.fillStyle = "#fde047"; c.strokeStyle = "#111"; c.lineWidth = 4;
      c.strokeText(t("gSplat"), W / 2, H * .12 + 30); c.fillText(t("gSplat"), W / 2, H * .12 + 30);
      for (let i = 0; i < 5; i++) { const a = s * 2 + i * 1.26; c.fillStyle = "#fef08a"; c.font = "18px sans-serif"; c.fillText("✦", W / 2 + Math.cos(a) * W * .16, H * .3 + Math.sin(a) * 26); }
    }
    if (tt < 1.4) { c.textAlign = "center"; c.font = "800 22px Orbitron, Inter, sans-serif"; c.fillStyle = "#f87171"; c.fillText(t(L.hitBy ? "gMeteorHit" : "gCrash"), W / 2, H * .3); }
  } else if (L.phase === "escape") {
    const tt = L.t;
    if (tt < 1.2) drawLanderBody(c, L, lx, ly);       // il lander schizza via verso l'alto…
    else {                                             // …e parte il viaggio tra i pianeti
      const s = tt - 1.2;
      drawJourney(c, L, W, H, s);
      if (s < .35) { c.fillStyle = `rgba(255,255,255,${.8 * (1 - s / .35)})`; c.fillRect(0, 0, W, H); }   // lampo di partenza
      if (s > 2.2) {                                   // la paperella perplessa: "Bruh"
        const k = Math.min(1, (s - 2.2) / .5), dh = H * .36, x = W * .8, y = H + dh * (1 - k) * .7;
        drawDuck(c, x, y - 4, dh);
        c.textAlign = "center"; c.font = `900 ${Math.max(1, Math.round(64 * k))}px Orbitron, Inter, sans-serif`; c.fillStyle = "#fde047";
        c.fillText("?", x, y - dh - 10);
        if (s > 2.9) {
          const bx = x - dh * .95, by = y - dh * .75;
          c.fillStyle = "#fff"; c.strokeStyle = "#111"; c.lineWidth = 2;
          c.beginPath(); c.roundRect ? c.roundRect(bx - 55, by - 34, 110, 44, 14) : c.rect(bx - 55, by - 34, 110, 44); c.fill(); c.stroke();
          c.beginPath(); c.moveTo(bx + 30, by + 9); c.lineTo(bx + 56, by + 26); c.lineTo(bx + 46, by + 9); c.fill();
          c.fillStyle = "#111"; c.font = "800 24px Inter, sans-serif"; c.fillText("Bruh", bx, by - 4);
        }
      }
    }
    c.textAlign = "center"; c.font = "800 22px Orbitron, Inter, sans-serif"; c.fillStyle = "#fbbf24"; c.strokeStyle = "rgba(0,0,0,.6)"; c.lineWidth = 4;
    c.strokeText(t("gEscapeTitle"), W / 2, H * .1); c.fillText(t("gEscapeTitle"), W / 2, H * .1);
  } else {
    drawLanderBody(c, L, lx, ly);
  }
  // testi di stato
  c.textAlign = "center";
  if (L.phase === "ready") gDrawHowTo(c, W, H, blink);
  if (L.phase === "fly" && L.fuel <= 0) { c.font = "600 14px Inter"; c.fillStyle = "#fca5a5"; c.fillText(t("gOutOfFuel"), W / 2, H * .38); }
  if (L.phase === "fly" && L.auto) { c.font = "700 13px Inter"; c.fillStyle = "#4ade80"; c.fillText(t("gAutoOn"), W / 2, H * .38 + 18); }
  // telemetria
  const alt = Math.max(0, L.y - groundUnder(L)), dist = L.padX - L.x;
  const fuelTxt = isFinite(L.fuel) ? Math.round(L.fuel) + "%" : "∞";
  document.getElementById("gTele").innerHTML = [
    [t("gAlt"), alt.toFixed(1) + " m"], [t("gVs"), L.vy.toFixed(1) + " m/s", L.vy < -2.2], [t("gHs"), L.vx.toFixed(1) + " m/s", Math.abs(L.vx) > 1.2],
    [t("gFuel"), fuelTxt, isFinite(L.fuel) && L.fuel < 15], [t("gToSite"), (dist >= 0 ? "→ " : "← ") + Math.abs(dist).toFixed(0) + " m", Math.abs(dist) > L.pw / 2],
    [t("gSlope"), (Math.atan(Math.abs(L.ground(L.x + 2.5) - L.ground(L.x - 2.5)) / 5) / DEG).toFixed(0) + "°"]]
    .map(([a, b, w]) => `<div class="${w ? "warn" : ""}"><span>${a}</span>${b}</div>`).join("");
}

function gDrawHowToTouch(c, W, H, blink) {
  const lines = [t("gHowT1"), t("gHowT2"), t("gHowT3"), t("gHowT4")];
  const fs = Math.max(12, Math.min(15, W / 48)), bw = Math.min(W - 24, 520), bh = 50 + lines.length * (fs + 10) + 34, bx = (W - bw) / 2, by = Math.max(8, H * .06);
  c.save(); c.fillStyle = "rgba(8,10,18,.88)"; c.strokeStyle = "rgba(127,211,255,.55)"; c.lineWidth = 1.5;
  c.beginPath(); c.roundRect ? c.roundRect(bx, by, bw, bh, 14) : c.rect(bx, by, bw, bh); c.fill(); c.stroke();
  c.textAlign = "center"; c.textBaseline = "middle";
  c.font = `800 ${fs + 3}px Orbitron, Inter, sans-serif`; c.fillStyle = "#e8ecff"; c.fillText(t("gHowTouchT").toUpperCase(), W / 2, by + 24);
  c.font = `500 ${fs}px Inter, sans-serif`; c.fillStyle = "#e5e7eb";
  lines.forEach((l, i) => c.fillText(l, W / 2, by + 52 + i * (fs + 10)));
  c.font = `800 ${fs}px Inter, sans-serif`; c.fillStyle = `rgba(253,224,71,${.55 + .45 * blink})`; c.fillText(t("gTapStart"), W / 2, by + bh - 16);
  c.restore();
}
// schermata di istruzioni prima della discesa
function gDrawHowTo(c, W, H, blink) {
  if (document.body.classList.contains("touch")) return gDrawHowToTouch(c, W, H, blink);
  const rows = [[["SPAZIO|SPACE"], "gHowSpace"], [["▲", "W"], "gHowUp"], [["◀", "▶"], "gHowLR"], [["A", "D"], "gHowLR2"], [["L"], "gHowL"]];
  const bw = Math.min(560, W - 40), rh = 40, bh = 96 + rows.length * rh + 50, bx = (W - bw) / 2, by = Math.max(12, H * .14);
  c.save();
  c.fillStyle = "rgba(8,10,18,.88)"; c.strokeStyle = "rgba(127,211,255,.55)"; c.lineWidth = 1.5;
  c.beginPath(); c.roundRect ? c.roundRect(bx, by, bw, bh, 16) : c.rect(bx, by, bw, bh); c.fill(); c.stroke();
  c.textAlign = "center"; c.textBaseline = "middle";
  c.font = "800 20px Orbitron, Inter, sans-serif"; c.fillStyle = "#e8ecff"; c.fillText(t("gReady"), W / 2, by + 30);
  c.font = "700 13px Inter, sans-serif"; c.fillStyle = "#7fd3ff"; c.fillText(t("gHowTitle").toUpperCase(), W / 2, by + 62);
  const key = (label, x, y) => {
    c.font = "800 15px Inter, sans-serif"; const w = Math.max(34, c.measureText(label).width + 20);
    c.fillStyle = "#e5e7eb"; c.beginPath(); c.roundRect ? c.roundRect(x, y - 15, w, 30, 6) : c.rect(x, y - 15, w, 30); c.fill();
    c.fillStyle = "#9ca3af"; c.fillRect(x + 3, y + 11, w - 6, 3);
    c.fillStyle = "#111"; c.textAlign = "center"; c.fillText(label, x + w / 2, y); return w;
  };
  rows.forEach(([keys, txt], i) => {
    const y = by + 96 + i * rh; let x = bx + 24;
    keys.forEach((k, j) => {
      if (j) { c.font = "600 13px Inter"; c.fillStyle = "#9ca3af"; c.textAlign = "center"; c.fillText("/", x + 8, y); x += 16; }
      x += key(k.includes("|") ? k.split("|")[lang === "it" ? 0 : 1] : k, x, y) + 4;
    });
    c.textAlign = "left"; c.font = "500 14px Inter, sans-serif"; c.fillStyle = "#e5e7eb"; c.fillText(t(txt), bx + 190, y);
  });
  c.textAlign = "center"; c.font = "500 13px Inter, sans-serif"; c.fillStyle = "#cbd5e1";
  c.fillText(t("gHowGoal"), W / 2, by + bh - 40);
  c.font = "700 15px Inter, sans-serif"; c.fillStyle = `rgba(253,224,71,${.55 + .45 * blink})`; c.fillText(t("gPressSpace"), W / 2, by + bh - 16);
  c.restore();
}
const keyMap = { ArrowUp: "up", KeyW: "up", Space: "up", ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right" };
window.addEventListener("keydown", e => {
  if (GM.step !== 2) return;
  const L = LD.state;
  if (e.code === "Space" && L && L.phase === "ready") { gBeginDescent(); LD.spaceHold = true; e.preventDefault(); return; }
  if (e.code === "KeyL") { gToggleAuto(); e.preventDefault(); return; }
  if (keyMap[e.code]) { if (!(e.code === "Space" && LD.spaceHold)) LD.keys[keyMap[e.code]] = true; e.preventDefault(); }
});
window.addEventListener("keyup", e => { if (e.code === "Space") LD.spaceHold = false; if (keyMap[e.code]) LD.keys[keyMap[e.code]] = false; });
document.getElementById("gPadCtl").querySelectorAll("button[data-k]").forEach(b => {
  b.addEventListener("pointerdown", e => {
    e.preventDefault();
    if (LD.state && LD.state.phase === "ready") { gBeginDescent(); return; }
    LD.keys[b.dataset.k] = true;
  });
  ["pointerup", "pointerleave", "pointercancel"].forEach(ev => b.addEventListener(ev, () => { LD.keys[b.dataset.k] = false; }));
});
document.getElementById("gAuto").addEventListener("click", () => { const L = LD.state; if (L && L.phase === "ready") gBeginDescent(); gToggleAuto(); gLc.focus(); });
document.getElementById("gStartDescent").addEventListener("click", () => { gBeginDescent(); gLc.focus(); });
document.getElementById("gRetry").addEventListener("click", gStartLanding);
document.getElementById("gSkipLand").addEventListener("click", () => {   // salta l'allunaggio: un quarto dei punti
  if (LD.state) { LD.state.phase = "skipped"; LD.state.thrust = false; LD.state.auto = false; }
  Object.keys(LD.keys || {}).forEach(k => LD.keys[k] = false);
  GM.landPts = 25; gSetStep(3); gDefaults(); gRenderPatch();
});
document.getElementById("gToPatch").addEventListener("click", () => { gSetStep(3); gDefaults(); gRenderPatch(); });

/* ---------- Toppa di missione (SVG originale, scaricabile) ---------- */
const PATCH_NAMES = ["SELENE", "ARTEMIDE", "CYNTHIA", "LUNARIS", "AURORA", "VEGA", "ORIONE", "ALTAIR"];
function gDefaults() {
  const n = document.getElementById("gName"), c = document.getElementById("gCrew");
  if (!n.value) n.value = `${PATCH_NAMES[Math.floor(Math.random() * PATCH_NAMES.length)]}-${1 + Math.floor(Math.random() * 9)}`;
}
function nearestCrater(la, lo) {
  let best = null, bd = 1e9;
  for (const c of CRATERS) { const d = gcKm(la, lo, c.lat, c.lon) - c.d / 2; if (d < bd) { bd = d; best = c; } }
  return best;
}
function patchSVG() {
  const G = eduGrid(), k = GM.pick, la = G.lat[k], lo = G.lon[k], cr = nearestCrater(la, lo);
  const name = (document.getElementById("gName").value || "MISSION").toUpperCase().slice(0, 30);
  const crew = (document.getElementById("gCrew").value || "").toUpperCase().slice(0, 28);
  const total = GM.sitePts + GM.landPts, stars = Math.max(0, Math.min(5, Math.round(total / 40)));
  const date = GM.time.toLocaleDateString(lang, { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
  const rnd = mulberry32(Math.round(la * 1000 + lo * 10));
  const starDots = Array.from({ length: 60 }, () => `<circle cx="${(120 + rnd() * 360).toFixed(1)}" cy="${(110 + rnd() * 220).toFixed(1)}" r="${(.6 + rnd() * 1.4).toFixed(1)}" fill="#fff" opacity="${(.4 + rnd() * .6).toFixed(2)}"/>`).join("");
  const stitch = Array.from({ length: 5 }, (_, i) => `<text x="${300 + (i - 2) * 26}" y="440" font-size="22" fill="${i < stars ? "#ca8a04" : "#57534e"}" stroke="#1e293b" stroke-width=".6" text-anchor="middle">★</text>`).join("");
  const coord = `${fmtLat(la)} · ${fmtLon(lo)}`.replace(/·/g, "•");
  // dimensioni adattate alla lunghezza: il testo resta dentro il suo arco
  const fit = (n, arc, base, per, ls) => Math.max(11, Math.min(base, Math.floor((arc / Math.max(1, n) - ls) / per)));
  const nameLs = name.length > 14 ? 2 : 4, nameFs = fit(name.length, 640, 32, .8, nameLs);
  const coordTxt = coord + (cr ? " • " + cr.name.toUpperCase() : ""), coordFs = fit(coordTxt.length, 520, 15, .66, 2);
  const crewFs = fit(crew.length + 6, 440, 15, .7, 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="65%"><stop offset="0" stop-color="#16295c"/><stop offset=".7" stop-color="#0a1433"/><stop offset="1" stop-color="#050a1c"/></radialGradient>
    <radialGradient id="moon" cx="40%" cy="30%" r="80%"><stop offset="0" stop-color="#e7e5e4"/><stop offset=".6" stop-color="#a8a29e"/><stop offset="1" stop-color="#57534e"/></radialGradient>
    <linearGradient id="earth" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7dd3fc"/><stop offset=".6" stop-color="#1d4ed8"/><stop offset="1" stop-color="#22c55e"/></linearGradient>
    <path id="arcTop" d="M 66 300 A 234 234 0 0 1 534 300"/>
    <path id="arcBot" d="M 34 300 A 266 266 0 0 0 566 300"/>
    <path id="arcCrew" d="M 66 300 A 234 234 0 0 0 534 300"/>
    <clipPath id="inner"><circle cx="300" cy="300" r="205"/></clipPath>
  </defs>
  <circle cx="300" cy="300" r="292" fill="#c9a227"/>
  <circle cx="300" cy="300" r="280" fill="#0b1226"/>
  <circle cx="300" cy="300" r="276" fill="none" stroke="#c9a227" stroke-width="1.5" stroke-dasharray="7 6"/>
  <circle cx="300" cy="300" r="210" fill="url(#bg)" stroke="#c9a227" stroke-width="6"/>
  <g clip-path="url(#inner)">
    ${starDots}
    <g transform="translate(410 175)">
      <circle r="26" fill="#0b1733"/><path d="M 0 -26 A 26 26 0 0 1 0 26 A 12 26 0 0 0 0 -26 Z" fill="url(#earth)"/>
      <circle r="26" fill="none" stroke="#fff" stroke-opacity=".6"/>
    </g>
    <g transform="translate(172 210)" stroke="#fde047" stroke-width="3" stroke-linecap="round">
      ${Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return `<line x1="${(18 * Math.cos(a)).toFixed(1)}" y1="${(18 * Math.sin(a)).toFixed(1)}" x2="${(28 * Math.cos(a)).toFixed(1)}" y2="${(28 * Math.sin(a)).toFixed(1)}"/>`; }).join("")}
      <circle r="14" fill="#fef3c7" stroke="none"/>
    </g>
    <circle cx="300" cy="620" r="330" fill="url(#moon)"/>
    <ellipse cx="225" cy="345" rx="34" ry="8" fill="#78716c" opacity=".7"/><ellipse cx="380" cy="360" rx="22" ry="6" fill="#78716c" opacity=".7"/>
    <ellipse cx="300" cy="400" rx="60" ry="12" fill="#78716c" opacity=".55"/>
    <g transform="translate(300 300)" stroke="#111" stroke-width="2" stroke-linejoin="round">
      <path d="M -22 0 L 22 0 L 17 -34 L -17 -34 Z" fill="#e5e7eb"/>
      <rect x="-14" y="-30" width="28" height="10" fill="#f59e0b"/>
      <path d="M -17 0 L -30 18 M 17 0 L 30 18 M -36 18 L -24 18 M 24 18 L 36 18" fill="none" stroke="#e5e7eb" stroke-width="3"/>
    </g>
  </g>
  <text font-family="Orbitron, Inter, Arial, sans-serif" font-size="${nameFs}" font-weight="800" fill="#f8fafc" letter-spacing="${nameLs}">
    <textPath href="#arcTop" startOffset="50%" text-anchor="middle">${esc(name)}</textPath></text>
  <text font-family="Inter, Arial, sans-serif" font-size="${coordFs}" font-weight="700" fill="#c9a227" letter-spacing="2">
    <textPath href="#arcBot" startOffset="50%" text-anchor="middle">${esc(coord)}${cr ? " • " + esc(cr.name.toUpperCase()) : ""}</textPath></text>
  ${crew ? `<text font-family="Inter, Arial, sans-serif" font-size="${crewFs}" font-weight="800" fill="#f8fafc" letter-spacing="2">
    <textPath href="#arcCrew" startOffset="50%" text-anchor="middle">CDR • ${esc(crew)}</textPath></text>` : ""}
  <text x="300" y="470" font-family="Inter, Arial, sans-serif" font-size="14" font-weight="800" fill="#1e293b" text-anchor="middle" letter-spacing="2">${esc(date)}</text>
  ${stitch}
  <text x="300" y="140" font-family="Inter, Arial, sans-serif" font-size="12" font-weight="700" fill="#94a3b8" text-anchor="middle" letter-spacing="3">${t("gTotal")} ${total}/200</text>
</svg>`;
}
function gRenderPatch() { document.getElementById("gPatch").innerHTML = patchSVG(); }
["gName", "gCrew"].forEach(id => document.getElementById(id).addEventListener("input", () => { if (GM.step === 3) gRenderPatch(); }));
document.getElementById("gSvg").addEventListener("click", () => {
  const blob = new Blob([patchSVG()], { type: "image/svg+xml" }), a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = `patch-${slug(document.getElementById("gName").value)}.svg`; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
});
document.getElementById("gPng").addEventListener("click", () => {
  const url = URL.createObjectURL(new Blob([patchSVG()], { type: "image/svg+xml" })), img = new Image();
  img.onload = () => {
    const cv = document.createElement("canvas"); cv.width = cv.height = 1200;
    cv.getContext("2d").drawImage(img, 0, 0, 1200, 1200); URL.revokeObjectURL(url);
    cv.toBlob(b => { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `patch-${slug(document.getElementById("gName").value)}.png`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }, "image/png");
  };
  img.src = url;
});


function introGame(step) {
  const k = ["G0", "G1", "G2", "G3"][step], ico = ["🚀", "🛰️", "🛬", "🏅"][step];
  showIntro("gWrap", { ico, kick: t("intro" + k + "Kick"), title: t("intro" + k + "Title"), text: t("intro" + k + "Text"),
    onClose: step === 2 ? () => { try { gLc.focus(); } catch (e) {} } : null });
}

/* ---------- start ---------- */
function openGame() {
  if (!GM.time) {
    const b = document.getElementById("gBusy"); b.classList.add("show");
    setTimeout(() => { eduGrid(); b.classList.remove("show"); gNewScenario(); if (!GM.diff) gSetStep(0); }, 40);
  } else if (GM.step <= 1) gDrawMap(); else if (GM.step === 2) gLoop(); else gRenderPatch();
}
mChip("gCompass", "chipNorth", false);
onLang(openGame);
eduOnResize(openGame);
requestAnimationFrame(openGame);
landBoot();
