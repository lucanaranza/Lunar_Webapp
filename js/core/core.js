/* =====================================================================
   L.A.N.D. – shared runtime for every page
   - language (texts live in i18n-text.js)
   - local storage (plain IndexedDB: everything is open, nothing is encrypted)
   - small helpers used by all pages (escape, download, rafOnce, phone / touch)
   Each page loads this file first, then its own script in js/pages/.
   ===================================================================== */

/* ---------- language ---------- */
let lang = "en";
try { lang = localStorage.getItem("lang") || lang; } catch (e) {}
const t = (key, vars = {}) => {
  let s = (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
  for (const [k, v] of Object.entries(vars)) s = s.replace("{" + k + "}", v);
  return s;
};
const tL = (it, en) => (lang === "it" ? it : en);   // long bilingual texts written inline
const LANG_HOOKS = [];                               // pages register what to redraw when the language changes
const onLang = fn => LANG_HOOKS.push(fn);

function applyLang(code) {
  lang = I18N[code] ? code : "en";
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-ph]").forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll("[data-i18n-title]").forEach(el => { el.title = t(el.dataset.i18nTitle); el.setAttribute("aria-label", el.title); });
  const code2 = document.getElementById("langCode"); if (code2) code2.textContent = lang.toUpperCase();
  document.querySelectorAll("#langMenu button[data-lang]").forEach(b => b.setAttribute("aria-current", String(b.dataset.lang === lang)));
  for (const fn of LANG_HOOKS) { try { fn(); } catch (e) { console.warn(e); } }
  try { localStorage.setItem("lang", lang); } catch (e) {}
}

function initLangMenu() {
  const menu = document.getElementById("langMenu"), toggle = document.getElementById("langToggle");
  if (!menu || !toggle) return;
  Object.entries(I18N).forEach(([code, d]) => {
    const li = document.createElement("li");
    li.innerHTML = `<button role="menuitem" data-lang="${code}">${d.name}</button>`;
    menu.appendChild(li);
  });
  toggle.addEventListener("click", e => {
    e.stopPropagation();
    const open = menu.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open);
  });
  menu.addEventListener("click", e => {
    const b = e.target.closest("button[data-lang]");
    if (b) { applyLang(b.dataset.lang); menu.classList.remove("open"); }
  });
  document.addEventListener("click", () => menu.classList.remove("open"));
}

/* ---------- local storage (IndexedDB, not encrypted) ----------
   Mission parameters and imported area files stay in this browser only.
   If IndexedDB is not available (private windows), data live in memory for the visit. */
const Store = (() => {
  const DB = "land-open", ST = "kv", mem = new Map();
  let dbP = null;
  const open = () => dbP || (dbP = new Promise(res => {
    try {
      const rq = indexedDB.open(DB, 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore(ST);
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => res(null);
    } catch (e) { res(null); }
  }));
  const run = async (mode, fn) => {
    const db = await open(); if (!db) return undefined;
    return new Promise(res => {
      try {
        const tx = db.transaction(ST, mode), rq = fn(tx.objectStore(ST));
        tx.oncomplete = () => res(rq && rq.result); tx.onerror = () => res(undefined);
      } catch (e) { res(undefined); }
    });
  };
  return {
    async get(k) { const v = await run("readonly", s => s.get(k)); return v === undefined ? mem.get(k) : v; },
    async set(k, v) { mem.set(k, v); await run("readwrite", s => s.put(v, k)); },
    async del(k) { mem.delete(k); await run("readwrite", s => s.delete(k)); },
  };
})();

/* ---------- helpers ---------- */
const esc = s => String(s).replace(/[<>&"']/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" }[c]));
function rafOnce(fn) { let q = false; return () => { if (q) return; q = true; requestAnimationFrame(() => { q = false; fn(); }); }; }
const wait = ms => new Promise(r => setTimeout(r, ms));
const fmtDateL = d => d.toLocaleString(lang, { dateStyle: "medium", timeStyle: "short" });
const slug = s => String(s || "mission").toLowerCase().replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "mission";
function download(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 1)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
const PAGE = document.body.dataset.page || "";        // "home", "history", "workspace", "analysis", ...

