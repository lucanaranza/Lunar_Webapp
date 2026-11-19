/* =====================================================================
   L.A.N.D. – guided tour (Expert pages): highlights each element and explains it.
   tourStart(steps): steps = [{ k: number of the text trNt / trNd, sel: CSS selector, pre: async fn }]
   ===================================================================== */
const TOUR = { i: 0, on: false, els: null, steps: [] };
function tourEls() {
  if (TOUR.els) return TOUR.els;
  const block = document.createElement("div"); block.className = "tour-block";
  const spot = document.createElement("div"); spot.className = "tour-spot";
  const card = document.createElement("div"); card.className = "tour-card"; card.setAttribute("role", "dialog");
  document.body.append(block, spot, card);
  block.addEventListener("click", e => e.stopPropagation());
  return (TOUR.els = { block, spot, card });
}
async function tourShow(i) {
  const N = TOUR.steps.length; TOUR.i = Math.max(0, Math.min(N - 1, i));
  const st = TOUR.steps[TOUR.i], { spot, card } = tourEls();
  card.innerHTML = `<div class="cnt">…</div>`;
  if (st.pre) { try { await st.pre(); } catch (e) { console.warn(e); } }
  let el = st.sel ? document.querySelector(st.sel) : null;
  if (el && st.up) { let p = el; for (let u = 0; u < st.up && p.parentElement; u++) p = p.parentElement; if (p.closest(".ws-side")) el = p.closest(".side-card") || el; }
  if (el) {
    const sc = el.closest(".ws-side, .setup-card"); if (sc) el.scrollIntoView({ block: "nearest" });
    if (el.classList.contains("m-closed")) el.classList.remove("m-closed");
  }
  await wait(60);
  const k = st.k, title = t(`tr${k}t`), body = t(`tr${k}d`).split("\n").map(x => x.startsWith("💡") ? `<span class="tip">${x}</span>` : `<p>${x}</p>`).join("");
  card.innerHTML = `<div class="tk">${esc(t("trKick"))} · ${TOUR.i + 1}/${N}</div><h4>${esc(title)}</h4><div class="tx">${body}</div>
    <div class="bar"><i style="width:${(TOUR.i + 1) / N * 100}%"></i></div>
    <div class="nav"><button type="button" class="cl" data-t="x">${esc(t("trClose"))}</button>${TOUR.i ? `<button type="button" data-t="p">← ${esc(t("trPrev"))}</button>` : ""}<button type="button" class="nx" data-t="n">${esc(TOUR.i === N - 1 ? t("trEnd") : t("trNext") + " →")}</button></div>`;
  tourPlace(el);
  card.querySelector(".nx").focus();
}
function tourPlace(el) {
  const { spot, card } = tourEls(), W = innerWidth, H = innerHeight, pad = 6;
  const r = el && el.getBoundingClientRect();
  if (!r || r.width < 2 || r.height < 2) {
    spot.className = "tour-spot none"; Object.assign(spot.style, { left: W / 2 + "px", top: H / 2 + "px", width: "0px", height: "0px" });
    card.style.left = Math.max(12, (W - card.offsetWidth) / 2) + "px"; card.style.top = Math.max(12, (H - card.offsetHeight) / 2) + "px"; return;
  }
  const x = Math.max(4, r.left - pad), y = Math.max(4, r.top - pad), w = Math.min(W - 8, r.width + 2 * pad), h = Math.min(H - 8, r.height + 2 * pad);
  spot.className = "tour-spot"; Object.assign(spot.style, { left: x + "px", top: y + "px", width: w + "px", height: h + "px" });
  const cw = card.offsetWidth, ch = card.offsetHeight;
  let cx, cy;
  if (x + w + 14 + cw <= W) { cx = x + w + 14; cy = y; }
  else if (x - 14 - cw >= 0) { cx = x - 14 - cw; cy = y; }
  else if (y + h + 14 + ch <= H) { cx = x; cy = y + h + 14; }
  else if (y - 14 - ch >= 0) { cx = x; cy = y - 14 - ch; }
  else { cx = W - cw - 12; cy = H - ch - 12; }
  card.style.left = Math.max(12, Math.min(W - cw - 12, cx)) + "px"; card.style.top = Math.max(12, Math.min(H - ch - 12, cy)) + "px";
}
function tourStart(steps) {
  if (steps) TOUR.steps = steps;
  TOUR.on = true; tourEls(); document.body.classList.add("touring");
  ["block", "spot", "card"].forEach(k => TOUR.els[k].hidden = false);
  tourShow(0);
}
function tourStop() {
  TOUR.on = false; if (!TOUR.els) return;
  ["block", "spot", "card"].forEach(k => TOUR.els[k].hidden = true); document.body.classList.remove("touring");
}
document.addEventListener("click", e => {
  if (!TOUR.on) return; const b = e.target.closest(".tour-card [data-t]"); if (!b) return;
  const a = b.dataset.t;
  if (a === "x") tourStop(); else if (a === "p") tourShow(TOUR.i - 1); else if (TOUR.i >= TOUR.steps.length - 1) tourStop(); else tourShow(TOUR.i + 1);
});
document.addEventListener("keydown", e => {
  if (!TOUR.on) return;
  if (e.key === "Escape") { tourStop(); e.preventDefault(); }
  else if (e.key === "ArrowRight") { e.preventDefault(); TOUR.i >= TOUR.steps.length - 1 ? tourStop() : tourShow(TOUR.i + 1); }
  else if (e.key === "ArrowLeft") { e.preventDefault(); tourShow(TOUR.i - 1); }
}, true);
addEventListener("resize", () => { if (TOUR.on) { const st = TOUR.steps[TOUR.i]; tourPlace(st.sel ? document.querySelector(st.sel) : null); } });
