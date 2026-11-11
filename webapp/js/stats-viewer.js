/* Public, read-only map stats. Counts come from the live sales feed only. */
(function (root) {
  var TZ = "America/Chicago";
  var SA = [29.4241, -98.4936];
  var SA_BOX = { south: 29.22, north: 29.68, west: -98.78, east: -98.22 };
  var AREAS = [
    { slug: "stone-oak", name: "Stone Oak", nameEs: "Stone Oak", zips: ["78258", "78259", "78260", "78261"], lat: 29.658, lon: -98.456 },
    { slug: "alamo-heights-midtown", name: "Alamo Heights & Midtown", nameEs: "Alamo Heights y Midtown", zips: ["78209", "78212", "78201", "78213", "78216"], lat: 29.485, lon: -98.468 },
    { slug: "north-central", name: "North Central & Shavano Park", nameEs: "Centro Norte y Shavano Park", zips: ["78230", "78231", "78232", "78248", "78217", "78247"], lat: 29.545, lon: -98.530 },
    { slug: "medical-center", name: "Medical Center", nameEs: "Centro Médico", zips: ["78229", "78240", "78249", "78238"], lat: 29.507, lon: -98.576 },
    { slug: "alamo-ranch-westover-hills", name: "Alamo Ranch & Westover Hills", nameEs: "Alamo Ranch y Westover Hills", zips: ["78245", "78251", "78250", "78252", "78253", "78254"], lat: 29.490, lon: -98.726 },
    { slug: "helotes", name: "Helotes & Leon Valley", nameEs: "Helotes y Leon Valley", zips: ["78023"], lat: 29.567, lon: -98.690 },
    { slug: "downtown-southtown", name: "Downtown & Southtown", nameEs: "Centro y Southtown", zips: ["78202", "78203", "78204", "78205", "78208", "78210", "78215"], lat: 29.416, lon: -98.489 },
    { slug: "west-side", name: "West Side", nameEs: "Lado Oeste", zips: ["78207", "78237", "78227", "78228"], lat: 29.425, lon: -98.545 },
    { slug: "southwest-lackland", name: "Southwest San Antonio & Lackland", nameEs: "Suroeste de San Antonio y Lackland", zips: ["78236", "78242"], lat: 29.387, lon: -98.616 },
    { slug: "south-side", name: "South Side", nameEs: "Lado Sur", zips: ["78211", "78214", "78221", "78223", "78224", "78225", "78226", "78264", "78112", "78073"], lat: 29.337, lon: -98.500 },
    { slug: "east-side", name: "East Side", nameEs: "Lado Este", zips: ["78218", "78219", "78220", "78222", "78244", "78263"], lat: 29.415, lon: -98.400 },
    { slug: "northeast-live-oak-converse", name: "Live Oak, Converse & Universal City", nameEs: "Live Oak, Converse y Universal City", zips: ["78233", "78239", "78109", "78148", "78150", "78234", "78133"], lat: 29.548, lon: -98.324 },
    { slug: "schertz-new-braunfels", name: "Schertz, Cibolo & New Braunfels", nameEs: "Schertz, Cibolo y New Braunfels", zips: ["78154", "78108", "78124", "78130", "78132", "78666", "78623", "78070"], lat: 29.570, lon: -98.270 },
    { slug: "boerne-hill-country", name: "Boerne & the Hill Country", nameEs: "Boerne y el Hill Country", zips: ["78006", "78015", "78009", "78255", "78256", "78257"], lat: 29.730, lon: -98.680 }
  ];
  var ZIP_TO_AREA = {};
  AREAS.forEach(function (a) { a.zips.forEach(function (z) { ZIP_TO_AREA[z] = a; }); });
  var DOW_NAME = { sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2, wed: 3, wednesday: 3, thu: 4, thur: 4, thurs: 4, thursday: 4, fri: 5, friday: 5, sat: 6, saturday: 6 };
  var MAX_LIST = 6;

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
      dateFmt: { year: "numeric", month: "short", day: "numeric" },
      weekendStartsDays: "Weekend starts in {n} days",
      weekendStartsTomorrow: "Weekend starts tomorrow",
      weekendStartsToday: "The weekend starts today",
      weekendHere: "The weekend is here",
      weekendWrapped: "This weekend’s sales have wrapped up",
      noWeekendSales: "No sales are on the map for this weekend yet.",
      openNone: "None are open right now. Chica only marks a sale open when posted hours include the current time.",
      aheadNone: "No remaining openings are on the calendar for this weekend.",
      listedToday: "Listed today, hours not posted",
      hoursUnknown: "Hours not posted",
      nextIn: "Next opening in {time}",
      nextAt: "Next opening {when}",
      nextNamed: "{when} — {title}",
      nextUntimed: "More sales are listed for {when} (hours not posted).",
      nextNone: "No more posted opening times remain this weekend.",
      andMore: "and {n} more on the weekend map",
      heatEmpty: "No weekend sales have a neighborhood tag yet.",
      outsideView: "Some sales sit outside this city view and are listed under Other area.",
      dayNames: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
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
      dateFmt: { year: "numeric", month: "short", day: "numeric" },
      weekendStartsDays: "El fin de semana empieza en {n} días",
      weekendStartsTomorrow: "El fin de semana empieza mañana",
      weekendStartsToday: "El fin de semana empieza hoy",
      weekendHere: "Ya es fin de semana",
      weekendWrapped: "Las ventas de este fin ya terminaron",
      noWeekendSales: "Todavía no hay ventas en el mapa para este fin de semana.",
      openNone: "Ninguna está abierta ahora. Chica solo marca una venta como abierta cuando el horario publicado incluye la hora actual.",
      aheadNone: "No quedan aperturas en el calendario de este fin.",
      listedToday: "En la lista de hoy, sin horario publicado",
      hoursUnknown: "Horario no publicado",
      nextIn: "Próxima apertura en {time}",
      nextAt: "Próxima apertura {when}",
      nextNamed: "{when} — {title}",
      nextUntimed: "Hay más ventas en la lista para {when} (sin horario publicado).",
      nextNone: "No quedan horarios de apertura publicados este fin.",
      andMore: "y {n} más en el mapa del fin de semana",
      heatEmpty: "Todavía no hay ventas de este fin con vecindario.",
      outsideView: "Algunas ventas quedan fuera de esta vista de la ciudad y están en Otra zona.",
      dayNames: ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"]
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
    countdownTitle: "Cuenta regresiva del fin de semana",
    countdownIntro: "Qué está abierto ahora, qué falta este viernes a domingo, y cuándo abre la próxima venta. Horarios del Centro.",
    openLabel: "Abiertas ahora",
    aheadLabel: "Todavía faltan este fin",
    heatmapTitle: "Este fin de semana por zona",
    heatmapIntro: "Vecindarios sombreados según cuántas ventas hay en el mapa este viernes a domingo. El rosa más oscuro significa más pines.",
    ctaMap: "Abrir el mapa",
    ctaWeekend: "Este fin de semana",
    ctaList: "Publicar una venta",
    skip: "Ir al contenido",
    tips: {
      upcoming: "Cuántas ventas del feed público aún no terminan. Si la fecha de cierre ya pasó en la hora del Centro, esa venta no cuenta. La fuente es el archivo en vivo de ventas del mapa.",
      weekend: "Cuántas de esas ventas próximas coinciden con el viernes, sábado o domingo de este fin (o del que viene, si hoy es de lunes a jueves). Las fechas se leen en la hora del Centro.",
      updated: "El día en que Chica armó el feed de ventas que ves en el mapa, mostrado en la hora del Centro. Si el feed solo trae una fecha, no inventamos la hora.",
      traffic: "Visitas únicas de los dos contadores públicos de GoatCounter del sitio, el actual y el anterior, sumadas. Si ninguno responde, verás “Próximamente” en vez de un número inventado.",
      hoods: "Las ventas próximas agrupadas por los mismos vecindarios del mapa, usando el código postal de la venta. Una venta sin código postal conocido entra en “Otra zona”.",
      sources: "Facebook, avisos por correo, Nextdoor y sitios públicos de anuncios, tomados del campo de fuente de cada venta. Chica no inventa estas categorías.",
      newest: "Las ventas con la fecha de alta o de revisión más reciente. Muchos listados no traen esa fecha; esos no aparecen aquí. El enlace abre la venta en el mapa.",
      countdown: "Abierta ahora significa que la venta cae en el calendario de hoy y Chica publicó un horario que incluye la hora actual del Centro. Las ventas sin horario no se marcan como abiertas. “Todavía faltan” son las ventas de este fin que aún no empiezan. La cuenta regresiva usa la próxima hora de apertura publicada. De lunes a jueves, este panel también dice cuándo llega el viernes.",
      heatmap: "Un mapa de calor del fin de semana, con los mismos vecindarios del mapa de Chica, según el código postal de cada venta y el feed en vivo. El tamaño y el color del círculo siguen el número de pines. Algunas ventas quedan fuera de esta vista de la ciudad y aparecen en Otra zona. El mapa usa la misma librería que el resto del sitio."
    }
  };

  var heatMapRef = null;
  var tickTimer = null;
  var lastFeed = null;

  function basePath() {
    if (typeof location === "undefined") return "";
    var p = location.pathname || "/";
    return p.indexOf("/Chicas-Map") === 0 ? "/Chicas-Map" : "";
  }
  function isEs() {
    if (typeof document === "undefined") return false;
    var p = (typeof location !== "undefined" && location.pathname) || "";
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
  /* CST (-06:00) except CDT (-05:00) from the 2nd Sunday of March to the 1st Sunday of November. */
  function ctOffset(iso) {
    var p = iso.split("-").map(Number);
    var y = p[0], m = p[1], d = p[2];
    function nthSunday(month, n) {
      var first = new Date(Date.UTC(y, month - 1, 1)).getUTCDay();
      return 1 + ((7 - first) % 7) + (n - 1) * 7;
    }
    var start = nthSunday(3, 2), end = nthSunday(11, 1);
    var dst = (m > 3 && m < 11) || (m === 3 && d >= start) || (m === 11 && d < end);
    return dst ? "-05:00" : "-06:00";
  }
  function atCT(iso, minutes) {
    var hh = pad(Math.floor(minutes / 60) % 24);
    var mm = pad(minutes % 60);
    var ms = Date.parse(iso + "T" + hh + ":" + mm + ":00" + ctOffset(iso));
    return isFinite(ms) ? ms : null;
  }
  function nowParts(now) {
    now = now || new Date();
    var iso = ctToday(now);
    var parts = { iso: iso, dow: dow(iso), hour: 0, minute: 0, second: 0, ms: now.getTime() };
    try {
      var fmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
      fmt.formatToParts(now).forEach(function (x) {
        if (x.type === "hour") parts.hour = Number(x.value);
        if (x.type === "minute") parts.minute = Number(x.value);
        if (x.type === "second") parts.second = Number(x.value);
      });
    } catch (e) {}
    parts.minutes = parts.hour * 60 + parts.minute;
    return parts;
  }

  function parseClock(h, mm, ap) {
    if (!ap) return null;
    h = Number(h) % 12;
    if (/^p/i.test(ap)) h += 12;
    return h * 60 + Number(mm || 0);
  }
  function parseRangeToken(str) {
    var s = String(str || "").replace(/both\s+days/ig, "").replace(/starting\s+at/ig, "").trim();
    if (!s) return null;
    var re = /(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?\s*(?:-|–|to)\s*(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/i;
    var m = s.match(re);
    if (m) {
      var endAp = m[6], startAp = m[3] || endAp;
      var start = parseClock(m[1], m[2], startAp);
      var end = parseClock(m[4], m[5], endAp || startAp);
      if (start == null) return null;
      return { start: start, end: end };
    }
    if (/starting/i.test(str)) {
      var one = String(str).match(/(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)/i);
      if (one) {
        var st = parseClock(one[1], one[2], one[3]);
        if (st != null) return { start: st, end: 24 * 60 - 1 };
      }
    }
    return null;
  }
  function expandDays(a, b) {
    var start = DOW_NAME[a], end = b != null ? DOW_NAME[b] : start;
    if (start == null) return [];
    if (end == null) end = start;
    var out = [];
    var i = start;
    for (var n = 0; n < 7; n++) {
      out.push(i);
      if (i === end) break;
      i = (i + 1) % 7;
    }
    return out;
  }
  /* Posted hours for one calendar day, or null when hours are missing or too messy to trust. */
  function parseHoursForDay(hours, iso) {
    var raw = String(hours || "").trim();
    if (!raw) return null;
    var day = dow(iso);
    var chunks = raw.split(/\s*[,;]\s*/);
    var dayed = [];
    var general = [];
    chunks.forEach(function (chunk) {
      var m = chunk.match(/^((?:(?:sun|mon|tue|wed|thu|fri|sat)[a-z]*)(?:\s*[-–]\s*(?:sun|mon|tue|wed|thu|fri|sat)[a-z]*)?(?:\s*,\s*(?:sun|mon|tue|wed|thu|fri|sat)[a-z]*(?:\s*[-–]\s*(?:sun|mon|tue|wed|thu|fri|sat)[a-z]*)?)*)\s+(.+)$/i);
      if (m) {
        var days = [];
        String(m[1]).replace(/(sun|mon|tue|wed|thu|fri|sat)[a-z]*(?:\s*[-–]\s*(sun|mon|tue|wed|thu|fri|sat)[a-z]*)?/ig, function (_, a, b) {
          expandDays(a.toLowerCase().slice(0, 3), b ? b.toLowerCase().slice(0, 3) : null).forEach(function (d) { days.push(d); });
          return "";
        });
        var range = parseRangeToken(m[2]);
        if (range && days.length) dayed.push({ days: days, range: range });
      } else {
        var g = parseRangeToken(chunk);
        if (g) general.push(g);
      }
    });
    if (dayed.length) {
      for (var i = 0; i < dayed.length; i++) {
        if (dayed[i].days.indexOf(day) !== -1) return dayed[i].range;
      }
      return null;
    }
    return general[0] || null;
  }

  function saleDayRange(sale) {
    var s = String(sale.date_start || sale.date_from || "").slice(0, 10);
    var e = String(sale.date_end || sale.date_to || sale.end_date || s).slice(0, 10);
    return [s, e || s];
  }
  function daysInRange(from, to) {
    var out = [];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) return out;
    var d = from;
    while (d <= to) { out.push(d); d = addDays(d, 1); }
    return out;
  }
  function windowsForSale(sale, weekend) {
    var range = saleDayRange(sale);
    var from = range[0] < weekend[0] ? weekend[0] : range[0];
    var to = (range[1] || range[0]) > weekend[1] ? weekend[1] : (range[1] || range[0]);
    var days = daysInRange(from, to);
    return days.map(function (iso) {
      var hrs = parseHoursForDay(sale.hours, iso);
      var startMs = hrs ? atCT(iso, hrs.start) : atCT(iso, 0);
      var endMs = hrs && hrs.end != null ? atCT(iso, hrs.end) : atCT(iso, 24 * 60 - 1);
      return { iso: iso, hours: hrs, startMs: startMs, endMs: endMs, timed: !!hrs };
    }).filter(function (w) { return w.startMs != null; });
  }
  function classifyWeekend(sales, now) {
    now = now || new Date();
    var parts = nowParts(now);
    var wk = weekendRange(parts.iso);
    var weekendSales = (sales || []).filter(function (s) { return overlaps(s, wk[0], wk[1]); });
    var open = [], ahead = [], listedToday = [], ended = [];
    var nextTimed = null, nextUntimed = null;
    weekendSales.forEach(function (s) {
      var wins = windowsForSale(s, wk);
      var isOpen = false, isAhead = false, isTodayUntimed = false, allEnded = wins.length > 0;
      wins.forEach(function (w) {
        if (w.timed && w.startMs <= parts.ms && parts.ms <= w.endMs) isOpen = true;
        if (w.timed && w.startMs > parts.ms) {
          isAhead = true;
          if (!nextTimed || w.startMs < nextTimed.ms) nextTimed = { ms: w.startMs, iso: w.iso, minutes: (w.hours && w.hours.start) || 0, sale: s };
        }
        if (!w.timed && w.iso === parts.iso) isTodayUntimed = true;
        if (!w.timed && w.iso >= parts.iso) {
          isAhead = true;
          var dayStart = w.iso > parts.iso ? w.startMs : null;
          if (w.iso > parts.iso && (!nextUntimed || dayStart < nextUntimed.ms)) nextUntimed = { ms: dayStart, iso: w.iso, sale: s };
        }
        if (w.timed && w.endMs >= parts.ms) allEnded = false;
        if (!w.timed && w.iso >= parts.iso) allEnded = false;
      });
      if (isOpen) open.push(s);
      else if (isTodayUntimed && !isAhead) listedToday.push(s);
      else if (isAhead) ahead.push(s);
      else ended.push(s);
    });
    function startKey(s) {
      var wins = windowsForSale(s, wk).filter(function (w) { return !w.timed || w.startMs > parts.ms; });
      var first = wins[0];
      if (!first) return "9";
      // Untimed days sort after posted times on the same date, so 9am comes before "hours not posted."
      return first.iso + "-" + (first.timed ? pad(first.hours.start) : "9999");
    }
    ahead.sort(function (a, b) { var ka = startKey(a), kb = startKey(b); return ka < kb ? -1 : ka > kb ? 1 : 0; });
    open.sort(function (a, b) { return String(a.title || "").localeCompare(String(b.title || "")); });
    return {
      weekend: wk,
      today: parts.iso,
      now: parts,
      sales: weekendSales,
      open: open,
      ahead: ahead,
      listedToday: listedToday,
      ended: ended,
      nextTimed: nextTimed,
      nextUntimed: nextUntimed
    };
  }
  function daysUntil(fromIso, toIso) {
    if (fromIso >= toIso) return 0;
    var n = 0, d = fromIso;
    while (d < toIso && n < 8) { d = addDays(d, 1); n += 1; }
    return n;
  }
  function weekendHeadline(state, copy) {
    copy = copy || t();
    if (!state.sales.length) return copy.noWeekendSales;
    var today = state.today, fri = state.weekend[0], sun = state.weekend[1];
    if (today < fri) {
      var n = daysUntil(today, fri);
      if (n === 1) return copy.weekendStartsTomorrow;
      return copy.weekendStartsDays.replace("{n}", String(n));
    }
    if (today === fri && !state.open.length && (state.ahead.length || state.listedToday.length)) return copy.weekendStartsToday;
    if (today > sun || (today === sun && !state.open.length && !state.ahead.length && !state.listedToday.length)) return copy.weekendWrapped;
    return copy.weekendHere;
  }
  function formatDuration(ms, copy) {
    if (ms < 0) ms = 0;
    var totalMin = Math.round(ms / 60000);
    var days = Math.floor(totalMin / (60 * 24));
    var hours = Math.floor((totalMin - days * 60 * 24) / 60);
    var mins = totalMin % 60;
    var es = copy === COPY.es;
    var bits = [];
    if (days) bits.push(es ? (days === 1 ? "1 día" : days + " días") : (days === 1 ? "1 day" : days + " days"));
    if (hours && days < 3) bits.push(es ? (hours === 1 ? "1 hora" : hours + " horas") : (hours === 1 ? "1 hour" : hours + " hours"));
    if (!days && (mins || !hours)) bits.push(es ? (mins === 1 ? "1 minuto" : mins + " minutos") : (mins === 1 ? "1 minute" : mins + " minutes"));
    return bits.join(es ? " " : " ");
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
  function coords(s) {
    var lat = Number(s.lat != null ? s.lat : s.latitude);
    var lon = Number(s.lon != null ? s.lon : s.lng != null ? s.lng : s.longitude);
    if (!isFinite(lat) || !isFinite(lon)) return null;
    return [lat, lon];
  }
  function inSaBox(lat, lon) {
    return lat >= SA_BOX.south && lat <= SA_BOX.north && lon >= SA_BOX.west && lon <= SA_BOX.east;
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
  function formatWhen(iso, minutes, locale, copy) {
    var day = formatDay(iso, locale);
    if (minutes == null) return day;
    var ms = atCT(iso, minutes);
    try {
      var clock = new Intl.DateTimeFormat(locale, { timeZone: TZ, hour: "numeric", minute: "2-digit" }).format(new Date(ms));
      return day + ", " + clock;
    } catch (e) {
      return day;
    }
  }

  function applySpanishChrome() {
    if (typeof document === "undefined" || !isEs()) return;
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
    set("#countdown-title", es.countdownTitle);
    set("#countdown-intro", es.countdownIntro);
    set("#ticker-open-label", es.openLabel);
    set("#ticker-ahead-label", es.aheadLabel);
    set("#heatmap-title", es.heatmapTitle);
    set("#heatmap-intro", es.heatmapIntro);
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
  }

  function setText(id, text) {
    if (typeof document === "undefined") return;
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
    if (typeof document === "undefined") return;
    var cards = document.querySelectorAll(".stat-card, .stats-panel");
    function closeAll(except) {
      cards.forEach(function (c) { if (c !== except) { c.classList.remove("is-open"); var b = c.querySelector(".stat-tip"); if (b) b.setAttribute("aria-expanded", "false"); } });
    }
    cards.forEach(function (card) {
      var btn = card.querySelector(".stat-tip");
      if (!btn || btn.getAttribute("data-wired") === "1") return;
      btn.setAttribute("data-wired", "1");
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
    if (!document.documentElement.getAttribute("data-stats-tips")) {
      document.documentElement.setAttribute("data-stats-tips", "1");
      document.addEventListener("click", function (e) {
        if (!e.target.closest(".stat-card, .stats-panel")) closeAll();
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" || e.key === "Esc") closeAll();
      });
    }
  }

  function showTrafficSoon() {
    setText("stat-traffic", t().comingSoon);
    var note = document.querySelector('[data-stat="traffic"] .stat-note');
    if (note) note.textContent = t().trafficSoon;
  }

  function loadTraffic() {
    // Adds the current counter (chicasmapcom) and the older one (chicasmap) together.
    var sites = ["chicasmapcom", "chicasmap"];
    function one(site) {
      return fetch("https://" + site + ".goatcounter.com/counter/TOTAL.json", { mode: "cors", credentials: "omit", cache: "no-store" }).then(function (r) {
        if (!r.ok) throw new Error("http");
        return r.json();
      }).then(function (j) {
        var n = j && (j.count_unique != null ? j.count_unique : j.count);
        var num = String(n == null ? "" : n).replace(/[^\d]/g, "");
        return num ? Number(num) : null;
      }).catch(function () { return null; });
    }
    Promise.all(sites.map(one)).then(function (vals) {
      var got = vals.filter(function (v) { return v != null; });
      if (!got.length) { showTrafficSoon(); return; }
      var total = got.reduce(function (a, v) { return a + v; }, 0);
      setText("stat-traffic", total.toLocaleString(isEs() ? "es" : "en"));
      var note = document.querySelector('[data-stat="traffic"] .stat-note');
      if (note) note.textContent = isEs() ? "Visitas únicas, ambos contadores sumados" : "Unique visits, both counters added together";
    });
  }

  function saleHref(s) {
    var base = basePath();
    var esPrefix = isEs() ? "/es" : "";
    var id = saleId(s);
    return base + esPrefix + "/map/" + (id ? ("?sale=" + encodeURIComponent(id)) : "");
  }
  function metaWhen(sale, state, copy, locale) {
    var wins = windowsForSale(sale, state.weekend);
    var parts = state.now;
    var upcoming = wins.filter(function (w) { return !w.timed || w.startMs > parts.ms; })[0];
    var current = wins.filter(function (w) { return w.timed && w.startMs <= parts.ms && parts.ms <= w.endMs; })[0];
    var w = current || upcoming || wins[0];
    if (!w) return sale.dates || sale.date_start || "";
    if (w.timed) return formatWhen(w.iso, w.hours.start, locale, copy);
    return formatDay(w.iso, locale) + " · " + copy.hoursUnknown;
  }
  function renderSaleList(items, state, copy, locale, emptyText) {
    if (!items.length) return '<p class="ticker-empty">' + esc(emptyText) + "</p>";
    var shown = items.slice(0, MAX_LIST);
    var more = items.length - shown.length;
    var base = basePath();
    var esPrefix = isEs() ? "/es" : "";
    var html = '<ul class="ticker-list">' + shown.map(function (s) {
      var addr = String(s.address || "").replace(/,\s*TX.*$/i, "").trim();
      var meta = [metaWhen(s, state, copy, locale), addr].filter(Boolean).join(" · ");
      return '<li><a href="' + esc(saleHref(s)) + '"><strong>' + esc(s.title || s.name || "Sale") + "</strong><div class=\"meta\">" + esc(meta) + "</div></a></li>";
    }).join("") + "</ul>";
    if (more > 0) html += '<a class="ticker-more" href="' + esc(base + esPrefix + "/map/?when=weekend") + '">' + esc(copy.andMore.replace("{n}", String(more))) + "</a>";
    return html;
  }
  function renderTicker(state) {
    var copy = t();
    var locale = isEs() ? "es" : "en-US";
    setText("ticker-status", weekendHeadline(state, copy));
    setText("ticker-open", String(state.open.length));
    setText("ticker-ahead", String(state.ahead.length + state.listedToday.length));
    var openBox = document.getElementById("ticker-open-list");
    var aheadBox = document.getElementById("ticker-ahead-list");
    if (openBox) openBox.innerHTML = renderSaleList(state.open, state, copy, locale, copy.openNone);
    var aheadItems = state.ahead.concat(state.listedToday);
    if (aheadBox) aheadBox.innerHTML = renderSaleList(aheadItems, state, copy, locale, copy.aheadNone);
    var nextEl = document.getElementById("ticker-next");
    if (!nextEl) return;
    if (state.nextTimed) {
      var when = formatWhen(state.nextTimed.iso, state.nextTimed.minutes, locale, copy);
      var title = state.nextTimed.sale.title || state.nextTimed.sale.name || "";
      var wait = formatDuration(state.nextTimed.ms - state.now.ms, copy);
      nextEl.innerHTML = esc(copy.nextIn.replace("{time}", wait)) + " · <strong>" + esc(copy.nextNamed.replace("{when}", when).replace("{title}", title)) + "</strong>";
    } else if (state.nextUntimed) {
      nextEl.textContent = copy.nextUntimed.replace("{when}", formatDay(state.nextUntimed.iso, locale));
    } else if (state.sales.length) {
      nextEl.textContent = copy.nextNone;
    } else {
      nextEl.textContent = "";
    }
  }

  function weekendHoods(weekendSales, copy) {
    var counts = {};
    weekendSales.forEach(function (s) {
      var area = ZIP_TO_AREA[zipOf(s)];
      var key = area ? area.slug : "other";
      if (!counts[key]) counts[key] = { area: area, count: 0, sales: [] };
      counts[key].count += 1;
      counts[key].sales.push(s);
    });
    return Object.keys(counts).map(function (key) {
      var rec = counts[key];
      var label = rec.area ? (isEs() ? rec.area.nameEs : rec.area.name) : copy.otherArea;
      var pts = rec.sales.map(coords).filter(Boolean);
      var lat, lon;
      if (rec.area) { lat = rec.area.lat; lon = rec.area.lon; }
      if (pts.length) {
        var inBox = pts.filter(function (p) { return inSaBox(p[0], p[1]); });
        var use = inBox.length ? inBox : pts;
        lat = use.reduce(function (a, p) { return a + p[0]; }, 0) / use.length;
        lon = use.reduce(function (a, p) { return a + p[1]; }, 0) / use.length;
      }
      return { key: key, slug: rec.area && rec.area.slug, label: label, count: rec.count, lat: lat, lon: lon, sales: rec.sales };
    }).sort(function (a, b) { return b.count - a.count || a.label.localeCompare(b.label); });
  }
  function heatColor(count, max) {
    var t = max ? count / max : 0;
    if (t >= 0.7) return "#c513af";
    if (t >= 0.4) return "#e23bc4";
    return "#ed65dc";
  }
  function loadLeaflet(cb) {
    if (root.L && root.L.map) { cb(); return; }
    var base = basePath();
    if (typeof document === "undefined") { cb(); return; }
    if (!document.querySelector("link[data-chica-leaflet]")) {
      var c = document.createElement("link");
      c.rel = "stylesheet";
      c.href = base + "/vendor/leaflet-1.9.4/leaflet.css";
      c.setAttribute("data-chica-leaflet", "1");
      document.head.appendChild(c);
    }
    if (!document.querySelector("script[data-chica-leaflet]")) {
      var s = document.createElement("script");
      s.src = base + "/vendor/leaflet-1.9.4/leaflet.js";
      s.async = true;
      s.setAttribute("data-chica-leaflet", "1");
      s.onload = function () { cb(); };
      s.onerror = function () { cb(); };
      document.head.appendChild(s);
    } else {
      var tries = 0;
      (function wait() {
        if ((root.L && root.L.map) || tries++ > 40) cb();
        else setTimeout(wait, 50);
      })();
    }
  }
  function renderHeatmap(items, copy) {
    var list = document.getElementById("stats-heat-list");
    var host = document.getElementById("stats-heatmap");
    var max = 0;
    items.forEach(function (it) { if (it.count > max) max = it.count; });
    var base = basePath();
    var esPrefix = isEs() ? "/es" : "";
    if (list) {
      if (!items.length) {
        list.innerHTML = '<p class="ticker-empty">' + esc(copy.heatEmpty) + "</p>";
      } else {
        list.innerHTML = '<ol class="heat-legend">' + items.map(function (it) {
          var t = max ? it.count / max : 0;
          var bg = "color-mix(in srgb, #c513af " + Math.max(14, Math.round(t * 46)) + "%, var(--card))";
          var href = it.slug ? base + esPrefix + "/garage-sales/" + it.slug + "/" : base + esPrefix + "/map/?when=weekend";
          return "<li><a href=\"" + esc(href) + "\" class=\"heat-row\" style=\"background:" + bg + "\"><span>" + esc(it.label) + "</span><span class=\"count\">" + it.count + "</span></a></li>";
        }).join("") + "</ol>";
        var outside = items.some(function (it) {
          return (it.sales || []).some(function (s) {
            var p = coords(s);
            return p && !inSaBox(p[0], p[1]);
          });
        });
        if (outside) list.innerHTML += '<p class="ticker-empty">' + esc(copy.outsideView) + "</p>";
      }
    }
    if (!host) return;
    loadLeaflet(function () {
      if (!root.L || !root.L.map) return;
      if (heatMapRef) {
        try { heatMapRef.remove(); } catch (e) {}
        heatMapRef = null;
      }
      host.innerHTML = "";
      var map = root.L.map(host, {
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: false,
        tap: true
      }).setView(SA, 10);
      root.L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
        attribution: "Tiles \u00a9 Esri",
        maxZoom: 16,
        referrerPolicy: "origin"
      }).addTo(map);
      var bounds = [];
      items.forEach(function (it) {
        if (it.lat == null || it.lon == null) return;
        if (!inSaBox(it.lat, it.lon) && it.key === "other") return;
        var size = 28 + Math.round((max ? it.count / max : 0) * 18);
        var color = heatColor(it.count, max);
        var icon = root.L.divIcon({
          className: "chica-heat-wrap",
          html: '<div class="chica-heat-dot" style="width:' + size + "px;height:" + size + "px;background:" + color + '">' + it.count + "</div>",
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2]
        });
        var href = it.slug ? base + esPrefix + "/garage-sales/" + it.slug + "/" : base + esPrefix + "/map/?when=weekend";
        var marker = root.L.marker([it.lat, it.lon], { icon: icon, title: it.label + " · " + it.count, keyboard: true });
        marker.on("click", function () { location.href = href; });
        marker.addTo(map);
        if (inSaBox(it.lat, it.lon)) bounds.push([it.lat, it.lon]);
      });
      function lock() {
        try { map.invalidateSize(false); } catch (e) {}
        if (bounds.length >= 2) {
          try {
            map.fitBounds(bounds, { padding: [28, 28], maxZoom: 11 });
            if (map.getZoom() < 9) map.setView(SA, 10);
          } catch (e) { map.setView(SA, 10); }
        } else {
          map.setView(SA, 10);
        }
      }
      lock();
      setTimeout(lock, 80);
      setTimeout(lock, 280);
      heatMapRef = map;
    });
  }

  function render(feed, now) {
    var copy = t();
    var locale = isEs() ? "es" : "en-US";
    var today = ctToday(now);
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
          var href = saleHref(s);
          var when = formatStamp(s.posted_at || s.date_verified, locale);
          var addr = String(s.address || "").replace(/,\s*TX.*$/i, "").trim();
          var meta = [when, addr, s.dates || s.date_start].filter(Boolean).join(" · ");
          return '<li><a href="' + esc(href) + '"><strong>' + esc(s.title || s.name || "Sale") + "</strong><div class=\"meta\">" + esc(meta) + "</div></a></li>";
        }).join("") + "</ul>";
      }
    }

    var state = classifyWeekend(weekend, now);
    renderTicker(state);
    renderHeatmap(weekendHoods(weekend, copy), copy);
    lastFeed = feed;
    if (tickTimer) clearInterval(tickTimer);
    if (typeof window !== "undefined") {
      var reduced = false;
      try { reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
      tickTimer = setInterval(function () {
        if (!lastFeed) return;
        var todaySales = bag(lastFeed).filter(function (s) { return notEnded(s, ctToday()); });
        var wkNow = weekendRange(ctToday());
        renderTicker(classifyWeekend(todaySales.filter(function (s) { return overlaps(s, wkNow[0], wkNow[1]); })));
      }, reduced ? 30000 : 1000);
    }
  }

  var api = {
    ctToday: ctToday,
    ctOffset: ctOffset,
    weekendRange: weekendRange,
    parseHoursForDay: parseHoursForDay,
    classifyWeekend: classifyWeekend,
    weekendHeadline: weekendHeadline,
    formatDuration: formatDuration,
    daysUntil: daysUntil,
    render: render
  };
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ChicaStats = api;

  if (typeof document !== "undefined") {
    applySpanishChrome();
    wireTips();
    setText("stats-status", t().loading);
    showTrafficSoon();
    loadTraffic();
    var url = basePath() + "/data/sales-clean.json?v=" + Date.now();
    fetch(url, { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("http " + r.status);
      return r.json();
    }).then(function (feed) { render(feed); }).catch(function () {
      setText("stats-status", t().loadError);
      var status = document.getElementById("stats-status");
      if (status) status.classList.add("error");
    });
  }
})(typeof window !== "undefined" ? window : globalThis);
