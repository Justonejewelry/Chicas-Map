/* Public, read-only map stats. Counts come from the live sales feed only. */
(function () {
  var TZ = "America/Chicago";
  var AREAS = [
    { slug: "stone-oak", name: "Stone Oak", nameEs: "Stone Oak", zips: ["78258", "78259", "78260", "78261"] },
    { slug: "alamo-heights-midtown", name: "Alamo Heights & Midtown", nameEs: "Alamo Heights y Midtown", zips: ["78209", "78212", "78201", "78213", "78216"] },
    { slug: "north-central", name: "North Central & Shavano Park", nameEs: "Centro Norte y Shavano Park", zips: ["78230", "78231", "78232", "78248", "78217", "78247"] },
    { slug: "medical-center", name: "Medical Center", nameEs: "Centro Médico", zips: ["78229", "78240", "78249", "78238"] },
    { slug: "alamo-ranch-westover-hills", name: "Alamo Ranch & Westover Hills", nameEs: "Alamo Ranch y Westover Hills", zips: ["78245", "78251", "78250", "78252", "78253", "78254"] },
    { slug: "helotes", name: "Helotes & Leon Valley", nameEs: "Helotes y Leon Valley", zips: ["78023"] },
    { slug: "downtown-southtown", name: "Downtown & Southtown", nameEs: "Centro y Southtown", zips: ["78202", "78203", "78204", "78205", "78208", "78210", "78215"] },
    { slug: "west-side", name: "West Side", nameEs: "Lado Oeste", zips: ["78207", "78237", "78227", "78228"] },
    { slug: "southwest-lackland", name: "Southwest San Antonio & Lackland", nameEs: "Suroeste de San Antonio y Lackland", zips: ["78236", "78242"] },
    { slug: "south-side", name: "South Side", nameEs: "Lado Sur", zips: ["78211", "78214", "78221", "78223", "78224", "78225", "78226", "78264", "78112", "78073"] },
    { slug: "east-side", name: "East Side", nameEs: "Lado Este", zips: ["78218", "78219", "78220", "78222", "78244", "78263"] },
    { slug: "northeast-live-oak-converse", name: "Live Oak, Converse & Universal City", nameEs: "Live Oak, Converse y Universal City", zips: ["78233", "78239", "78109", "78148", "78150", "78234", "78133"] },
    { slug: "schertz-new-braunfels", name: "Schertz, Cibolo & New Braunfels", nameEs: "Schertz, Cibolo y New Braunfels", zips: ["78154", "78108", "78124", "78130", "78132", "78666", "78623", "78070"] },
    { slug: "boerne-hill-country", name: "Boerne & the Hill Country", nameEs: "Boerne y el Hill Country", zips: ["78006", "78015", "78009", "78255", "78256", "78257"] }
  ];
  var ZIP_TO_AREA = {};
  AREAS.forEach(function (a) { a.zips.forEach(function (z) { ZIP_TO_AREA[z] = a; }); });

  var COPY = {
    en: {
      loading: "Loading the live map feed…",
      loaded: "Numbers are from the live San Antonio map feed.",
      loadError: "Chica couldn't load the live feed just now. Try again in a moment, or open the map.",
      updated: "Last update: {date} (Central Time)",
      updatedUnknown: "Last update time is not in this feed yet.",
      weekendRange: "Friday–Sunday {start} to {end}",
      emptyHoods: "No upcoming pins are tagged to a neighborhood right now.",
      emptySales: "Chica does not have an added date on the current listings yet.",
      comingSoon: "Coming soon",
      trafficSoon: "Visit counts will show here once the public traffic counter is switched on. Chica is not guessing a number in the meantime.",
      otherArea: "Other area",
      facebook: "Facebook",
      email: "Email leads",
      nextdoor: "Nextdoor",
      listings: "Public listing sites",
      otherSource: "Other",
      sourceHint: {
        facebook: "Facebook Events and Marketplace posts that made it onto the map.",
        email: "Sales Chica picked up from email sale alerts or an email-tagged listing.",
        nextdoor: "Sales neighbors posted on Nextdoor.",
        listings: "Public listing sites such as YardSaleSearch, Craigslist, EstateSales.net, and GarageSaleFinder.",
        other: "Listings that do not fit the groups above, such as a neighbor tip."
      },
      dateFmt: { year: "numeric", month: "short", day: "numeric" }
    },
    es: {
      loading: "Cargando el feed en vivo del mapa…",
      loaded: "Las cifras salen del feed en vivo del mapa de San Antonio.",
      loadError: "Chica no pudo cargar el feed ahora. Inténtalo en un momento, o abre el mapa.",
      updated: "Última actualización: {date} (hora del Centro)",
      updatedUnknown: "La hora de actualización aún no viene en este feed.",
      weekendRange: "Viernes a domingo, {start} a {end}",
      emptyHoods: "No hay pines próximos asignados a un vecindario ahora mismo.",
      emptySales: "Chica aún no tiene una fecha de alta en los listados actuales.",
      comingSoon: "Próximamente",
      trafficSoon: "Las visitas aparecerán aquí cuando se active el contador público de tráfico. Chica no inventa un número mientras tanto.",
      otherArea: "Otra zona",
      facebook: "Facebook",
      email: "Avisos por correo",
      nextdoor: "Nextdoor",
      listings: "Sitios públicos de anuncios",
      otherSource: "Otros",
      sourceHint: {
        facebook: "Eventos y publicaciones de Marketplace de Facebook que llegaron al mapa.",
        email: "Ventas que Chica tomó de alertas por correo o de un listado marcado como email.",
        nextdoor: "Ventas que vecinos publicaron en Nextdoor.",
        listings: "Sitios públicos como YardSaleSearch, Craigslist, EstateSales.net y GarageSaleFinder.",
        other: "Listados que no entran en los grupos de arriba, como un aviso de un vecino."
      },
      dateFmt: { year: "numeric", month: "short", day: "numeric" }
    }
  };

  var STATIC_ES = {
    eyebrow: "UN VISTAZO AL MAPA",
    title: "Números del mapa",
    lede: "Cifras públicas y en vivo de las ventas de garaje, patio y bienes en el mapa de San Antonio. Pasa el cursor, toca o usa el teclado sobre el botón de ayuda para ver qué significa cada número y de dónde sale.",
    weekendLabel: "Este fin de semana",
    weekendNote: "Viernes a domingo, hora del Centro",
    upcomingLabel: "Pines próximos",
    upcomingNote: "Ventas que aún no terminan",
    trafficLabel: "Visitas al sitio",
    trafficNote: "Contador público de tráfico",
    hoodsTitle: "Por vecindario",
    hoodsIntro: "Pines próximos en cada zona, según el código postal de la venta.",
    sourcesTitle: "De dónde salen",
    sourcesIntro: "Cómo llegaron al mapa las ventas que aún no terminan.",
    newestTitle: "Ventas más nuevas",
    newestIntro: "Las altas más recientes con una fecha de publicación o de revisión.",
    ctaMap: "Abrir el mapa",
    ctaWeekend: "Este fin de semana",
    ctaList: "Publicar una venta",
    skip: "Ir al contenido",
    tips: {
      upcoming: "Cuántas ventas del feed público aún no terminan. Si la fecha de cierre ya pasó en la hora del Centro, esa venta no cuenta. La fuente es el archivo en vivo de ventas del mapa.",
      weekend: "Cuántas de esas ventas próximas coinciden con el viernes, sábado o domingo de este fin (o del que viene, si hoy es de lunes a jueves). Las fechas se leen en la hora del Centro.",
      updated: "El día en que Chica armó el feed de ventas que ves en el mapa, mostrado en la hora del Centro. Si el feed solo trae una fecha, no inventamos la hora.",
      traffic: "Las visitas vendrían del contador público de GoatCounter para chicasmap.com. Ese contador aún no está abierto, así que aquí verás “Próximamente” en vez de un número inventado.",
      hoods: "Las ventas próximas agrupadas por los mismos vecindarios del mapa, usando el código postal de la venta. Una venta sin código postal conocido entra en “Otra zona”.",
      sources: "Facebook, avisos por correo, Nextdoor y sitios públicos de anuncios, tomados del campo de fuente de cada venta. Chica no inventa estas categorías.",
      newest: "Las ventas con la fecha de alta o de revisión más reciente. Muchos listados no traen esa fecha; esos no aparecen aquí. El enlace abre la venta en el mapa."
    }
  };

  function basePath() {
    var p = location.pathname || "/";
    return p.indexOf("/Chicas-Map") === 0 ? "/Chicas-Map" : "";
  }
  function isEs() {
    var p = location.pathname || "";
    return document.documentElement.lang === "es" || /\/es(\/|$)/.test(p.replace(basePath(), "") || p);
  }
  function t() { return isEs() ? COPY.es : COPY.en; }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ctToday(now) {
    try {
      return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now || new Date());
    } catch (e) {
      var d = now || new Date();
      return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    }
  }
  function addDays(iso, n) {
    var p = iso.split("-").map(Number);
    var d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + n));
    return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate());
  }
  function dow(iso) {
    var p = iso.split("-").map(Number);
    return new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay();
  }
  function weekendRange(today) {
    var d = dow(today);
    var toFri = d === 5 ? 0 : d === 6 ? -1 : d === 0 ? -2 : 5 - d;
    var fri = addDays(today, toFri);
    return [fri, addDays(fri, 2)];
  }
  function overlaps(sale, from, to) {
    var s = String(sale.date_start || sale.date_from || "").slice(0, 10);
    var e = String(sale.date_end || sale.date_to || sale.end_date || s).slice(0, 10);
    if (!s) return true;
    return s <= to && (e || s) >= from;
  }
  function notEnded(sale, today) {
    var end = String(sale.date_end || sale.end_date || sale.date_to || "").slice(0, 10);
    return !/^\d{4}-\d{2}-\d{2}$/.test(end) || end >= today;
  }
  function bag(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.public)) return data.public.slice();
    if (data && Array.isArray(data.sales)) return data.sales.slice();
    if (data && Array.isArray(data.features)) {
      return data.features.map(function (f) {
        var p = f.properties || {};
        return Object.assign({}, p);
      });
    }
    return [];
  }
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }
  function zipOf(s) {
    var z = String(s.zip || "").match(/\b7\d{4}\b/) || String(s.address || "").match(/\b7\d{4}\b/);
    return z ? z[0] : "";
  }
  function saleId(s) {
    var lat = Number(s.lat != null ? s.lat : s.latitude);
    var lon = Number(s.lon != null ? s.lon : s.lng != null ? s.lng : s.longitude);
    return s.external_id || s.id || s.sale_id || ((isFinite(lat) && isFinite(lon)) ? lat.toFixed(5) + "," + lon.toFixed(5) + "|" + (s.title || s.address || "") : "");
  }
  function sourceBlob(s) {
    return [s.source, (s.sources || []).join(" "), s.external_id, s.id, (s.aliases || []).join(" ")].join(" ").toLowerCase();
  }
  function sourceBucket(s) {
    var blob = sourceBlob(s);
    if (/facebook/.test(blob)) return "facebook";
    if (/nextdoor/.test(blob)) return "nextdoor";
    if (/\bemail\b/.test(blob) || /(?:^|[-_])email(?:[-_]|$)/.test(blob)) return "email";
    if (/yardsalesearch|craigslist|estatesales|garagesalefinder|gsalr|offerup/.test(blob)) return "listings";
    return "other";
  }
  function addedMs(s) {
    if (s.posted_at) {
      var t1 = Date.parse(s.posted_at);
      if (isFinite(t1)) return t1;
    }
    var ev = String(s.date_verified || "");
    var m = ev.match(/(20\d{2}-\d{2}-\d{2})(?:[T_-](\d{2})(\d{2}))?/);
    if (m) {
      var hh = m[2] || "00", mm = m[3] || "00";
      var t2 = Date.parse(m[1] + "T" + hh + ":" + mm + ":00-06:00");
      if (isFinite(t2)) return t2;
    }
    return 0;
  }
  function formatDay(iso, locale) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return iso || "";
    var p = iso.split("-").map(Number);
    try {
      return new Intl.DateTimeFormat(locale, Object.assign({ timeZone: "UTC" }, t().dateFmt)).format(new Date(Date.UTC(p[0], p[1] - 1, p[2])));
    } catch (e) { return iso; }
  }
  function formatStamp(value, locale) {
    if (!value) return "";
    var s = String(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return formatDay(s, locale);
    var ms = Date.parse(s);
    if (!isFinite(ms)) {
      var m = s.match(/(20\d{2}-\d{2}-\d{2})/);
      return m ? formatDay(m[1], locale) : "";
    }
    try {
      return new Intl.DateTimeFormat(locale, Object.assign({ timeZone: TZ, hour: "numeric", minute: "2-digit" }, t().dateFmt)).format(new Date(ms));
    } catch (e) {
      return formatDay(s.slice(0, 10), locale);
    }
  }

  function applySpanishChrome() {
    if (!isEs()) return;
    document.documentElement.lang = "es";
    var es = STATIC_ES;
    var set = function (sel, text) { var el = document.querySelector(sel); if (el) el.textContent = text; };
    set(".eyebrow", es.eyebrow);
    set("#stats-title", es.title);
    set("#stats-lede", es.lede);
    set('[data-stat="weekend"] .stat-label', es.weekendLabel);
    set('[data-stat="weekend"] .stat-note', es.weekendNote);
    set('[data-stat="upcoming"] .stat-label', es.upcomingLabel);
    set('[data-stat="upcoming"] .stat-note', es.upcomingNote);
    set('[data-stat="traffic"] .stat-label', es.trafficLabel);
    set('[data-stat="traffic"] .stat-note', es.trafficNote);
    set("#hoods-title", es.hoodsTitle);
    set("#hoods-intro", es.hoodsIntro);
    set("#sources-title", es.sourcesTitle);
    set("#sources-intro", es.sourcesIntro);
    set("#newest-title", es.newestTitle);
    set("#newest-intro", es.newestIntro);
    set("#cta-map", es.ctaMap);
    set("#cta-weekend", es.ctaWeekend);
    set("#cta-list", es.ctaList);
    var skip = document.querySelector("a.skip");
    if (skip) skip.textContent = es.skip;
    document.querySelectorAll("[data-tip-copy]").forEach(function (el) {
      var key = el.getAttribute("data-tip-copy");
      if (es.tips[key]) el.textContent = es.tips[key];
    });
    var base = basePath();
    document.querySelectorAll("a[href]").forEach(function (a) {
      var href = a.getAttribute("href") || "";
      if (a.hasAttribute("data-lang-switch")) return;
      if (href.charAt(0) !== "/") return;
      if (href.indexOf(base + "/es/") === 0 || href === base + "/es/") return;
      if (/\/(css|js|images|assets|data|vendor|favicon)/.test(href)) return;
      var rest = href.indexOf(base) === 0 ? href.slice(base.length) : href;
      if (rest.charAt(0) !== "/") rest = "/" + rest;
      a.setAttribute("href", base + "/es" + rest);
    });
    var brand = document.querySelector(".brand");
    if (brand && brand.tagName === "SUMMARY") {
      /* brand is a menu button; first logo link is in the footer */
    }
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = text;
    if (el.classList.contains("stat-value")) {
      el.classList.toggle("is-phrase", !/^\d[\d,]*$/.test(String(text).trim()));
    }
  }
  function bars(items, hrefFor) {
    var max = 0;
    items.forEach(function (it) { if (it.count > max) max = it.count; });
    return '<ul class="bar-list">' + items.map(function (it) {
      var pct = max ? Math.round((it.count / max) * 100) : 0;
      var label = esc(it.label);
      var name = hrefFor ? '<a href="' + esc(hrefFor(it)) + '">' + label + "</a>" : "<span>" + label + "</span>";
      var title = it.hint ? ' title="' + esc(it.hint) + '"' : "";
      return "<li" + title + ">" + name + '<span class="count">' + it.count + '</span><div class="bar" aria-hidden="true"><span style="width:' + pct + '%"></span></div></li>';
    }).join("") + "</ul>";
  }

  function wireTips() {
    var cards = document.querySelectorAll(".stat-card, .stats-panel");
    function closeAll(except) {
      cards.forEach(function (c) { if (c !== except) { c.classList.remove("is-open"); var b = c.querySelector(".stat-tip"); if (b) b.setAttribute("aria-expanded", "false"); } });
    }
    cards.forEach(function (card) {
      var btn = card.querySelector(".stat-tip");
      if (!btn) return;
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var open = !card.classList.contains("is-open");
        closeAll(card);
        card.classList.toggle("is-open", open);
        btn.setAttribute("aria-expanded", String(open));
        if (open) btn.focus();
      });
    });
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".stat-card, .stats-panel")) closeAll();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" || e.key === "Esc") closeAll();
    });
  }

  function showTrafficSoon() {
    setText("stat-traffic", t().comingSoon);
    var note = document.querySelector('[data-stat="traffic"] .stat-note');
    if (note) note.textContent = t().trafficSoon;
  }

  function loadTraffic() {
    var urls = [
      "https://chicasmapcom.goatcounter.com/counter/TOTAL.json",
      "https://chicasmapcom.goatcounter.com/counter/.json"
    ];
    function tryNext(i) {
      if (i >= urls.length) { showTrafficSoon(); return; }
      fetch(urls[i], { mode: "cors", credentials: "omit", cache: "no-store" }).then(function (r) {
        if (!r.ok) throw new Error("http");
        return r.json();
      }).then(function (j) {
        var n = j && (j.count_unique != null ? j.count_unique : j.count);
        if (n == null || n === "") throw new Error("empty");
        var num = String(n).replace(/[^\d]/g, "");
        if (!num) throw new Error("empty");
        setText("stat-traffic", Number(num).toLocaleString(isEs() ? "es" : "en"));
        var note = document.querySelector('[data-stat="traffic"] .stat-note');
        if (note) note.textContent = isEs() ? "Visitas únicas (contador público)" : "Unique visits (public counter)";
      }).catch(function () { tryNext(i + 1); });
    }
    tryNext(0);
  }

  function render(feed) {
    var copy = t();
    var locale = isEs() ? "es" : "en-US";
    var today = ctToday();
    var sales = bag(feed).filter(function (s) { return notEnded(s, today); });
    var wk = weekendRange(today);
    var weekend = sales.filter(function (s) { return overlaps(s, wk[0], wk[1]); });
    setText("stat-upcoming", String(sales.length));
    setText("stat-weekend", String(weekend.length));
    var weekendNote = document.querySelector('[data-stat="weekend"] .stat-note');
    if (weekendNote) weekendNote.textContent = copy.weekendRange.replace("{start}", formatDay(wk[0], locale)).replace("{end}", formatDay(wk[1], locale));
    var generated = feed && (feed.generated || feed.generated_at || feed.updated);
    var updated = formatStamp(generated, locale);
    setText("stats-updated", updated ? copy.updated.replace("{date}", updated) : copy.updatedUnknown);
    setText("stats-status", copy.loaded);

    var base = basePath();
    var esPrefix = isEs() ? "/es" : "";
    var hoodCounts = {};
    sales.forEach(function (s) {
      var area = ZIP_TO_AREA[zipOf(s)];
      var key = area ? area.slug : "other";
      if (!hoodCounts[key]) hoodCounts[key] = { area: area, count: 0 };
      hoodCounts[key].count += 1;
    });
    var hoodItems = Object.keys(hoodCounts).map(function (key) {
      var rec = hoodCounts[key];
      var label = rec.area ? (isEs() ? rec.area.nameEs : rec.area.name) : copy.otherArea;
      return { key: key, slug: rec.area && rec.area.slug, label: label, count: rec.count };
    }).sort(function (a, b) { return b.count - a.count || a.label.localeCompare(b.label); });
    var hoodBox = document.getElementById("stats-hoods");
    if (hoodBox) {
      hoodBox.innerHTML = hoodItems.length
        ? bars(hoodItems, function (it) { return it.slug ? base + esPrefix + "/garage-sales/" + it.slug + "/" : base + esPrefix + "/map/"; })
        : "<p class=\"stat-note\">" + esc(copy.emptyHoods) + "</p>";
    }

    var sourceOrder = ["facebook", "email", "nextdoor", "listings", "other"];
    var sourceCounts = { facebook: 0, email: 0, nextdoor: 0, listings: 0, other: 0 };
    sales.forEach(function (s) { sourceCounts[sourceBucket(s)] += 1; });
    var sourceItems = sourceOrder.map(function (key) {
      return { key: key, label: copy[key] || copy.otherSource, count: sourceCounts[key], hint: copy.sourceHint[key] };
    }).filter(function (it) { return it.key !== "other" || it.count > 0; });
    var sourceBox = document.getElementById("stats-sources");
    if (sourceBox) sourceBox.innerHTML = bars(sourceItems);

    var newest = sales.filter(function (s) { return addedMs(s) > 0; })
      .sort(function (a, b) { return addedMs(b) - addedMs(a); })
      .slice(0, 8);
    var newBox = document.getElementById("stats-newest");
    if (newBox) {
      if (!newest.length) {
        newBox.innerHTML = "<p class=\"stat-note\">" + esc(copy.emptySales) + "</p>";
      } else {
        newBox.innerHTML = '<ul class="sale-list">' + newest.map(function (s) {
          var id = saleId(s);
          var href = base + esPrefix + "/map/" + (id ? ("?sale=" + encodeURIComponent(id)) : "");
          var when = formatStamp(s.posted_at || s.date_verified, locale);
          var addr = String(s.address || "").replace(/,\s*TX.*$/i, "").trim();
          var meta = [when, addr, s.dates || s.date_start].filter(Boolean).join(" · ");
          return '<li><a href="' + esc(href) + '"><strong>' + esc(s.title || s.name || "Sale") + "</strong><div class=\"meta\">" + esc(meta) + "</div></a></li>";
        }).join("") + "</ul>";
      }
    }
  }

  applySpanishChrome();
  wireTips();
  setText("stats-status", t().loading);
  showTrafficSoon();
  loadTraffic();
  var url = basePath() + "/data/sales-clean.json?v=" + Date.now();
  fetch(url, { cache: "no-store" }).then(function (r) {
    if (!r.ok) throw new Error("http " + r.status);
    return r.json();
  }).then(render).catch(function () {
    setText("stats-status", t().loadError);
    var status = document.getElementById("stats-status");
    if (status) status.classList.add("error");
  });
})();
