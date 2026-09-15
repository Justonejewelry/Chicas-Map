/* Alamo Atlas on Chica's Map — Open Data SA offense reports (browser, CORS *). */
(function () {
  var RESOURCE = "f36bb931-8fb4-481c-83d9-a3589108bb20";
  var CKAN = "https://data.sanantonio.gov/api/3/action/";
  var YTD = "2026-01-01";

  function $(id) {
    return document.getElementById(id);
  }

  function fmt(n) {
    n = Number(n) || 0;
    return n.toLocaleString("en-US");
  }

  function field(r, keys) {
    for (var i = 0; i < keys.length; i++) {
      if (r[keys[i]] != null && String(r[keys[i]]).trim() !== "") return String(r[keys[i]]);
    }
    return "";
  }

  function sql(q) {
    return fetch(CKAN + "datastore_search_sql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sql: q }),
    }).then(function (res) {
      if (!res.ok) throw new Error("Open Data SA " + res.status);
      return res.json();
    }).then(function (data) {
      if (!data || !data.success) throw new Error((data && data.error && data.error.message) || "CKAN error");
      return data.result.records || [];
    });
  }

  function searchReports(q) {
    var url = CKAN + "datastore_search?resource_id=" + RESOURCE + "&limit=40&sort=" + encodeURIComponent("DateTime desc");
    if (q) url += "&q=" + encodeURIComponent(q);
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error("Open Data SA " + res.status);
      return res.json();
    }).then(function (data) {
      if (!data || !data.success) throw new Error("CKAN error");
      return {
        total: data.result.total || 0,
        records: data.result.records || [],
      };
    });
  }

  function zipSql() {
    return (
      'SELECT "Zip_Code" as zip, count(*) as n FROM "' +
      RESOURCE +
      '" WHERE "Report_Date" >= \'' +
      YTD +
      "' AND \"Zip_Code\" IS NOT NULL GROUP BY \"Zip_Code\" ORDER BY n DESC LIMIT 12"
    );
  }

  function groupSql() {
    return (
      'SELECT "NIBRS_Group" as grp, count(*) as n FROM "' +
      RESOURCE +
      '" WHERE "Report_Date" >= \'' +
      YTD +
      "' GROUP BY \"NIBRS_Group\" ORDER BY n DESC LIMIT 8"
    );
  }

  function totalSql() {
    return 'SELECT count(*) as n FROM "' + RESOURCE + '" WHERE "Report_Date" >= \'' + YTD + "'";
  }

  function renderZips(rows) {
    var el = $("atlas-zips");
    if (!el) return;
    if (!rows.length) {
      el.innerHTML = '<p class="text-sm text-muted">No ZIP totals yet.</p>';
      return;
    }
    var max = Number(rows[0].n) || 1;
    el.innerHTML = rows
      .map(function (r) {
        var n = Number(r.n) || 0;
        var pct = Math.max(6, Math.round((n / max) * 100));
        var zip = String(r.zip || "").replace(/\D/g, "").slice(0, 5);
        return (
          '<li class="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3">' +
          '<button type="button" class="atlas-zip text-left font-display text-sm font-bold tabular-nums" data-zip="' +
          zip +
          '">' +
          zip +
          "</button>" +
          '<span class="h-2 overflow-hidden rounded-full bg-pine-soft"><span class="block h-2 rounded-full bg-pine" style="width:' +
          pct +
          '%"></span></span>' +
          '<span class="text-sm tabular-nums text-muted">' +
          fmt(n) +
          "</span>" +
          "</li>"
        );
      })
      .join("");
  }

  function renderGroups(rows) {
    var el = $("atlas-groups");
    if (!el) return;
    el.innerHTML = rows
      .map(function (r) {
        return (
          "<li class=\"flex items-baseline justify-between gap-3 rounded-xl bg-bg px-4 py-3 ring-1 ring-line\">" +
          '<span class="text-sm font-semibold">' +
          String(r.grp || "Ungrouped") +
          "</span>" +
          '<span class="text-sm tabular-nums text-muted">' +
          fmt(r.n) +
          "</span>" +
          "</li>"
        );
      })
      .join("");
  }

  function renderReports(pack, q) {
    var el = $("atlas-reports");
    var meta = $("atlas-reports-meta");
    if (!el) return;
    var recs = pack.records || [];
    if (meta) {
      meta.textContent = q
        ? fmt(recs.length) + " matching · search uses published fields"
        : fmt(pack.total) + " published rows · showing latest";
    }
    if (!recs.length) {
      el.innerHTML = '<p class="text-sm text-muted">No matching reports in this window.</p>';
      return;
    }
    el.innerHTML = recs
      .map(function (r) {
        var id = field(r, ["Report_ID", "report_id"]);
        var name = field(r, ["NIBRS_Code_Name", "nibrs_code_name"]);
        var group = field(r, ["NIBRS_Group", "nibrs_group"]);
        var against = field(r, ["NIBRS_Crime_Against", "nibrs_crime_against"]);
        var zip = field(r, ["Zip_Code", "zip_code"]);
        var area = field(r, ["Service_Area", "service_area"]);
        var date = field(r, ["Report_Date", "report_date"]);
        var dt = field(r, ["DateTime", "datetime"]);
        return (
          '<article class="rounded-2xl bg-paper p-5 ring-1 ring-line">' +
          '<p class="text-[0.65rem] font-bold tracking-[0.14em] text-pine-mid uppercase">' +
          (group || "Offense") +
          (against ? " · " + against : "") +
          "</p>" +
          '<h3 class="mt-1 font-display text-lg font-bold">' +
          (name || "Unnamed offense") +
          "</h3>" +
          '<dl class="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">' +
          cell("Report ID", id) +
          cell("Report date", date) +
          cell("DateTime", dt) +
          cell("ZIP", zip) +
          cell("Service area", area) +
          cell("Against", against) +
          "</dl>" +
          "</article>"
        );
      })
      .join("");
  }

  function cell(label, value) {
    return (
      '<div class="min-w-0"><dt class="text-[10px] uppercase tracking-[0.14em] text-muted">' +
      label +
      '</dt><dd class="mt-0.5 break-words">' +
      (value || "—") +
      "</dd></div>"
    );
  }

  function loadStats() {
    return Promise.all([sql(totalSql()), sql(zipSql()), sql(groupSql())]).then(function (parts) {
      var total = parts[0][0] && parts[0][0].n;
      var totEl = $("atlas-total");
      if (totEl) totEl.textContent = fmt(total);
      renderZips(parts[1]);
      renderGroups(parts[2]);
    });
  }

  function loadReports(q) {
    return searchReports(q).then(function (pack) {
      renderReports(pack, q);
    });
  }

  function setStatus(msg, isErr) {
    var el = $("atlas-status");
    if (!el) return;
    el.textContent = msg || "";
    el.className = "text-sm " + (isErr ? "text-red-600" : "text-muted");
  }

  function boot() {
    setStatus("Loading Open Data SA…");
    Promise.all([loadStats(), loadReports("")])
      .then(function () {
        setStatus("Year to date from SAPD offenses via Open Data SA. CC-BY. As-is. Not 911.");
      })
      .catch(function (err) {
        setStatus(String(err && err.message ? err.message : err), true);
      });

    var form = $("atlas-search");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var input = $("atlas-q");
        var q = input ? String(input.value || "").trim() : "";
        setStatus("Searching…");
        loadReports(q)
          .then(function () {
            setStatus(q ? "Name search: " + q : "Latest published reports.");
          })
          .catch(function (err) {
            setStatus(String(err && err.message ? err.message : err), true);
          });
      });
    }

    document.addEventListener("click", function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      var btn = t.closest(".atlas-zip");
      if (!btn) return;
      var zip = btn.getAttribute("data-zip") || "";
      var input = $("atlas-q");
      if (input) input.value = zip;
      setStatus("ZIP " + zip + "…");
      loadReports(zip).catch(function (err) {
        setStatus(String(err && err.message ? err.message : err), true);
      });
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
