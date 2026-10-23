/* Home fresh sales. Replaces stale bundled list with live feed. */
(function () {
  function isHome() {
    var p = (location.pathname || "/").replace(/\/+$/, "") || "/";
    return p === "/" || p === "/index.html" || p === "/Chicas-Map" || p === "/Chicas-Map/index.html";
  }

  function dataUrl() {
    return location.pathname.indexOf("/Chicas-Map") === 0
      ? "/Chicas-Map/data/cities/san-antonio.json"
      : "/data/cities/san-antonio.json";
  }

  function es() {
    return String(document.documentElement.lang || "").toLowerCase().indexOf("es") === 0;
  }

  function chicagoToday() {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Chicago",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(new Date());
    } catch (e) {
      var d = new Date();
      return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    }
  }

  function addDays(iso, n) {
    var p = iso.split("-").map(Number);
    var dt = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
    dt.setUTCDate(dt.getUTCDate() + n);
    return dt.toISOString().slice(0, 10);
  }

  function weekendBounds() {
    var today = chicagoToday();
    var wd = "Fri";
    try {
      wd = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", weekday: "short" }).format(new Date());
    } catch (e) {
      wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date().getDay()];
    }
    var day = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[wd];
    if (day == null) day = 5;
    var sat = addDays(today, day === 0 ? -1 : 6 - day);
    return { today: today, sat: sat, sun: addDays(sat, 1) };
  }

  function overlaps(s, sat, sun) {
    var ds = String(s.date_start || s.date_from || "");
    var de = String(s.date_end || s.date_to || "");
    return !!ds && !!de && ds <= sun && de >= sat;
  }

  function buildSection(sales, total) {
    var section = document.createElement("section");
    section.id = "chica-fresh-weekend";
    section.setAttribute("data-chica-keep", "1");
    section.style.cssText = "margin:32px 0 48px;padding:0 4px";

    var h2 = document.createElement("h2");
    h2.textContent = es() ? "Este fin de semana" : "This weekend";
    h2.style.cssText = "font:650 22px/1.1 Syne,system-ui,sans-serif;letter-spacing:-.02em;margin:0 0 8px";
    section.appendChild(h2);

    var count = document.createElement("p");
    count.textContent = es()
      ? total + " ventas verificadas · actualizado hoy"
      : total + " verified sales · updated today";
    count.style.cssText = "margin:0 0 16px;color:#a1a1aa;font:500 14px/1 Inter,system-ui,sans-serif";
    section.appendChild(count);

    var list = document.createElement("div");
    list.style.cssText = "display:grid;gap:12px";
    sales.slice(0, 8).forEach(function (s) {
      var card = document.createElement("a");
      card.href = dataUrl().replace("/data/cities/san-antonio.json", "/map/");
      card.style.cssText = "display:block;padding:14px 16px;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:rgba(255,255,255,.03);text-decoration:none;color:inherit";
      var title = document.createElement("div");
      title.textContent = s.title || "Sale";
      title.style.cssText = "font:600 15px/1.3 Inter,system-ui,sans-serif;margin-bottom:4px";
      card.appendChild(title);
      var addr = document.createElement("div");
      addr.textContent = (s.address || "").split(",")[0];
      addr.style.cssText = "font:500 13px/1.3 Inter,system-ui,sans-serif;color:#a1a1aa";
      card.appendChild(addr);
      if (s.hours) {
        var hrs = document.createElement("div");
        hrs.textContent = s.hours;
        hrs.style.cssText = "font:500 12px/1 Inter,system-ui,sans-serif;color:#71717a;margin-top:4px";
        card.appendChild(hrs);
      }
      list.appendChild(card);
    });
    section.appendChild(list);

    var cta = document.createElement("a");
    cta.href = dataUrl().replace("/data/cities/san-antonio.json", "/map/");
    cta.textContent = es() ? "Abrir el mapa" : "Open the map";
    cta.setAttribute("data-chica-keep", "1");
    cta.style.cssText = "display:inline-flex;margin-top:16px;min-height:44px;align-items:center;padding:0 18px;border-radius:980px;background:#c513af;color:#fff;text-decoration:none;font:600 15px/1 Inter,system-ui,sans-serif";
    section.appendChild(cta);

    return section;
  }

  function patchHero(n) {
    var root = document.querySelector("main");
    if (!root) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var node;
    while ((node = walker.nextNode())) {
      var parent = node.parentElement;
      if (parent && parent.closest && parent.closest("#chica-fresh-weekend")) continue;
      var v = node.nodeValue || "";
      if (!v || v.length > 500) continue;
      var next = v
        .replace(/I found \d+ verified sales/, "I found " + n + " verified sales")
        .replace(/Encontré \d+ ventas verificadas/, "Encontré " + n + " ventas verificadas");
      if (next !== v) node.nodeValue = next;
    }
  }

  function hideStale(main) {
    Array.from(main.querySelectorAll("h2, p, div")).forEach(function (el) {
      if (el.closest && el.closest("#chica-fresh-weekend")) return;
      var t = (el.innerText || "").toLowerCase();
      if (!t || t.length > 180) return;
      var stale =
        t.indexOf("where the pack is active") !== -1 ||
        t.indexOf("three i’d start") !== -1 ||
        t.indexOf("three i'd start") !== -1 ||
        t.indexOf("tres con las que") !== -1 ||
        (t.indexOf("all ") !== -1 && t.indexOf("this weekend") !== -1) ||
        (t.indexOf("las ") !== -1 && t.indexOf("este fin") !== -1);
      if (!stale) return;
      var sec = el.closest("section") || el.parentElement;
      if (sec && sec !== main && !(sec.closest && sec.closest("#chica-fresh-weekend"))) sec.style.display = "none";
    });
  }

  var cached = null;

  function paint() {
    if (!isHome() || !cached) return;
    var main = document.querySelector("main");
    if (!main) return;
    patchHero(cached.total);
    hideStale(main);
    if (document.getElementById("chica-fresh-weekend")) return;
    var section = buildSection(cached.sales, cached.total);
    var heroBtn = main.querySelector("a[data-chica-keep='1']");
    if (heroBtn && heroBtn.parentNode) heroBtn.parentNode.insertBefore(section, heroBtn.nextSibling);
    else main.appendChild(section);
  }

  function run() {
    if (!isHome()) return;
    var bounds = weekendBounds();
    fetch(dataUrl(), { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var weekend = (data.public || []).filter(function (s) {
          return (s.confidence || 0) >= 0.7 && overlaps(s, bounds.sat, bounds.sun);
        });
        weekend.sort(function (a, b) { return (b.confidence || 0) - (a.confidence || 0); });
        cached = { sales: weekend, total: weekend.length };
        paint();
      })
      .catch(function () {});
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
  setTimeout(run, 400);
  var ticks = 0;
  var timer = setInterval(function () {
    ticks += 1;
    paint();
    if (ticks > 40) clearInterval(timer);
  }, 500);
})();
