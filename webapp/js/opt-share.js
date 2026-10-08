/* One-time leave ask. New visitors only. Not a second email system. */
(function () {
  var KEY = "chicas-map-opt-share";
  var PACK = "chicas-map-pack";
  var MAP_URL = "https://justonejewelry.github.io/Chicas-Map/map/";
  var FB_FOLLOW = "https://www.facebook.com/61593215043603/";
  var shown = false;
  var armed = false;
  var deferred = null;

  function es() {
    var lang = "";
    try { lang = localStorage.getItem("chicas-map-locale") || ""; } catch (e) {}
    if (!lang) lang = document.documentElement.lang || "en";
    return String(lang).toLowerCase().indexOf("es") === 0;
  }

  function seen() {
    try { return localStorage.getItem(KEY) === "1"; } catch (e) { return true; }
  }

  function mark() {
    try { localStorage.setItem(KEY, "1"); } catch (e) {}
  }

  function copy() {
    if (es()) {
      return {
        kicker: "Opt share",
        title: "Antes de irte",
        body: "¿Puedes regalarnos un momento? Ayuda a Chica, de San Antonio, a competir con los grandes. Esto se pregunta una sola vez, y solo a quien visita por primera vez. No lo volverás a ver.",
        email: "Lista de correo semanal",
        emailNote: "Pines del viernes. Un correo. Sin spam.",
        share: "Compartir en redes",
        shareNote: "Comparte el mapa y sigue a Chica en Facebook.",
        home: "Agregar a la pantalla de inicio",
        homeNote: "Un toque y el mapa está en tu teléfono el sábado.",
        help: "Puedo ayudar",
        no: "No, gracias",
        emailPh: "tu@correo.com",
        need: "Elige al menos una, o pulsa No, gracias.",
        bad: "Ese correo no parece válido.",
        thanks: "Gracias. Eso es todo. No lo volvemos a pedir.",
        ios: "En iPhone: Compartir, luego Agregar a inicio.",
        shared: "Facebook está abierto para seguir a Chica. Comparte el mapa ahí también.",
        saved: "Correo guardado en la lista semanal."
      };
    }
    return {
      kicker: "Opt share",
      title: "Before you go",
      body: "Can you spare a moment? Help San Antonio’s own Chica compete with the big dogs. This is asked once, and only of new visitors. You will not see it again.",
      email: "Weekly email list",
      emailNote: "Friday pins. One email. No spam.",
      share: "Share on social",
      shareNote: "Share the map, and follow Chica on Facebook.",
      home: "Add to your home screen",
      homeNote: "One tap back to the map on Saturday.",
      help: "I can help",
      no: "No thank you",
      emailPh: "you@email.com",
      need: "Pick at least one, or choose No thank you.",
      bad: "That email does not look valid.",
      thanks: "Thank you. That is all. We will not ask again.",
      ios: "On iPhone: Share, then Add to Home Screen.",
      shared: "Facebook is open so you can follow Chica. Share the map there too.",
      saved: "Email saved to the weekly list."
    };
  }

  function css() {
    if (document.getElementById("chica-opt-css")) return;
    var s = document.createElement("style");
    s.id = "chica-opt-css";
    s.textContent =
      "#chica-opt{position:fixed;inset:0;z-index:2147483646;display:flex;align-items:flex-end;justify-content:center;padding:12px;background:rgba(8,8,8,.62);font-family:Inter,system-ui,sans-serif}" +
      "#chica-opt .card{width:min(440px,100%);max-height:min(86dvh,640px);overflow:auto;background:#1a1714;color:#f3eee4;border:1px solid rgba(243,238,228,.16);border-radius:16px;padding:16px;box-shadow:0 18px 40px rgba(0,0,0,.4)}" +
      "#chica-opt .kicker{margin:0 0 4px;font:700 11px/1 Inter,system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#c513af}" +
      "#chica-opt h2{margin:0 0 8px;font:800 22px/1.15 Inter,system-ui,sans-serif}" +
      "#chica-opt p{margin:0 0 12px;font:500 14px/1.4 Inter,system-ui,sans-serif;color:#f3eee4}" +
      "#chica-opt label.opt{display:flex;gap:10px;align-items:flex-start;margin:0 0 8px;padding:10px;border:1px solid rgba(243,238,228,.14);border-radius:12px;background:#121212;cursor:pointer}" +
      "#chica-opt label.opt input{width:18px;height:18px;margin-top:2px;accent-color:#c513af;flex:0 0 auto}" +
      "#chica-opt label.opt strong{display:block;font:700 14px/1.2 Inter,system-ui,sans-serif}" +
      "#chica-opt label.opt span{display:block;margin-top:2px;font:500 12px/1.35 Inter,system-ui,sans-serif;color:#b8b0a4}" +
      "#chica-opt .mail{width:100%;height:44px;margin:0 0 10px;border:1px solid rgba(243,238,228,.16);border-radius:12px;background:#121212;color:#f3eee4;padding:0 12px;font:500 14px/1 Inter,system-ui,sans-serif}" +
      "#chica-opt .row{display:flex;gap:8px;margin-top:4px}" +
      "#chica-opt .help,#chica-opt .no{flex:1 1 auto;height:44px;border-radius:12px;font:700 14px/1 Inter,system-ui,sans-serif;cursor:pointer}" +
      "#chica-opt .help{border:1px solid #8d0c7c;background:#c513af;color:#fff}" +
      "#chica-opt .no{border:1px solid rgba(243,238,228,.2);background:transparent;color:#f3eee4}" +
      "#chica-opt .note{min-height:18px;margin:8px 0 0;font:600 12px/1.35 Inter,system-ui,sans-serif;color:#b8b0a4}" +
      "@media(min-width:720px){#chica-opt{align-items:center}}";
    (document.head || document.documentElement).appendChild(s);
  }

  function saveEmail(email) {
    var row = { email: email, source: "opt-share", at: new Date().toISOString() };
    var list = [];
    try { list = JSON.parse(localStorage.getItem(PACK) || "[]"); } catch (e) { list = []; }
    if (!Array.isArray(list)) list = [];
    if (!list.some(function (item) { return item && item.email === email; })) list.push(row);
    try { localStorage.setItem(PACK, JSON.stringify(list)); } catch (e) {}
  }

  function shareMap() {
    window.open(FB_FOLLOW, "_blank", "noopener,noreferrer");
    var text = es()
      ? "Ventas de garaje en San Antonio este fin. Mapa gratis. Sigue a Chica: " + FB_FOLLOW
      : "San Antonio garage sales this weekend. Free map. Follow Chica: " + FB_FOLLOW;
    if (navigator.share) {
      return navigator.share({ title: "Chicas Map", text: text, url: MAP_URL }).catch(function () {});
    }
    return Promise.resolve();
  }

  function addHome() {
    if (deferred) {
      var prompt = deferred;
      deferred = null;
      return prompt.prompt();
    }
    return Promise.resolve("manual");
  }

  function close(el) {
    mark();
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function open() {
    if (shown || seen()) return;
    shown = true;
    css();
    var c = copy();
    var root = document.createElement("div");
    root.id = "chica-opt";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "chica-opt-title");
    root.innerHTML =
      '<div class="card">' +
        '<p class="kicker">' + c.kicker + '</p>' +
        '<h2 id="chica-opt-title">' + c.title + '</h2>' +
        '<p>' + c.body + '</p>' +
        '<label class="opt"><input type="checkbox" data-opt="email" checked><div><strong>' + c.email + '</strong><span>' + c.emailNote + '</span></div></label>' +
        '<input class="mail" type="email" inputmode="email" autocomplete="email" placeholder="' + c.emailPh + '" aria-label="' + c.email + '">' +
        '<label class="opt"><input type="checkbox" data-opt="share" checked><div><strong>' + c.share + '</strong><span>' + c.shareNote + '</span></div></label>' +
        '<label class="opt"><input type="checkbox" data-opt="home" checked><div><strong>' + c.home + '</strong><span>' + c.homeNote + '</span></div></label>' +
        '<div class="row"><button type="button" class="help">' + c.help + '</button><button type="button" class="no">' + c.no + '</button></div>' +
        '<p class="note" role="status"></p>' +
      '</div>';
    document.documentElement.appendChild(root);
    var note = root.querySelector(".note");
    var mail = root.querySelector(".mail");
    root.querySelector(".no").addEventListener("click", function () { close(root); });
    root.querySelector(".help").addEventListener("click", function () {
      var emailOn = root.querySelector('[data-opt="email"]').checked;
      var shareOn = root.querySelector('[data-opt="share"]').checked;
      var homeOn = root.querySelector('[data-opt="home"]').checked;
      if (!emailOn && !shareOn && !homeOn) {
        note.textContent = c.need;
        return;
      }
      var email = String(mail.value || "").trim().toLowerCase();
      if (emailOn) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          note.textContent = c.bad;
          mail.focus();
          return;
        }
        saveEmail(email);
      }
      var jobs = [];
      if (shareOn) jobs.push(shareMap());
      if (homeOn) jobs.push(addHome());
      Promise.all(jobs).then(function (results) {
        var bits = [c.thanks];
        if (emailOn) bits.push(c.saved);
        if (shareOn) bits.push(c.shared);
        if (homeOn && results.indexOf("manual") !== -1) bits.push(c.ios);
        note.textContent = bits.join(" ");
        setTimeout(function () { close(root); }, homeOn && results.indexOf("manual") !== -1 ? 2600 : 1400);
      });
    });
    var first = root.querySelector(".help");
    if (first) first.focus();
  }

  function arm() {
    if (seen()) return;
    armed = true;
    try { history.pushState({ chicaOpt: 1 }, ""); } catch (e) {}
  }

  window.addEventListener("beforeinstallprompt", function (ev) {
    ev.preventDefault();
    deferred = ev;
  });

  window.addEventListener("popstate", function () {
    if (!armed || seen() || shown) return;
    open();
  });

  document.addEventListener("mouseout", function (ev) {
    if (!armed || seen() || shown) return;
    if (ev.relatedTarget || ev.toElement) return;
    if (ev.clientY > 8) return;
    open();
  });

  document.addEventListener("click", function (ev) {
    if (!armed || seen() || shown) return;
    var a = ev.target && ev.target.closest && ev.target.closest("a[href]");
    if (!a) return;
    var href = a.getAttribute("href") || "";
    if (href.indexOf("http") !== 0) return;
    if (href.indexOf(location.host) !== -1) return;
    ev.preventDefault();
    open();
  }, true);

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(arm, 4000); });
  else setTimeout(arm, 4000);
})();
