/* =====================================================================
   index.html – intro (logo, then the duck on the shuttle crosses the screen) and home menu.
   The intro plays once per visit: coming back from another page goes straight to the menu.
   ===================================================================== */
(function intro() {
  const v = document.getElementById("view-intro"), home = document.getElementById("view-home"), sh = document.getElementById("introShuttle");
  const showHome = () => { v.classList.remove("active"); home.classList.add("active"); };
  let seen = false;
  try { seen = sessionStorage.getItem("land_intro") === "1"; sessionStorage.setItem("land_intro", "1"); } catch (e) {}
  if (seen || matchMedia("(prefers-reduced-motion: reduce)").matches) { v.classList.remove("active"); home.classList.add("active"); return; }
  let done = false;
  const end = () => {
    if (done) return; done = true;
    document.removeEventListener("keydown", onKey);
    showHome();
  };
  const onKey = e => { if (["Enter", " ", "Escape"].includes(e.key)) { e.preventDefault(); end(); } };
  sh.addEventListener("animationend", () => setTimeout(end, 350));
  v.addEventListener("click", end);
  document.addEventListener("keydown", onKey);
  setTimeout(end, 6500);                                  // fallback if the animation does not start
})();
landBoot();
