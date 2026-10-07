/* Alamo Atlas v3 — isolated CKAN reads. One dead feed cannot blank the desk. */
(function () {
  var OFF = "f36bb931-8fb4-481c-83d9-a3589108bb20";
  var ARR = "5bf98f1b-25c2-488c-aba7-082d7f8d38aa";
  var CFS = "9cb17985-ac16-49a6-ad69-6fe5ad8f2bf5";
  var CKAN = "https://data.sanantonio.gov/api/3/action/";
  var YTD = "2026-01-01";
  var WEEK = daysAgo(7);
  var TIMEOUT = 12000;
  var state = { zip: "", week: false, against: "", q: "", lang: "en" };

  var I18N = {
    en: {
      kicker: "Neighborhood desk · San Antonio",
      title: "What hit your ZIP",
      lede: "Public Open Data SA only. Offenses and arrests share a report ID. Calls for service stay a separate count. No street pins. No names.",
      zip_label: "Your ZIP",
      open_zip: "Open ZIP",
      use_loc: "Use my location",
      chip_week: "This week",
      chip_person: "Against person",
      chip_property: "Against property",
      offenses: "Offenses YTD",
      arrests: "Arrests YTD",
      calls: "CFS volume YTD",
      pick_zip: "Pick a ZIP to load the desk. City file has no street address.",
      search: "Search",
      hot_zips: "Hottest ZIPs, YTD offenses",
      areas: "Service areas",
      groups: "Offense groups",
      reports: "Offense reports",
      arrest_list: "Arrest reports in this filter",
      arrest_note: "Joined to offenses only when Report ID matches. Not a conviction.",
      honest: "City data. ZIP only. Not 911. Reports are not arrests. Arrests are not convictions. Calls are not reports."
    },
    es: {
      kicker: "Mesa del vecindario · San Antonio",
      title: "Qué llegó a tu ZIP",
      lede: "Solo Open Data SA. Ofensas y arrestos comparten Report ID. Llamadas van aparte. Sin calle. Sin nombres.",
      zip_label: "Tu ZIP",
      open_zip: "Abrir ZIP",
      use_loc: "Usar mi ubicación",
      chip_week: "Esta semana",
      chip_person: "Contra persona",
      chip_property: "Contra propiedad",
      offenses: "Ofensas YTD",
      arrests: "Arrestos YTD",
      calls: "Llamadas YTD",
      pick_zip: "Elige un ZIP. El archivo de la ciudad no trae calle.",
      search: "Buscar",
      hot_zips: "ZIPs con más ofensas YTD",
      areas: "Áreas de servicio",
      groups: "Grupos",
      reports: "Reportes de ofensa",
      arrest_list: "Arrestos en este filtro",
      arrest_note: "Se une a ofensas solo por Report ID. No es condena.",
      honest: "Datos de la ciudad. Solo ZIP. No es 911. Un reporte no es arresto. Un arresto no es condena. Una llamada no es reporte."
    }
  };

  function daysAgo(n) {
    var d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  }
  function $(id) { return document.getElementById(id); }
  function fmt(n) { return (Number(n) || 0).toLocaleString("en-US"); }
  function field(r, keys) {
    for (var i = 0; i < keys.length; i++) {
      if (r[keys[i]] != null && String(r[keys[i]]).trim() !== "") return String(r[keys[i]]);
    }
    return "";
  }
  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, function (c) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c];
    });
  }
  function zip5(s) { return String(s || "").replace(/\D/g, "").slice(0, 5); }
  function ckanErr(data) {
    var e = data && data.error;
    if (!e) return "CKAN error";
    if (typeof e === "string") return e;
    return e.message || e.info || (Array.isArray(e.__type) ? e.__type.join(" ") : "CKAN error");
  }
  function settle(p) {
    return p.then(function (v) { return { ok: true, v: v }; }).catch(function (e) { return { ok: false, e: e }; });
  }
  function timedGet(url) {
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var t = setTimeout(function () { if (ctrl) ctrl.abort(); }, TIMEOUT);
    return fetch(url, ctrl ? { signal: ctrl.signal } : {}).then(function (res) {
      if (!res.ok) throw new Error("Open Data SA " + res.status);
      return res.json();
    }).finally(function () { clearTimeout(t); });
  }

  function applyLang() {
    var pack = I18N[state.lang] || I18N.en;
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var k = el.getAttribute("data-i18n");
      if (pack[k]) el.textContent = pack[k];
    });
    var hon = $("atlas-honest");
    if (hon) hon.textContent = pack.honest;
    var btn = $("atlas-lang");
    if (btn) {
      btn.textContent = state.lang === "en" ? "ES" : "EN";
      btn.setAttribute("aria-pressed", state.lang === "es" ? "true" : "false");
    }
    document.documentElement.lang = state.lang;
  }

  function sql(q) {
    return timedGet(CKAN + "datastore_search_sql?sql=" + encodeURIComponent(q)).then(function (data) {
      if (!data || !data.success) throw new Error(ckanErr(data));
      return data.result.records || [];
    });
  }

  function searchRes(resource, q) {
    var url = CKAN + "datastore_search?resource_id=" + resource + "&limit=25&sort=" + encodeURIComponent("DateTime desc");
    if (q) url += "&q=" + encodeURIComponent(q);
    return timedGet(url).then(function (data) {
      if (!data || !data.success) throw new Error(ckanErr(data));
      return { total: data.result.total || 0, records: data.result.records || [] };
    });
  }

  function dateStart() { return state.week ? WEEK : YTD; }

  function whereOff() {
    var w = ' WHERE "Report_Date" >= \'' + dateStart() + "'";
    if (state.zip) w += ' AND "Zip_Code" = \'' + state.zip + "'";
    if (state.against === "PERSON") w += ' AND "NIBRS_Crime_Against" = \'PERSON\'';
    if (state.against === "PROPERTY") w += ' AND "NIBRS_Crime_Against" = \'PROPERTY\'';
    return w;
  }

  function countSql(resource, zipCol, dateCol) {
    var w = ' WHERE "' + dateCol + '" >= \'' + dateStart() + "'";
    if (state.zip) w += ' AND "' + zipCol + '" = \'' + state.zip + "'";
    return 'SELECT count(*) as n FROM "' + resource + '"' + w;
  }

  function setStatus(msg, isErr) {
    var el = $("atlas-status");
    if (!el) return;
    el.textContent = msg || "";
    el.style.color = isErr ? "#c45c4a" : "";
  }

  function paintCount(id, part) {
    var el = $(id);
    if (!el) return;
    if (!part || !part.ok) { el.textContent = "—"; return; }
    var n = part.v && part.v[0] && part.v[0].n;
    el.textContent = n == null ? "—" : fmt(n);
  }

  function renderBars(el, rows, key, nkey, btnClass) {
    if (!el) return;
    if (!rows || !rows.length) { el.innerHTML = '<li class="muted">No rows.</li>'; return; }
    var max = Number(rows[0][nkey]) || 1;
    el.innerHTML = rows.map(function (r) {
      var n = Number(r[nkey]) || 0;
      var pct = Math.max(6, Math.round((n / max) * 100));
      var label = String(r[key] || "—");
      var zip = zip5(label);
      var inner = '<span class="mono">' + esc(label) + '</span><span class="bar"><i style="width:' + pct + '%"></i></span><span class="muted mono">' + fmt(n) + "</span>";
      if (btnClass) {
        return "<li><button type=\"button\" class=\"" + btnClass + '" data-zip="' + zip + '">' + inner + "</button></li>";
      }
      return "<li style=\"display:grid;grid-template-columns:1fr auto;gap:.6rem\"><span>" + esc(label) + '</span><span class="mono muted">' + fmt(n) + "</span></li>";
    }).join("");
  }

  function renderGroupsMini(rows) {
    var el = $("atlas-top-groups");
    if (!el) return;
    if (!rows || !rows.length) { el.innerHTML = ""; return; }
    var top = rows.slice(0, 5);
    var rest = rows.slice(5).reduce(function (s, r) { return s + (Number(r.n) || 0); }, 0);
    el.innerHTML = top.map(function (r) {
      return '<span class="gchip">' + esc(r.grp || "Other") + " · " + fmt(r.n) + "</span>";
    }).join("") + (rest ? '<span class="gchip">Other · ' + fmt(rest) + "</span>" : "");
  }

  function renderOffenses(pack) {
    var el = $("atlas-reports");
    var meta = $("atlas-reports-meta");
    if (!pack) {
      if (meta) meta.textContent = "Offense list unavailable this pass.";
      if (el) el.innerHTML = '<p class="muted">Could not load offense rows.</p>';
      return;
    }
    if (meta) meta.textContent = fmt(pack.total) + " published offense rows in this search window · showing latest 25";
    if (!el) return;
    if (!pack.records.length) { el.innerHTML = '<p class="muted">No matching offense reports.</p>'; return; }
    el.innerHTML = pack.records.map(function (r) {
      var id = field(r, ["Report_ID"]);
      var name = field(r, ["NIBRS_Code_Name"]);
      var group = field(r, ["NIBRS_Group"]);
      var against = field(r, ["NIBRS_Crime_Against"]);
      var zip = field(r, ["Zip_Code"]);
      var area = field(r, ["Service_Area"]);
      var date = field(r, ["Report_Date"]);
      var person = against === "PERSON";
      return (
        '<article class="row" style="border-left-color:' + (person ? "#8b2e24" : "#c45c4a") + '">' +
        "<h3>" + esc(name || "Unnamed offense") + "</h3>" +
        '<div class="meta"><span>' + esc(date) + "</span><span>" + esc(zip) + "</span><span>" + esc(area) + "</span><span>" + esc(group) + "</span></div>" +
        '<div class="rid">' + esc(id) + " · not an arrest</div>" +
        "<details><summary>Published fields</summary>Against " + esc(against || "—") + ". ZIP-level only. No street in the City file.</details>" +
        "</article>"
      );
    }).join("");
  }

  function renderArrests(pack) {
    var el = $("atlas-arrests");
    if (!el) return;
    if (!pack) { el.innerHTML = '<p class="muted">Arrest list unavailable this pass.</p>'; return; }
    if (!pack.records.length) { el.innerHTML = '<p class="muted">No matching arrest rows.</p>'; return; }
    el.innerHTML = pack.records.map(function (r) {
      return (
        '<article class="row">' +
        "<h3>" + esc(field(r, ["Offense"]) || "Arrest") + "</h3>" +
        '<div class="meta"><span>' + esc(field(r, ["Report_Date"])) + "</span><span>" +
        esc(field(r, ["Zip_Code"])) + "</span><span>" + esc(field(r, ["Service_Area"])) +
        "</span><span>" + esc(field(r, ["Severity"])) + "</span></div>" +
        '<div class="rid">' + esc(field(r, ["Report_ID"])) + " · person token " + esc(field(r, ["Person"])) + " · not a conviction</div>" +
        "</article>"
      );
    }).join("");
  }

  function loadCitywide() {
    return Promise.all([
      settle(sql('SELECT "Zip_Code" as zip, count(*) as n FROM "' + OFF + '" WHERE "Report_Date" >= \'' + YTD + "' AND \"Zip_Code\" IS NOT NULL GROUP BY \"Zip_Code\" ORDER BY n DESC LIMIT 12")),
      settle(sql('SELECT "Service_Area" as area, count(*) as n FROM "' + OFF + '" WHERE "Report_Date" >= \'' + YTD + "' GROUP BY \"Service_Area\" ORDER BY n DESC")),
      settle(sql('SELECT "NIBRS_Group" as grp, count(*) as n FROM "' + OFF + '" WHERE "Report_Date" >= \'' + YTD + "' GROUP BY \"NIBRS_Group\" ORDER BY n DESC LIMIT 8"))
    ]).then(function (parts) {
      if (parts[0].ok) renderBars($("atlas-zips"), parts[0].v, "zip", "n", "atlas-zip-btn");
      else renderBars($("atlas-zips"), [], "zip", "n", "atlas-zip-btn");
      if (parts[1].ok) renderBars($("atlas-areas"), parts[1].v, "area", "n", "");
      if (parts[2].ok) renderBars($("atlas-groups"), parts[2].v, "grp", "n", "");
    });
  }

  function loadDesk() {
    var q = state.q || state.zip || "";
    setStatus("Loading Open Data SA…");
    var cfsSql = countSql(CFS, "Postal_Code", "Response_Date");
    return Promise.all([
      settle(sql(countSql(OFF, "Zip_Code", "Report_Date"))),
      settle(sql(countSql(ARR, "Zip_Code", "Report_Date"))),
      settle(sql(cfsSql)),
      settle(sql('SELECT "NIBRS_Group" as grp, count(*) as n FROM "' + OFF + '"' + whereOff() + ' GROUP BY "NIBRS_Group" ORDER BY n DESC LIMIT 8')),
      settle(searchRes(OFF, q)),
      settle(searchRes(ARR, q))
    ]).then(function (parts) {
      paintCount("c-off", parts[0]);
      paintCount("c-arr", parts[1]);
      paintCount("c-cfs", parts[2]);
      if (parts[3].ok) renderGroupsMini(parts[3].v);
      renderOffenses(parts[4].ok ? parts[4].v : null);
      renderArrests(parts[5].ok ? parts[5].v : null);
      var area = $("atlas-area");
      if (area) {
        area.textContent = state.zip
          ? ("ZIP " + state.zip + (state.week ? " · this week" : " · year to date") + ". Offenses ≠ arrests ≠ calls.")
          : I18N[state.lang].pick_zip;
      }
      var failed = parts.filter(function (p) { return !p.ok; }).length;
      if (failed && failed < 6) setStatus("Open Data SA · " + (6 - failed) + "/6 feeds · CC-BY · not 911");
      else if (failed === 6) setStatus("Open Data SA did not answer. Hard refresh and retry.", true);
      else setStatus("Open Data SA · CC-BY · as-is · not 911");
    });
  }

  function setZip(z) {
    state.zip = zip5(z);
    var input = $("atlas-zip");
    if (input) input.value = state.zip;
    try { localStorage.setItem("atlas-zip", state.zip); } catch (e) {}
    return loadDesk();
  }

  function boot() {
    applyLang();
    try {
      var saved = localStorage.getItem("atlas-zip");
      if (saved) state.zip = zip5(saved);
    } catch (e) {}
    if (state.zip && $("atlas-zip")) $("atlas-zip").value = state.zip;

    loadCitywide();
    loadDesk();

    $("atlas-zip-form").addEventListener("submit", function (e) {
      e.preventDefault();
      setZip($("atlas-zip").value);
    });
    $("atlas-search").addEventListener("submit", function (e) {
      e.preventDefault();
      state.q = String($("atlas-q").value || "").trim();
      loadDesk();
    });
    $("atlas-lang").addEventListener("click", function () {
      state.lang = state.lang === "en" ? "es" : "en";
      applyLang();
    });
    $("atlas-geo").addEventListener("click", function () {
      if (!navigator.geolocation) { setStatus("No geolocation on this device.", true); return; }
      setStatus("Getting location…");
      navigator.geolocation.getCurrentPosition(function (pos) {
        var lat = pos.coords.latitude, lon = pos.coords.longitude;
        fetch("https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=" + lat + "&lon=" + lon, {
          headers: { Accept: "application/json" }
        }).then(function (r) { return r.json(); }).then(function (j) {
          var z = zip5(j && j.address && (j.address.postcode || ""));
          if (!z) throw new Error("No ZIP from location");
          return setZip(z);
        }).catch(function (err) { setStatus("Could not resolve ZIP. Type it. " + (err.message || ""), true); });
      }, function () { setStatus("Location blocked. Type the ZIP.", true); }, { timeout: 8000 });
    });

    document.addEventListener("click", function (e) {
      var t = e.target && e.target.closest && e.target.closest(".atlas-zip-btn, .chip");
      if (!t) return;
      if (t.classList.contains("chip")) {
        var chip = t.getAttribute("data-chip");
        if (chip === "week") {
          state.week = !state.week;
          t.setAttribute("aria-pressed", state.week ? "true" : "false");
        } else if (chip === "person" || chip === "property") {
          var next = chip === "person" ? "PERSON" : "PROPERTY";
          state.against = state.against === next ? "" : next;
          document.querySelectorAll('[data-chip="person"],[data-chip="property"]').forEach(function (c) {
            var on = (c.getAttribute("data-chip") === "person" && state.against === "PERSON") ||
              (c.getAttribute("data-chip") === "property" && state.against === "PROPERTY");
            c.setAttribute("aria-pressed", on ? "true" : "false");
          });
        } else {
          state.q = t.getAttribute("aria-pressed") === "true" ? "" : chip;
          t.setAttribute("aria-pressed", state.q ? "true" : "false");
          if ($("atlas-q")) $("atlas-q").value = state.q;
        }
        loadDesk();
        return;
      }
      var z = t.getAttribute("data-zip");
      if (z) setZip(z);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
