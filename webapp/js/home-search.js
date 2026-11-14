/* Home: search upcoming sales for items + saved searches with "new since last visit" alerts.
   No backend: saved searches live only in this browser (localStorage).
   Email: after-search saved-search alerts + bottom weekly roundup both use formsubmit.co. */
(function () {
  var BASE = "/Chicas-Map", DATA = BASE + "/data/sales-clean.json", KEY = "chica-saved-searches-v1";
  // Email alerts: sign-ups go to Chica's inbox. Set FORM to a formsubmit.co hashed endpoint once activated; MAILTO is the fallback.
  var ALERTS = { FORM: "https://formsubmit.co/ajax/2f6534a8c454b090116f8050045f0e26", MAILTO: "" };
  var ES = String(document.documentElement.lang || "").toLowerCase().indexOf("es") === 0;
  var T = ES ? {
    label: "Busca artículos en las ventas", ph: "Ej. muebles, herramientas, Lego…", go: "Buscar", loading: "Cargando ventas…", loadErr: "No se pudieron cargar las ventas en vivo.", retry: "Reintentar",
    none: "Ninguna venta próxima menciona eso todavía. ¡Guárdalo y te aviso! 🐾", count: function (n) { return n + (n === 1 ? " venta coincide" : " ventas coinciden"); },
    save: "🔔 Avisarme de nuevas", saved: "✓ Búsqueda guardada", view: "Ver en el mapa", details: "Detalles", help: "¿Buscas algo especial, vecino? Busca, guarda y te aviso por correo cuando aparezcan ventas nuevas que coincidan. 🐾", emNeed: "Escribe primero qué buscas (ej. muebles).", mine: "Mis búsquedas guardadas:",
    fresh: function (n) { return n + " nueva" + (n === 1 ? "" : "s"); }, rm: "Quitar",
    note: "Las alertas se guardan solo en este navegador. Te aviso cuando vuelvas (o con una notificación si la página está abierta).",
    em: "✉️ Avísame por correo", emPh: "tu@correo.com", emGo: "Enviar", emOk: "¡Listo! Revisa tu correo y confirma (responde SÍ) para empezar. 🐾", emErr: "Ups, no se pudo enviar. Intenta otra vez.",
    emPriv: "Solo uso tu correo para estas alertas. Nunca lo vendo ni comparto. Cancela cuando quieras con un clic.",
    afterAsk: function (q) { return "¿Quieres que Chica te avise por correo cuando aparezca “" + q + "”?"; },
    afterGo: "Avisarme",
    weeklyOk: "¡Listo! Revisa tu correo para confirmar la suscripción al resumen semanal. 🐾",
    weeklyErr: "Ups, no se pudo enviar. Intenta otra vez.",
    notifT: "Chica encontró nuevas ventas", notifB: function (q, n) { return n + " nueva(s) para “" + q + "”"; }
  } : {
    label: "Search sales for items", ph: "e.g. furniture, tools, Lego…", go: "Search", loading: "Loading live sales…", loadErr: "Live sales could not load.", retry: "Retry",
    none: "No upcoming sale mentions that yet. Save it and I'll let you know! 🐾", count: function (n) { return n + (n === 1 ? " sale matches" : " sales match"); },
    save: "🔔 Alert me to new matches", saved: "✓ Search saved", view: "View on map", details: "Details", help: "Hunting something special, neighbor? Search, save it, and I'll email you when new matching sales show up. 🐾", emNeed: "Type what you're hunting for first (e.g. furniture).", mine: "My saved searches:",
    fresh: function (n) { return n + " new"; }, rm: "Remove",
    note: "Alerts are saved in this browser only. I'll flag new matches when you come back (or pop a notification while the page is open).",
    em: "✉️ Email me new matches", emPh: "you@email.com", emGo: "Send", emOk: "Done! Check your inbox and confirm (reply YES) to start. 🐾", emErr: "Oops, that didn't send. Please try again.",
    emPriv: "I only use your email for these alerts. Never sold or shared. Unsubscribe anytime in one click.",
    afterAsk: function (q) { return "Want Chica to email you when “" + q + "” shows up?"; },
    afterGo: "Email me",
    weeklyOk: "Done! Check your inbox to confirm the weekly roundup. 🐾",
    weeklyErr: "Oops, that didn't send. Please try again.",
    notifT: "Chica found new sales", notifB: function (q, n) { return n + " new match" + (n === 1 ? "" : "es") + " for “" + q + "”"; }
  };
  var feedState = "loading";
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
  function slug(id) { return String(id).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "sale"; }
  function sid(s) { return String(s.external_id || s.id || (s.address + "|" + s.date_start)); }
  function hay(s) { if (!s._h) s._h = norm([s.title, s.details, s.description, s.items, (s.categories || []).join(" "), s.address, s.source_address, s.zip, s.zip_code, s.zipcode, s.postal_code, s.neighborhood, s.city, s.locality, s.source, s.seller, s.company, s.poster, (s.aliases || []).join(" ")].join(" ")); return s._h; }
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
      '</span><a href="' + BASE + (ES ? "/es" : "") + "/sales/" + slug(sid(s)) + '/">' + T.details + ' →</a> <a href="' + BASE + "/map/?sale=" + encodeURIComponent(sid(s)) + '">' + T.view + " →</a></li>";
  }

  function goat(path, title) {
    try { window.goatcounter && window.goatcounter.count && window.goatcounter.count({ path: path, title: title, event: true }); } catch (x) {}
  }

  function postForm(fields, subj) {
    if (!ALERTS.FORM && !ALERTS.MAILTO) return Promise.reject(new Error("no endpoint"));
    if (ALERTS.FORM) {
      var fd = new FormData();
      Object.keys(fields).forEach(function (k) { fd.append(k, fields[k]); });
      fd.append("_subject", subj);
      fd.append("_template", "box");
      fd.append("_captcha", "false");
      return fetch(ALERTS.FORM, { method: "POST", body: fd, headers: { Accept: "application/json" } })
        .then(function (r) { if (!r.ok) throw new Error("bad"); return r; });
    }
    var body = Object.keys(fields).map(function (k) { return k + ": " + fields[k]; }).join("\n") + "\n";
    location.href = "mailto:" + ALERTS.MAILTO + "?subject=" + encodeURIComponent(subj) + "&body=" + encodeURIComponent(body);
    return Promise.resolve();
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
      "#home-search .hs-after{margin:12px 0 0;padding:12px 14px;border-radius:14px;border:1px solid var(--line,#3a342e);background:var(--card,#1a1714)}" +
      "#home-search .hs-after p.hs-ask{margin:0 0 8px;font:600 14px/1.35 Inter,system-ui,sans-serif}" +
      "#home-search .hs-email{margin:0;display:flex;flex-wrap:wrap;gap:8px;align-items:center}#home-search .hs-email input[type=email]{flex:1 1 200px}" +
      "#home-search .hs-email .hs-hp,.weekly-form .hs-hp{position:absolute;left:-9999px}#home-search .hs-emmsg,.weekly-form .hs-emmsg{font-size:13px;margin:6px 0 0}" +
      ".chica-home-hit{background:transparent!important;border:0!important}";
    document.head.appendChild(st);
  }

  function build() {
    var pre = document.getElementById("home-search");
    if (pre) { if (pre.getAttribute("data-wired")) return null; pre.setAttribute("data-wired", "1"); return pre; }
    var map = document.getElementById("chica-home-mini-map"); if (!map) return null;
    var box = document.createElement("div"); box.id = "home-search"; box.setAttribute("role", "search");
    box.innerHTML = '<label for="hs-q">' + T.label + '</label><form><input id="hs-q" type="search" autocomplete="off" enterkeyhint="search" placeholder="' + esc(T.ph) +
      '"/><button type="submit">' + T.go + '</button></form><div class="hs-meta" aria-live="polite"></div><ul class="hs-list"></ul><div class="hs-after" hidden></div><div class="hs-saved"></div>';
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

  function renderAfter(box, q) {
    var el = box.querySelector(".hs-after"); if (!el) return;
    q = (q || "").trim();
    if (!q) { el.hidden = true; el.innerHTML = ""; return; }
    el.hidden = false;
    el.innerHTML = '<p class="hs-ask">' + esc(T.afterAsk(q)) + '</p>' +
      '<form class="hs-email" novalidate><label for="hs-em" class="visually-hidden">' + T.em + '</label>' +
      '<input id="hs-em" type="email" required autocomplete="email" placeholder="' + T.emPh + '"/>' +
      '<input class="hs-hp" name="_honey" tabindex="-1" autocomplete="off" aria-hidden="true"/>' +
      '<button type="submit">' + T.afterGo + '</button>' +
      '<p class="hs-note" style="width:100%">' + T.emPriv + '</p><p class="hs-emmsg" aria-live="polite"></p></form>';
    var f = el.querySelector(".hs-email");
    f.onsubmit = function (e) {
      e.preventDefault();
      var em = f.querySelector("#hs-em").value.trim(), msg = f.querySelector(".hs-emmsg");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { f.querySelector("#hs-em").focus(); return; }
      if (f.querySelector(".hs-hp").value) return;
      var lang = ES ? "es" : "en";
      goat("evt-alert-after-search", "Saved-search alert after search");
      postForm({ email: em, searches: q, lang: lang, action: "subscribe", tag: "saved-search" }, "Chica alerts SUBSCRIBE")
        .then(function () { msg.textContent = T.emOk; })
        .catch(function () { msg.textContent = T.emErr; });
    };
  }

  function render(box, q) {
    var meta = box.querySelector(".hs-meta"), ul = box.querySelector(".hs-list");
    q = (q || "").trim();
    if (feedState !== "ready") {
      meta.innerHTML = "<span>" + esc(feedState === "error" ? T.loadErr : T.loading) + "</span>" +
        (feedState === "error" ? '<button type="button" class="hs-ghost hs-retry">' + T.retry + "</button>" : "");
      ul.innerHTML = ""; highlight(null); renderAfter(box, "");
      var retry = meta.querySelector(".hs-retry");
      if (retry) retry.onclick = function () { loadData(box); };
      return;
    }
    if (!q) { meta.innerHTML = ""; ul.innerHTML = ""; highlight(null); renderAfter(box, ""); return; }
    var hits = match(q);
    var isSaved = saved.some(function (x) { return norm(x.q) === norm(q); });
    meta.innerHTML = "<span>" + (hits.length ? T.count(hits.length) : T.none) + '</span><button type="button" class="hs-ghost hs-save"' + (isSaved ? " disabled" : "") + ">" + (isSaved ? T.saved : T.save) + "</button>";
    ul.innerHTML = hits.slice(0, 30).map(card).join("");
    highlight(hits);
    renderAfter(box, q);
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
    }).join("") + '<p class="hs-note">' + T.note + "</p>";
    Array.prototype.forEach.call(el.querySelectorAll(".hs-chip"), function (c) {
      var i = +c.getAttribute("data-i");
      function open() { var s = saved[i]; box.querySelector("#hs-q").value = s.q; render(box, s.q); s.seen = match(s.q).map(sid); store(); renderSaved(box); }
      c.onclick = function (e) { if (e.target.classList.contains("x")) { saved.splice(i, 1); store(); renderSaved(box); return; } open(); };
      c.onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } };
    });
  }

  function wireWeekly() {
    var f = document.getElementById("home-weekly-form"); if (!f || f.getAttribute("data-wired")) return;
    f.setAttribute("data-wired", "1");
    f.onsubmit = function (e) {
      e.preventDefault();
      var emEl = f.querySelector("#wr-em"), msg = f.querySelector("#wr-msg") || f.querySelector(".hs-emmsg");
      var em = (emEl && emEl.value || "").trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { if (emEl) emEl.focus(); return; }
      var hp = f.querySelector(".hs-hp"); if (hp && hp.value) return;
      var lang = ES ? "es" : "en";
      goat("evt-subscribe-weekly", "Weekly roundup subscribe");
      postForm({ email: em, lang: lang, action: "weekly-roundup", tag: "weekly-roundup" }, "Chica weekly-roundup SUBSCRIBE")
        .then(function () { if (msg) msg.textContent = T.weeklyOk; })
        .catch(function () { if (msg) msg.textContent = T.weeklyErr; });
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
    if (!d || typeof d !== "object" || (!Array.isArray(d.public) && !Array.isArray(d.sales)))
      throw new Error("Unexpected sales feed format");
    var t = today(), all = [];
    ["public", "sales"].forEach(function (k) { if (Array.isArray(d[k])) all = all.concat(d[k]); });
    sales = all.filter(function (s) { var end = String(s.date_end || s.date_to || s.date_start || ""); return !end || end >= t; });
  }
  function fetchData() {
    return fetch(DATA + "?v=" + Date.now(), { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("Sales feed request failed: " + r.status);
      return r.json();
    }).then(function (d) { setData(d); return d; });
  }
  function loadData(box) {
    feedState = "loading"; render(box, box.querySelector("#hs-q").value);
    return fetchData().then(function () {
      feedState = "ready"; renderSaved(box); notify();
      var input = box.querySelector("#hs-q"), q = "";
      try { q = new URLSearchParams(location.search).get("q") || ""; } catch (e) {}
      if (q) input.value = q;
      render(box, input.value);
    }).catch(function () {
      feedState = "error"; render(box, box.querySelector("#hs-q").value);
    });
  }

  function run() {
    css(); wireWeekly();
    var box = build(); if (!box) return;
    var input = box.querySelector("#hs-q");
    box.querySelector("form").onsubmit = function (e) { e.preventDefault(); render(box, input.value); };
    var tm; input.addEventListener("input", function () { clearTimeout(tm); tm = setTimeout(function () { render(box, input.value); }, 250); });
    loadData(box);
    // While the page stays open, re-check every 30 minutes for new matches.
    setInterval(function () { if (!saved.length) return; fetchData().then(function () { renderSaved(box); notify(); }).catch(function () {}); }, 30 * 60 * 1000);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
})();
