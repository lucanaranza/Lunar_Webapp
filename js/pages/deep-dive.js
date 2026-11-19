/* =====================================================================
   5) APPROFONDIMENTO: mappe reali di illuminazione e comunicazione di un sito (dati del team)
   ===================================================================== */
const DS = { D: null, layer: "sun", ti: 0, play: 0, T: null };
async function openDeep() {
  const busy = document.getElementById("dBusy");
  if (!DS.D) {
    busy.classList.add("show");
    await loadBuiltinSites();
    busy.classList.remove("show");
    const list = [...DATASETS.values()].filter(D => D.source === "builtin").sort((a, b) => a.name.localeCompare(b.name));
    const sel = document.getElementById("dSite");
    sel.innerHTML = list.map(D => `<option value="${esc(D.id)}">${esc(D.name)} · ${fmtLL(D.region.lat, D.region.lon)}</option>`).join("");
    const first = list.find(D => /sito_?0?1$/i.test(D.name)) || list[0];
    if (!first) return;
    sel.value = first.id; busy.classList.add("show"); await ensureEvo(first); busy.classList.remove("show"); dSetSite(first);
    setTimeout(() => showIntro("dWrap", { ico: "🔬", kick: t("introDKick"), title: t("introDTitle"), text: t("introDText"), steps: [t("introD1"), t("introD2"), t("introD3")] }), 0);
  }
  dRender();
}
function dSetSite(D) {
  DS.D = D; const E = D.evo;
  DS.ti = E ? Math.min(E.n - 1, Math.max(0, evoIdx(E, new Date(Date.UTC(2027, 5, 1))))) : 0;
  const sl = document.getElementById("dSlider"); sl.max = E ? E.n - 1 : 0; sl.value = DS.ti;
  // numeri del sito
  const n = D.nx * D.ny; let ok = 0, sSum = 0, eSum = 0, s80 = 0, e80 = 0, both = 0, best = -1, bestV = -1;
  for (let k = 0; k < n; k++) {
    const a = D.sun[k], b = D.earth[k]; if (!isFinite(a) || !isFinite(b)) continue;
    ok++; sSum += a; eSum += b; if (a >= .8) s80++; if (b >= .8) e80++; if (a >= .7 && b >= .7) both++;
    const v = Math.min(a, b); if (v > bestV) { bestV = v; best = k; }
  }
  DS.stats = { ok, sAvg: sSum / ok, eAvg: eSum / ok, s80: s80 / ok, e80: e80 / ok, both: both / ok, best, bestV };
  document.getElementById("dMeta").textContent = t("dMeta", { c: fmtLL(D.region.lat, D.region.lon), km: (D.nx * D.step).toFixed(1), m: Math.round(D.step * 1000) });
  dStats(); dRender();
}
function dStats() {
  const S = DS.stats, D = DS.D, p = x => Math.round(x * 100) + "%";
  let extra = "";
  if (DS.layer === "now" && D.evo) {
    const E = D.evo, n = D.nx * D.ny; let l = 0, c = 0, tot = 0;
    for (let k = 0; k < n; k++) { if (!isFinite(D.sun[k])) continue; tot++; l += evoBit(E.luce, E, DS.ti, k); c += evoBit(E.com, E, DS.ti, k); }
    extra = `<div><b>${p(l / tot)}</b>${esc(t("dsLitNow"))}</div><div><b>${c ? p(c / tot) : "0%"}</b>${esc(t(c ? "dsComNow" : "dsComNone"))}</div>`;
  }
  document.getElementById("dStats").innerHTML = `${extra}<div><b>${p(S.sAvg)}</b>${esc(t("dsSun"))}</div><div><b>${p(S.eAvg)}</b>${esc(t("dsEarth"))}</div>
    <div><b>${p(S.s80)}</b>${esc(t("dsS80"))}</div><div><b>${p(S.e80)}</b>${esc(t("dsE80"))}</div>
    <div><b>${p(S.both)}</b>${esc(t("dsBoth"))}</div><div><b>${p(S.bestV)}</b>${esc(t("dsBest"))}</div>`;
}
const D_LUT = { sun: makeLut(PALETTES.sun), earth: makeLut(PALETTES.earth), score: makeLut(PALETTES.score) };
function dColor(k) {
  const D = DS.D, a = D.sun[k], b = D.earth[k];
  if (!isFinite(a) || !isFinite(b)) return null;
  if (DS.layer === "sun" || DS.layer === "earth") { const v = DS.layer === "sun" ? a : b, L = D_LUT[DS.layer], i = Math.round(Math.max(0, Math.min(1, v)) * 255) * 3; return [L[i], L[i + 1], L[i + 2]]; }
  if (DS.layer === "both") { const v = Math.min(a, b), L = D_LUT.score, i = Math.round(Math.max(0, Math.min(1, v)) * 255) * 3; return [L[i], L[i + 1], L[i + 2]]; }
  const E = D.evo; if (!E) return [40, 40, 40];
  const l = evoBit(E.luce, E, DS.ti, k), c = evoBit(E.com, E, DS.ti, k);
  return l && c ? [255, 250, 220] : l ? [251, 191, 36] : c ? [56, 189, 248] : [22, 24, 32];
}
function dRender() {
  const D = DS.D; if (!D) return;
  const cv = document.getElementById("dMap"), wrap = cv.parentElement, phone = document.body.classList.contains("phone");
  const legendW = phone ? 0 : 240;
  const css = Math.max(220, Math.min(wrap.clientWidth - legendW - 30, wrap.clientHeight - 30));
  const dpr = Math.min(window.devicePixelRatio || 1, 2), S = Math.round(css * dpr);
  cv.width = cv.height = S; cv.style.width = cv.style.height = css + "px"; cv.style.marginRight = legendW + "px";
  const c = cv.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, css, css);
  const off = document.createElement("canvas"); off.width = D.nx; off.height = D.ny;
  const oc = off.getContext("2d"), img = oc.createImageData(D.nx, D.ny);
  for (let k = 0; k < D.nx * D.ny; k++) { const col = dColor(k), o = k * 4; if (!col) continue; img.data[o] = col[0]; img.data[o + 1] = col[1]; img.data[o + 2] = col[2]; img.data[o + 3] = 255; }
  oc.putImageData(img, 0, 0);
  const m = 34, size = css - 2 * m, sc = size / Math.max(D.nx, D.ny), w = D.nx * sc, h = D.ny * sc, x0 = (css - w) / 2, y0 = (css - h) / 2;
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = "high"; c.drawImage(off, x0, y0, w, h);
  c.strokeStyle = "rgba(127,211,255,.5)"; c.lineWidth = 1; c.strokeRect(x0, y0, w, h);
  DS.T = { x0, y0, sc, css };
  // miglior punto (Sole e Terra insieme)
  if (DS.stats && DS.stats.best >= 0) {
    const bx = x0 + (DS.stats.best % D.nx + .5) * sc, by = y0 + (Math.floor(DS.stats.best / D.nx) + .5) * sc;
    c.fillStyle = "#c4f06a"; c.strokeStyle = "#111"; c.lineWidth = 2; c.beginPath(); c.arc(bx, by, 8, 0, 2 * Math.PI); c.fill(); c.stroke();
    c.fillStyle = "#111"; c.font = "800 10px Inter"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("★", bx, by + .5);
  }
  // scala e direzione del nord (allontanarsi dal polo = nord)
  const kmBar = Math.max(1, Math.round(D.nx * D.step / 4)), pxBar = kmBar / D.step * sc;
  c.fillStyle = "#fff"; c.fillRect(x0, y0 + h + 12, pxBar, 3); c.font = "600 11px Inter, sans-serif"; c.textAlign = "left"; c.textBaseline = "top";
  c.fillText(`${kmBar} km`, x0 + pxBar + 6, y0 + h + 7);
  const lr = D.region.lon * DEG, nx = Math.sin(lr), ny = Math.cos(lr), ax = x0 + w - 26, ay = y0 + 26;
  c.save(); c.translate(ax, ay); c.fillStyle = "rgba(8,9,12,.85)"; c.beginPath(); c.arc(0, 0, 20, 0, 2 * Math.PI); c.fill();
  c.strokeStyle = "#fde047"; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-nx * 12, ny * 12); c.lineTo(nx * 12, -ny * 12); c.stroke();
  c.fillStyle = "#fde047"; c.beginPath(); c.moveTo(nx * 16, -ny * 16); c.lineTo(nx * 8 - ny * 5, -ny * 8 - nx * 5); c.lineTo(nx * 8 + ny * 5, -ny * 8 + nx * 5); c.fill();
  c.restore(); c.fillStyle = "#fde047"; c.font = "900 12px Inter"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("N", ax, ay + 30);
  dLegend(); dExplain(); dTimeUI();
}
function dLegend() {
  const L = DS.layer, el = document.getElementById("dLegend");
  const grad = p => `linear-gradient(90deg, ${PALETTES[p].join(",")})`;
  if (L === "now") el.innerHTML = `<div class="t">${esc(t("dlgNow"))}</div><div class="sw"><i style="background:#fffadc"></i>${esc(t("dlgBoth"))}<i style="background:#fbbf24"></i>${esc(t("dlgSun"))}<i style="background:#38bdf8"></i>${esc(t("dlgCom"))}<i style="background:#161820"></i>${esc(t("dlgNone"))}</div><div class="n">${esc(t("dlgStar"))}</div>`;
  else el.innerHTML = `<div class="t">${esc(t(L === "sun" ? "dlgSunT" : L === "earth" ? "dlgEarthT" : "dlgBothT"))}</div><div class="bar" style="background:${grad(L === "both" ? "score" : L)}"></div><div class="ends"><span>0%</span><span>50%</span><span>100%</span></div><div class="n">${esc(t(L === "sun" ? "dlgSunN" : L === "earth" ? "dlgEarthN" : "dlgBothN"))}</div><div class="n">${esc(t("dlgStar"))}</div>`;
}
function dExplain() {
  document.getElementById("dExplain").innerHTML = t("dx_" + DS.layer).split("\n").map(x => `<p>${x}</p>`).join("");
  dStats();
}
function dTimeUI() {
  const D = DS.D, E = D && D.evo, show = DS.layer === "now" && E;
  document.getElementById("dTime").hidden = !show; if (!show) return;
  const d = new Date(E.start + DS.ti * E.stepH * 36e5);
  document.getElementById("dTlbl").textContent = d.toLocaleString(lang, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC";
  document.getElementById("dPlay").textContent = DS.play ? "❚❚" : "▶";
}
document.getElementById("dSite").addEventListener("change", async e => {
  const D = DATASETS.get(e.target.value); if (!D) return;
  const busy = document.getElementById("dBusy"); busy.classList.add("show");
  await ensureEvo(D); busy.classList.remove("show");
  if (DATASETS.get(document.getElementById("dSite").value) === D) dSetSite(D);
});
document.getElementById("dLayers").addEventListener("click", e => {
  const b = e.target.closest("[data-dl]"); if (!b) return;
  DS.layer = b.dataset.dl; document.querySelectorAll("#dLayers [data-dl]").forEach(x => x.classList.toggle("active", x === b)); dRender();
});
document.getElementById("dSlider").addEventListener("input", e => { DS.ti = +e.target.value; dRender(); });
document.getElementById("dPlay").addEventListener("click", () => {
  if (DS.play) { clearInterval(DS.play); DS.play = 0; dTimeUI(); return; }
  DS.play = setInterval(() => { const E = DS.D && DS.D.evo; if (!E) { clearInterval(DS.play); DS.play = 0; return; }
    DS.ti = (DS.ti + 1) % E.n; document.getElementById("dSlider").value = DS.ti; dRender(); }, 180);
  dTimeUI();
});
document.getElementById("dMap").addEventListener("pointermove", e => {
  const D = DS.D, T = DS.T, tip = document.getElementById("dTip"); if (!D || !T) return;
  const r = e.currentTarget.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  const c = Math.floor((x - T.x0) / T.sc), i = Math.floor((y - T.y0) / T.sc);
  if (c < 0 || i < 0 || c >= D.nx || i >= D.ny) { tip.style.display = "none"; return; }
  const k = i * D.nx + c, a = D.sun[k], b = D.earth[k]; if (!isFinite(a)) { tip.style.display = "none"; return; }
  const E = D.evo, now = DS.layer === "now" && E ? `<br>${t("dtNow")}: ${evoBit(E.luce, E, DS.ti, k) ? "☀" : "☾"} ${evoBit(E.com, E, DS.ti, k) ? "📡 ✓" : "📡 ✗"}` : "";
  const q = D.extra && D.extra.quota && isFinite(D.extra.quota[k]) ? `<br>${t("dtQuota")}: ${Math.round(D.extra.quota[k])} m` : "";
  const ll = projInv(D.gx0 + c * D.step, D.gy0 - i * D.step, D.pc);
  tip.innerHTML = `<b>${fmtLL(ll[0], ll[1])}</b><br>☀ ${t("dtSun")}: ${Math.round(a * 100)}%<br>📡 ${t("dtEarth")}: ${Math.round(b * 100)}%${q}${now}`;
  const wr = e.currentTarget.parentElement.getBoundingClientRect();
  tip.style.left = Math.min(e.clientX - wr.left + 14, wr.width - 210) + "px"; tip.style.top = (e.clientY - wr.top + 14) + "px"; tip.style.display = "block";
});
document.getElementById("dMap").addEventListener("pointerleave", () => { document.getElementById("dTip").style.display = "none"; });



/* ---------- start ---------- */
mChip("dLegend", "chipLegend", false);
onLang(() => { if (DS.D) { dSetSite(DS.D); dRender(); } });
eduOnResize(() => { if (DS.D) dRender(); });
requestAnimationFrame(openDeep);
landBoot();
