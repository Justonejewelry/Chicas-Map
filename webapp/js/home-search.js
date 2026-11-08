/* Home: search upcoming sales for items + saved searches with "new since last visit" alerts.
   No backend: saved searches live only in this browser (localStorage). */
(function () {
  var BASE = "/Chicas-Map", DATA = BASE + "/data/sales-clean.json", KEY = "chica-saved-searches-v1";
  // Email alerts: sign-ups go to Chica's inbox. Set FORM to a formsubmit.co hashed endpoint once activated; MAILTO is the fallback.
  var ALERTS = { FORM: "https://formsubmit.co/ajax/2f6534a8c454b090116f8050045f0e26", MAILTO: "" };
  var ES = String(document.documentElement.lang || "").toLowerCase().indexOf("es") === 0;
  var T = ES ? {
    label: "Busca artículos en las ventas", ph: "Ej. muebles, herramientas, Lego…", go: "Buscar",
    none: "Ninguna venta próxima menciona eso todavía. ¡Guárdalo y te aviso! 🐾", count: function (n) { return n + (n === 1 ? " venta coincide" : " ventas coinciden"); },
    save: "🔔 Avisarme de nuevas", saved: "✓ Búsqueda guardada", view: "Ver en el mapa", mine: "Mis búsquedas guardadas:",
    fresh: function (n) { return n + " nueva" + (n === 1 ? "" : "s"); }, rm: "Quitar",
    note: "Las alertas se guardan solo en este navegador. Te aviso cuando vuelvas (o con una notificación si la página está abierta).",
    em: "✉️ Avísame por correo", emPh: "tu@correo.com", emGo: "Enviar", emOk: "¡Listo! Revisa tu correo y confirma (responde SÍ) para empezar. 🐾", emErr: "Ups, no se pudo enviar. Intenta otra vez.",
    emPriv: "Solo uso tu correo para estas alertas. Nunca lo vendo ni comparto. Cancela cuando quieras con un clic.",
    notifT: "Chica encontró nuevas ventas", notifB: function (q, n) { return n + " nueva(s) para “" + q + "”"; }
  } : {
    label: "Search sales for items", ph: "e.g. furniture, tools, Lego…", go: "Search",
    none: "No upcoming sale mentions that yet. Save it and I'll let you know! 🐾", count: function (n) { return n + (n === 1 ? " sale matches" : " sales match"); },
    save: "🔔 Alert me to new matches", saved: "✓ Search saved", view: "View on map", mine: "My saved searches:",
    fresh: function (n) { return n + " new"; }, rm: "Remove",
    note: "Alerts are saved in this browser only. I'll flag new matches when you come back (or pop a notification while the page is open).",
    em: "✉️ Email me new matches", emPh: "you@email.com", emGo: "Send", emOk: "Done! Check your inbox and confirm (reply YES) to start. 🐾", emErr: "Oops, that didn't send. Please try again.",
    emPriv: "I only use your email for these alerts. Never sold or shared. Unsubscribe anytime in one click.",
    notifT: "Chica found new sales", notifB: function (q, n) { return n + " new match" + (n === 1 ? "" : "es") + " for “" + q + "”"; }
  };
  var SYN = {
    furniture: ["furniture", "couch", "sofa", "table", "chair", "dresser", "desk", "bed", "cabinet", "bookcase", "recliner", "mueble"],
    tools: ["tool", "drill", "saw", "wrench", "craftsman", "dewalt", "milwaukee", "compressor", "herramienta"],
    toys: ["toy", "lego", "doll", "game", "juguete"],
    clothes: ["cloth", "clothing", "shirt", "dress", "jeans", "shoes", "jacket", "ropa"],
    kids: ["kid", "baby", "children", "stroller", "crib", "toddler", "niño", "bebé"],
    electronics: ["electronic", "tv", "television", "computer", "laptop", "speaker", "stereo", "phone", "camera"],
    kitchen: ["kitchen", "dish", "pot", "pan", "cookware", "appliance", "plates", "cocina"],
    antiques: ["antique", "vintage", "collectible", "retro", "mid century", "mcm", "antigüedad"],
    jewelry: ["jewelry", "jewellery", "necklace", "ring", "bracelet", "earring", "joya"],
    books: ["book", "novel", "libro"],
    decor: ["decor", "art", "lamp", "mirror", "rug", "frame", "christmas", "halloween"],
    outdoor: ["outdoor", "patio", "grill", "garden", "lawn", "mower", "bike", "bicycle"]
  };
  SYN.muebles = SYN.furniture; SYN.herramientas = SYN.tools; SYN.juguetes = SYN.toys; SYN.ropa = SYN.clothes;
  var sales = [], layer = null, saved = load();

  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) {} }
  function today() { try { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date()); } catch (e) { return new Date().toISOString().slice(0, 10); } }
  function sid(s) { return String(s.external_id || s.id || (s.address + "|" + s.date_start)); }
  function hay(s) { if (!s._h) s._h = norm([s.title, s.details, s.description, s.items, (s.categories || []).join(" "), s.address].join(" ")); return s._h; }
  function terms(q) {
    return norm(q).split(/[\s,]+/).filter(function (w) { return w.length > 1; }).map(function (w) {
      var alts = SYN[w] || [w]; if (!SYN[w] && w.length > 3 && /s$/.test(w)) alts = [w, w.replace(/e?s$/, "")];
      return alts.map(norm);
    });
  }
  function match(q) {
    var t = terms(q); if (!t.length) return [];
    return sales.filter(function (s) { var h = hay(s); return t.every(function (alts) { return alts.some(function (a) { return h.indexOf(a) !== -1; }); }); });
  }
  function when(s) {
    var d = s.dates || s.date_start || "", h = s.hours ? " · " + s.hours : "";
    return esc(d + h);
  }
  function card(s) {
    return '<li class="hs-card"><b>' + esc(s.title || "Sale") + '</b><span>' + when(s) + '</span><span class="hs-addr">' + esc(s.address || "") +
      '</span><a href="' + BASE + (ES ? "/map/" : "/map/") + "?sale=" + encodeURIComponent(sid(s)) + '">' + T.view + " →</a></li>";
  }

  function css() {
    if (document.getElementById("home-search-css")) return;
    var st = document.createElement("style"); st.id = "home-search-css";
    st.textContent =
      "#home-search{max-width:560px;margin:0 auto 20px;width:calc(100% - 32px);text-align:left}" +
      "#home-search label{display:block;font:700 14px/1.3 Inter,system-ui,sans-serif;margin:0 0 8px}" +
      "#home-search form{display:flex;gap:8px}" +
      "#home-search input{flex:1;min-width:0;min-height:44px;padding:0 14px;border-radius:999px;border:1px solid var(--line,#3a342e);background:var(--card,#1a1714);color:var(--ink,#f3eee4);font:16px Inter,system-ui,sans-serif}" +
      "#home-search button{min-height:44px;padding:0 16px;border-radius:999px;border:1px solid #ffffff59;background:#c513af;color:#fff;font:700 14px/1 Inter,system-ui,sans-serif;cursor:pointer}" +
      "#home-search .hs-ghost{background:transparent;color:var(--ink,#f3eee4);border:1px solid var(--line,#3a342e)}" +
      "#home-search .hs-meta{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;margin:10px 0 0;font-size:14px;color:var(--muted,#bbb)}" +
      "#home-search ul.hs-list{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:8px;max-height:360px;overflow:auto}" +
      ".hs-card{display:grid;gap:2px;padding:12px 14px;border-radius:14px;border:1px solid var(--line,#3a342e);background:var(--card,#1a1714);font-size:14px}" +
      ".hs-card b{font-size:15px}.hs-card .hs-addr{color:var(--muted,#bbb)}.hs-card a{color:#ed65dc;font-weight:700;text-decoration:none;margin-top:4px}" +
      "#home-search .hs-saved{margin:10px 0 0;font-size:13px;display:flex;flex-wrap:wrap;gap:6px;align-items:center}" +
      ".hs-chip{display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:0 6px 0 12px;border-radius:999px;border:1px solid var(--line,#3a342e);background:var(--card,#1a1714);color:var(--ink,#f3eee4);cursor:pointer;font:600 13px Inter,system-ui,sans-serif}" +
      ".hs-chip i{font-style:normal;background:#c513af;color:#fff;border-radius:999px;padding:2px 8px;font-size:12px}.hs-chip .x{border:0;background:transparent;color:inherit;min-height:28px;padding:0 6px;cursor:pointer}" +
      "#home-search .hs-note{font-size:12px;color:var(--muted,#bbb);margin:6px 0 0}" +
      "#home-search .hs-email{margin:10px 0 0;display:flex;flex-wrap:wrap;gap:8px}#home-search .hs-email input[type=email]{flex:1 1 200px}" +
      "#home-search .hs-email .hs-hp{position:absolute;left:-9999px}#home-search .hs-emmsg{font-size:13px;margin:6px 0 0}" +
      ".chica-home-hit{background:transparent!important;border:0!important}";
    document.head.appendChild(st);
  }

  function build() {
    var map = document.getElementById("chica-home-mini-map"); if (!map || document.getElementById("home-search")) return null;
    var box = document.createElement("div"); box.id = "home-search"; box.setAttribute("role", "search");
    box.innerHTML = '<label for="hs-q">' + T.label + '</label><form><input id="hs-q" type="search" autocomplete="off" enterkeyhint="search" placeholder="' + esc(T.ph) +
      '"/><button type="submit">' + T.go + '</button></form><div class="hs-meta" aria-live="polite"></div><ul class="hs-list"></ul><div class="hs-saved"></div>';
    map.parentNode.insertBefore(box, map);
    return box;
  }

  function highlight(list) {
    var m = window.__chicaHomeMiniMap; if (!m || !window.L) return;
    if (layer) { m.removeLayer(layer); layer = null; }
    var host = m.getContainer(); host.style.filter = "";
    if (!list) return;
    layer = L.layerGroup(); var b = [];
    list.forEach(function (s) {
      var lat = +s.lat, lon = +s.lon; if (!isFinite(lat) || !isFinite(lon)) return;
      b.push([lat, lon]);
      L.marker([lat, lon], { interactive: false, keyboard: false, zIndexOffset: 1000, icon: L.divIcon({ className: "chica-home-hit", iconSize: [20, 20], iconAnchor: [10, 10],
        html: '<div style="width:20px;height:20px;border-radius:50%;background:#ffd400;border:3px solid #c513af;box-shadow:0 0 0 3px #fff8,0 2px 6px #0008"></div>' }) }).addTo(layer);
    });
    layer.addTo(m);
    if (b.length) try { m.fitBounds(b, { padding: [30, 30], maxZoom: 13 }); } catch (e) {}
  }

  function render(box, q) {
    var meta = box.querySelector(".hs-meta"), ul = box.querySelector(".hs-list");
    q = (q || "").trim();
    if (!q) { meta.innerHTML = ""; ul.innerHTML = ""; highlight(null); return; }
    var hits = match(q);
    var isSaved = saved.some(function (x) { return norm(x.q) === norm(q); });
    meta.innerHTML = "<span>" + (hits.length ? T.count(hits.length) : T.none) + '</span><button type="button" class="hs-ghost hs-save"' + (isSaved ? " disabled" : "") + ">" + (isSaved ? T.saved : T.save) + "</button>";
    ul.innerHTML = hits.slice(0, 30).map(card).join("");
    highlight(hits);
    meta.querySelector(".hs-save").onclick = function () {
      saved.push({ q: q, seen: hits.map(sid), at: today() }); store(); renderSaved(box); render(box, q);
      if ("Notification" in window && Notification.permission === "default") try { Notification.requestPermission(); } catch (e) {}
    };
  }

  function fresh(s) { var seen = s.seen || []; return match(s.q).filter(function (x) { return seen.indexOf(sid(x)) === -1; }); }

  function renderSaved(box) {
    var el = box.querySelector(".hs-saved");
    if (!saved.length) { el.innerHTML = ""; return; }
    el.innerHTML = "<span>" + T.mine + "</span>" + saved.map(function (s, i) {
      var n = fresh(s).length;
      return '<span class="hs-chip" data-i="' + i + '" role="button" tabindex="0">' + esc(s.q) + (n ? " <i>" + T.fresh(n) + "</i>" : "") +
        '<button type="button" class="x" aria-label="' + T.rm + " " + esc(s.q) + '">×</button></span>';
    }).join("") + '<p class="hs-note">' + T.note + "</p>" + emailForm();
    wireEmail(box);
    Array.prototype.forEach.call(el.querySelectorAll(".hs-chip"), function (c) {
      var i = +c.getAttribute("data-i");
      function open() { var s = saved[i]; box.querySelector("#hs-q").value = s.q; render(box, s.q); s.seen = match(s.q).map(sid); store(); renderSaved(box); }
      c.onclick = function (e) { if (e.target.classList.contains("x")) { saved.splice(i, 1); store(); renderSaved(box); return; } open(); };
      c.onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } };
    });
  }

  function emailForm() {
    if (!ALERTS.FORM && !ALERTS.MAILTO) return "";
    return '<form class="hs-email" novalidate><label for="hs-em" style="width:100%;font-size:13px;margin:0">' + T.em + '</label>' +
      '<input id="hs-em" type="email" required autocomplete="email" placeholder="' + T.emPh + '"/><input class="hs-hp" name="_honey" tabindex="-1" autocomplete="off" aria-hidden="true"/>' +
      '<button type="submit">' + T.emGo + '</button><p class="hs-note" style="width:100%">' + T.emPriv + '</p><p class="hs-emmsg" aria-live="polite"></p></form>';
  }
  function wireEmail(box) {
    var f = box.querySelector(".hs-email"); if (!f) return;
    f.onsubmit = function (e) {
      e.preventDefault();
      var em = f.querySelector("#hs-em").value.trim(), msg = f.querySelector(".hs-emmsg");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { f.querySelector("#hs-em").focus(); return; }
      if (f.querySelector(".hs-hp").value) return;
      var terms = saved.map(function (x) { return x.q; }).join(" | "), lang = ES ? "es" : "en";
      try{window.goatcounter&&window.goatcounter.count&&window.goatcounter.count({path:"evt-alert-signup-submit",title:"Saved-search alert signup submit",event:true});}catch(x){}
      var subj = "Chica alerts SUBSCRIBE", body = "email: " + em + "\nsearches: " + terms + "\nlang: " + lang + "\n";
      if (ALERTS.FORM) {
        var fd = new FormData(); fd.append("email", em); fd.append("searches", terms); fd.append("lang", lang); fd.append("action", "subscribe");
        fd.append("_subject", subj); fd.append("_template", "box"); fd.append("_captcha", "false");
        fetch(ALERTS.FORM, { method: "POST", body: fd, headers: { Accept: "application/json" } })
          .then(function (r) { msg.textContent = r.ok ? T.emOk : T.emErr; }).catch(function () { msg.textContent = T.emErr; });
      } else {
        location.href = "mailto:" + ALERTS.MAILTO + "?subject=" + encodeURIComponent(subj) + "&body=" + encodeURIComponent(body);
        msg.textContent = T.emOk;
      }
    };
  }

  function notify() {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    saved.forEach(function (s) {
      var n = fresh(s), ids = n.map(sid).join(",");
      if (n.length && s.notified !== ids) { try { new Notification(T.notifT, { body: T.notifB(s.q, n.length), icon: BASE + "/images/chica-logo.png" }); } catch (e) {} s.notified = ids; }
    });
    store();
  }

  function setData(d) {
    var t = today(), all = [];
    ["public", "sales"].forEach(function (k) { if (d && Array.isArray(d[k])) all = all.concat(d[k]); });
    sales = all.filter(function (s) { var end = String(s.date_end || s.date_to || s.date_start || ""); return !end || end >= t; });
  }
  function fetchData() { return fetch(DATA + "?v=" + Date.now(), { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); }

  function run() {
    css(); var box = build(); if (!box) return;
    var input = box.querySelector("#hs-q");
    box.querySelector("form").onsubmit = function (e) { e.preventDefault(); render(box, input.value); };
    var tm; input.addEventListener("input", function () { clearTimeout(tm); tm = setTimeout(function () { render(box, input.value); }, 250); });
    fetchData().then(function (d) {
      setData(d); renderSaved(box); notify();
      var q = ""; try { q = new URLSearchParams(location.search).get("q") || ""; } catch (e) {}
      if (q) { input.value = q; setTimeout(function () { render(box, q); }, 900); }
    });
    // While the page stays open, re-check every 30 minutes for new matches.
    setInterval(function () { if (!saved.length) return; fetchData().then(function (d) { if (d) { setData(d); renderSaved(box); notify(); } }); }, 30 * 60 * 1000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
})();