/* ---------- phone / touch ---------- */
const MOB = { skipRotate: false };
function mobileFlags() {
  const w = innerWidth, h = innerHeight, coarse = matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
  document.body.classList.toggle("touch", coarse);
  document.body.classList.toggle("phone", Math.min(w, h) <= 540 && Math.max(w, h) <= 1100);
  document.body.classList.toggle("portrait", h > w);
  const rh = document.getElementById("rotateHint");
  if (rh) rh.classList.toggle("show", PAGE !== "home" && h > w && w <= 600 && !MOB.skipRotate);
}
addEventListener("resize", () => mobileFlags());
addEventListener("orientationchange", () => setTimeout(mobileFlags, 200));
function initRotateHint() {
  const go = document.getElementById("rotGo"), skip = document.getElementById("rotSkip");
  if (go) go.addEventListener("click", async () => {
    try { await document.documentElement.requestFullscreen({ navigationUI: "hide" }); } catch (e) {}
    try { await screen.orientation.lock("landscape"); } catch (e) {}
    setTimeout(mobileFlags, 300);
  });
  if (skip) skip.addEventListener("click", () => { MOB.skipRotate = true; mobileFlags(); });
}
// panels that can be closed on the phone: a "chip" shows or hides them
function mChip(panelId, key, openDefault) {
  const el = document.getElementById(panelId); if (!el) return;
  const wrap = el.closest(".map-wrap"); if (!wrap) return;
  let box = wrap.querySelector(":scope > .m-chips");
  if (!box) { box = document.createElement("div"); box.className = "m-chips"; wrap.appendChild(box); }
  const b = document.createElement("button"); b.type = "button"; b.className = "m-chip"; b.dataset.i18n = key; b.textContent = t(key);
  const set = open => { el.classList.toggle("m-closed", !open); b.classList.toggle("on", open); };
  set(openDefault);
  b.addEventListener("click", () => set(el.classList.contains("m-closed")));
  box.appendChild(b);
}
// + / − buttons and two-finger pinch for zoom
function zoomCtl(wrapId, apply) {
  const wrap = document.getElementById(wrapId); if (!wrap) return;
  const z = document.createElement("div"); z.className = "zoom-ctl";
  z.innerHTML = `<button type="button" aria-label="Zoom +">+</button><button type="button" aria-label="Zoom −">−</button>`;
  z.children[0].addEventListener("click", () => apply(1.4)); z.children[1].addEventListener("click", () => apply(1 / 1.4));
  wrap.appendChild(z);
}
function pinch(cv, apply) {
  if (!cv) return;
  let d0 = 0;
  const dist = e => Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
  cv.addEventListener("touchstart", e => { if (e.touches.length === 2) { d0 = dist(e); cv._pinch = true; e.preventDefault(); } }, { passive: false });
  cv.addEventListener("touchmove", e => {
    if (e.touches.length !== 2 || !d0) return;
    e.preventDefault(); const d = dist(e); if (Math.abs(d / d0 - 1) < .04) return;
    apply(d / d0, true); d0 = d;
  }, { passive: false });
  cv.addEventListener("touchend", e => { if (e.touches.length < 2) { d0 = 0; apply(1, false); setTimeout(() => { cv._pinch = false; }, 60); } });
}
// phone: top-bar actions collapse into a ☰ menu, side cards can be folded by tapping their title
function initPhoneMenu() {
  document.querySelectorAll(".ws-top").forEach(top => {
    const acts = top.querySelector(".ws-top-actions"); if (!acts) return;
    const b = document.createElement("button"); b.type = "button"; b.className = "m-menu-btn"; b.setAttribute("aria-label", "Menu"); b.textContent = "☰";
    b.addEventListener("click", e => { e.stopPropagation(); top.classList.toggle("menu-open"); });
    acts.addEventListener("click", () => top.classList.remove("menu-open"));
    top.appendChild(b);
  });
  document.addEventListener("click", e => {
    if (!e.target.closest(".ws-top")) document.querySelectorAll(".ws-top.menu-open").forEach(x => x.classList.remove("menu-open"));
    if (!document.body.classList.contains("phone")) return;
    const h = e.target.closest(".ws-side .side-card > h3:first-child, .ws-side .side-card > .step-tag:first-child");
    if (h) h.parentElement.classList.toggle("sc-closed");
  });
}

/* ---------- start (each page script calls landBoot() at its end) ---------- */
function landBoot() {
  initLangMenu(); initRotateHint(); initPhoneMenu(); mobileFlags();
  applyLang(lang);
}
