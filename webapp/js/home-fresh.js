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

  function run() {
    if (!isHome()) return;
    if (document.getElementById("chica-fresh-weekend")) return;

    fetch(dataUrl())
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var today = "2026-10-15";
        var weekend = (data.public || []).filter(function (s) {
          return s.confidence >= 0.7 &&
                 s.date_end >= today &&
                 (s.date_start || s.date_from || "") <= "2026-10-18";
        });
        weekend.sort(function (a, b) { return (b.confidence || 0) - (a.confidence || 0); });

        var main = document.querySelector("main");
        if (!main) return;

        Array.from(main.querySelectorAll("h2, p, div")).forEach(function (el) {
          var t = (el.innerText || "").toLowerCase();
          if (t.indexOf("where the pack is active") !== -1 || (t.indexOf("all ") !== -1 && t.indexOf("this weekend") !== -1)) {
            var sec = el.closest("section") || el.parentElement;
            if (sec && sec !== main) sec.style.display = "none";
          }
        });

        var section = buildSection(weekend, weekend.length);
        var heroBtn = main.querySelector("a[data-chica-keep='1']");
        if (heroBtn && heroBtn.parentNode) {
          heroBtn.parentNode.insertBefore(section, heroBtn.nextSibling);
        } else {
          main.appendChild(section);
        }
      })
      .catch(function () {});
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
  setTimeout(run, 1200);
})();
