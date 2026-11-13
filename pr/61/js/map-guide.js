/* Map guide. Explains the controls and pin types. Theme matches the live map. */
(function () {
  var p = location.pathname || "";
  if (!(/\/map\/?$/.test(p) || p.indexOf("/map/") !== -1 || /map\.html$/.test(p))) return;
  var KEY = "chicas-map-guide-off";

  function css() {
    if (document.getElementById("chica-guide-css")) return;
    var s = document.createElement("style");
    s.id = "chica-guide-css";
    s.textContent =
      "#chica-guide{position:fixed;inset:0;z-index:2147483646;background:rgba(18,18,18,.72);display:flex;align-items:flex-end;justify-content:center;padding:12px;padding-bottom:max(12px,env(safe-area-inset-bottom))}" +
      "#chica-guide .sheet{width:min(420px,100%);max-height:min(78dvh,640px);overflow:auto;background:#1a1714;color:#f3eee4;border:2px solid #c513af;border-radius:16px;padding:16px 16px 18px;box-shadow:0 18px 40px rgba(0,0,0,.45);font:500 14px/1.35 Inter,system-ui,sans-serif}" +
      "#chica-guide h2{margin:0 40px 8px 0;font:800 18px/1.2 Inter,system-ui,sans-serif}" +
      "#chica-guide p{margin:0 0 10px;color:#d9d1c6}" +
      "#chica-guide .x{position:absolute;top:18px;right:22px;width:36px;height:36px;border:0;border-radius:50%;background:#c513af;color:#fff;font:800 22px/36px Inter,system-ui,sans-serif}" +
      "#chica-guide ul{list-style:none;margin:0;padding:0;display:grid;gap:8px}" +
      "#chica-guide li{display:grid;grid-template-columns:28px 1fr;gap:8px;align-items:center}" +
      "#chica-guide .mark{width:18px;height:18px;border-radius:50%;background:#c513af;border:2px solid #fffdf8;justify-self:center}" +
      "#chica-guide .mark.estate{border-radius:2px;background:#f4f4f4;transform:rotate(45deg);border-color:#121212}" +
      "#chica-guide .mark.gold{background:#f4c430;border-color:#121212}" +
      "#chica-guide .mark.resale{background:#C47A4A;border-color:#f3eee4}" +
      "#chica-guide .mark.key{background:#1a1714;border:1px solid #3a342e;border-radius:8px;width:22px}" +
      "#chica-guide button.go{margin-top:12px;width:100%;height:44px;border:0;border-radius:12px;background:#c513af;color:#fff;font:800 14px/1 Inter,system-ui,sans-serif}" +
      "#chica-guide-btn{position:fixed;left:12px;bottom:64px;z-index:2147483000;height:36px;padding:0 12px;border:1px solid #3a342e;border-radius:999px;background:#1a1714ee;color:#f3eee4;font:800 12px/1 Inter,system-ui,sans-serif}";
    document.head.appendChild(s);
  }

  function close() {
    var el = document.getElementById("chica-guide");
    if (el && el.parentNode) el.parentNode.removeChild(el);
    try { localStorage.setItem(KEY, "1"); } catch (e) {}
  }

  function open() {
    css();
    if (document.getElementById("chica-guide")) return;
    var wrap = document.createElement("div");
    wrap.id = "chica-guide";
    wrap.innerHTML =
      '<div class="sheet" role="dialog" aria-label="How the map works">' +
      '<button type="button" class="x" aria-label="Close guide">×</button>' +
      '<h2>How this map works</h2>' +
      '<p>Find the sales worth stopping for. Tap a pin for the address, hours, and directions.</p>' +
      '<ul>' +
      '<li><span class="mark"></span><span><b>Magenta circle</b> — garage or yard sale.</span></li>' +
      '<li><span class="mark estate"></span><span><b>White diamond</b> — estate sale.</span></li>' +
      '<li><span class="mark gold"></span><span><b>Gold pin</b> — featured sale.</span></li>' +
      '<li><span class="mark resale"></span><span><b>Brown pin</b> — Resale Trail. Turn it on in KEY.</span></li>' +
      '<li><span class="mark key"></span><span><b>Search</b> — street, ZIP, or sale name.</span></li>' +
      '<li><span class="mark key"></span><span><b>Near me</b> — your distance stays on this phone.</span></li>' +
      '<li><span class="mark key"></span><span><b>Today / Sat / Sun</b> — filter what is open.</span></li>' +
      '<li><span class="mark key"></span><span><b>KEY</b> — satellite, permits, Resale Trail, pack layers.</span></li>' +
      '<li><span class="mark key"></span><span><b>Boost</b> — feature a sale. Listing a sale is free.</span></li>' +
      '</ul>' +
      '<button type="button" class="go">Got it</button>' +
      '</div>';
    wrap.addEventListener("click", function (ev) {
      if (ev.target === wrap || ev.target.closest(".x") || ev.target.closest(".go")) close();
    });
    document.documentElement.appendChild(wrap);
  }

  function btn() {
    if (document.getElementById("chica-guide-btn")) return;
    css();
    var b = document.createElement("button");
    b.id = "chica-guide-btn";
    b.type = "button";
    b.textContent = "Guide";
    b.setAttribute("aria-label", "How the map works");
    b.addEventListener("click", open);
    document.documentElement.appendChild(b);
  }

  function boot() {
    btn();
    var off = false;
    try { off = localStorage.getItem(KEY) === "1"; } catch (e) {}
    if (!off) open();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
