/* Map share dock: Nextdoor, Facebook, TikTok. Lives on <html> so fullscreen cannot bury it. */
(function () {
  var p = location.pathname || "";
  if (!(/\/map\/?$/.test(p) || p.indexOf("/map/") !== -1 || /map\.html$/.test(p))) return;

  var MAP_URL = "https://justonejewelry.github.io/Chicas-Map/map/";
  var COPY = "San Antonio garage sales this weekend. Free map with pins and routes.";

  function css() {
    if (document.getElementById("chica-share-css")) return;
    var s = document.createElement("style");
    s.id = "chica-share-css";
    s.textContent =
      "#chica-share-dock{position:fixed!important;left:12px!important;bottom:calc(14px + env(safe-area-inset-bottom,0px))!important;z-index:2147483646!important;display:flex!important;flex-direction:column!important;gap:8px!important;width:min(168px,calc(100vw - 160px))!important;pointer-events:auto!important}" +
      "#chica-share-dock .label{margin:0;padding:0 2px;color:#fffdf8;font:800 10px/1 Inter,system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;text-shadow:0 1px 6px #000}" +
      "#chica-share-dock .row{display:flex;flex-direction:column;gap:6px}" +
      "#chica-share-dock a,#chica-share-dock button{display:flex;align-items:center;gap:8px;min-height:40px;margin:0;padding:0 10px;border:1px solid rgba(255,253,248,.18);border-radius:12px;background:#1a1714f2;color:#fffdf8;font:800 12px/1 Inter,system-ui,sans-serif;text-decoration:none;cursor:pointer;box-shadow:0 8px 20px rgba(0,0,0,.35)}" +
      "#chica-share-dock a:focus-visible,#chica-share-dock button:focus-visible{outline:2px solid #c513af;outline-offset:2px}" +
      "#chica-share-dock .mark{flex:0 0 22px;width:22px;height:22px;border-radius:7px;display:grid;place-items:center}" +
      "#chica-share-dock .mark svg{display:block;width:14px;height:14px}" +
      "#chica-share-dock .nd .mark{background:#8ed500}" +
      "#chica-share-dock .fb .mark{background:#1877f2}" +
      "#chica-share-dock .tt .mark{background:#111;box-shadow:inset 0 0 0 1px #25f4ee}" +
      "#chica-share-toast{position:fixed;left:50%;bottom:calc(168px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:2147483647;display:none;padding:8px 12px;border-radius:999px;background:#1a1714f5;color:#fffdf8;border:1px solid #c513af;font:800 12px/1 Inter,system-ui,sans-serif}" +
      "#chica-share-toast.on{display:block}" +
      "@media (max-width:380px){#chica-share-dock{width:136px}#chica-share-dock a,#chica-share-dock button{min-height:38px;font-size:11px}}";
    (document.head || document.documentElement).appendChild(s);
  }

  function toast(msg) {
    var el = document.getElementById("chica-share-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "chica-share-toast";
      el.setAttribute("role", "status");
      document.documentElement.appendChild(el);
    }
    el.textContent = msg;
    el.className = "on";
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.className = ""; }, 2200);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        resolve();
      } catch (e) { reject(e); }
    });
  }

  function payload() {
    return COPY + " " + MAP_URL;
  }

  function facebookHref() {
    return "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(MAP_URL);
  }
  function nextdoorHref() {
    return "https://nextdoor.com/sharekit/?body=" + encodeURIComponent(payload());
  }

  function shareTikTok(ev) {
    ev.preventDefault();
    var text = payload();
    copyText(text).then(function () {
      toast("Link copied. Paste it in TikTok.");
    }).catch(function () {
      toast("Copy the map link, then open TikTok.");
    });
    if (navigator.share) {
      try {
        navigator.share({ title: "Chicas Map", text: COPY, url: MAP_URL });
      } catch (e) {}
    }
    setTimeout(function () {
      window.open("https://www.tiktok.com/", "_blank", "noopener,noreferrer");
    }, 250);
  }

  function iconNd() {
    return '<span class="mark" aria-hidden="true"><svg viewBox="0 0 16 16" fill="#111"><path d="M2 3.2h4.2v9.6H2zm7.8 0H14v9.6H9.8z"/></svg></span>';
  }
  function iconFb() {
    return '<span class="mark" aria-hidden="true"><svg viewBox="0 0 16 16" fill="#fff"><path d="M10.2 8.4H8.7v5.1H6.6V8.4H5.4V6.6h1.2V5.5c0-1.6.7-2.6 2.6-2.6h1.6v1.8H9.6c-.6 0-.7.3-.7.8v1.1h1.8z"/></svg></span>';
  }
  function iconTt() {
    return '<span class="mark" aria-hidden="true"><svg viewBox="0 0 16 16" fill="#25f4ee"><path d="M10.2 2c.4 1.6 1.5 2.8 3.1 3.1v2.1c-1.1 0-2.1-.4-2.9-1v4.6c0 2.3-1.9 4.2-4.2 4.2S2 13.1 2 10.8s1.9-4.2 4.2-4.2c.2 0 .5 0 .7.1v2.2c-.2-.1-.5-.1-.7-.1-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2V2h2z" fill="#fe2c55"/><path d="M10.2 2c.4 1.6 1.5 2.8 3.1 3.1v2.1c-1.1 0-2.1-.4-2.9-1v4.6c0 2.3-1.9 4.2-4.2 4.2S2 13.1 2 10.8s1.9-4.2 4.2-4.2c.2 0 .5 0 .7.1v2.2c-.2-.1-.5-.1-.7-.1-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2V2h2z" fill="#25f4ee" opacity=".7"/></svg></span>';
  }

  function mount() {
    css();
    var el = document.getElementById("chica-share-dock");
    if (el) return;
    el = document.createElement("div");
    el.id = "chica-share-dock";
    el.setAttribute("role", "group");
    el.setAttribute("aria-label", "Share this map");
    el.innerHTML =
      '<p class="label">Share the map</p>' +
      '<div class="row">' +
      '<a class="nd" target="_blank" rel="noopener noreferrer" href="' + nextdoorHref() + '" aria-label="Share on Nextdoor">' + iconNd() + "Nextdoor</a>" +
      '<a class="fb" target="_blank" rel="noopener noreferrer" href="' + facebookHref() + '" aria-label="Share on Facebook">' + iconFb() + "Facebook</a>" +
      '<button type="button" class="tt" id="chica-share-tiktok" aria-label="Share on TikTok">' + iconTt() + "TikTok</button>" +
      "</div>";
    document.documentElement.appendChild(el);
    var tt = el.querySelector("#chica-share-tiktok");
    if (tt) tt.addEventListener("click", shareTikTok);
  }

  mount();
  setInterval(mount, 1500);
})();
