/* Atlas industry packet — counts only. pack = apt | hoa */
(function () {
  var OFF = "f36bb931-8fb4-481c-83d9-a3589108bb20";
  var ARR = "5bf98f1b-25c2-488c-aba7-082d7f8d38aa";
  var CFS = "9cb17985-ac16-49a6-ad69-6fe5ad8f2bf5";
  var CKAN = "https://data.sanantonio.gov/api/3/action/datastore_search_sql?sql=";
  var YTD = "2026-01-01";
  var weekOnly = false;
  var pack = (document.body && document.body.getAttribute("data-pack")) || "apt";
  var STORE = "atlas-pack-" + pack;

  function daysAgo(n) {
    var d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  }
  function $(id) { return document.getElementById(id); }
  function fmt(n) { return (Number(n) || 0).toLocaleString("en-US"); }
  function zipsFrom(text) {
    var seen = {};
    return String(text || "").split(/[^0-9]+/).map(function (z) { return z.slice(0, 5); }).filter(function (z) {
      if (z.length !== 5 || seen[z]) return false;
      seen[z] = 1;
      return true;
    }).slice(0, 10);
  }
  function sql(q) {
    var ctrl = new AbortController();
    var t = setTimeout(function () { ctrl.abort(); }, 12000);
    return fetch(CKAN + encodeURIComponent(q), { signal: ctrl.signal }).then(function (r) {
      if (!r.ok) throw new Error("Open Data SA " + r.status);
      return r.json();
    }).then(function (d) {
      if (!d.success) throw new Error("CKAN error");
      return (d.result.records && d.result.records[0] && d.result.records[0].n) || 0;
    }).finally(function () { clearTimeout(t); });
  }
  function countSql(res, zipCol, dateCol, zip, start) {
    return 'SELECT count(*) as n FROM "' + res + '" WHERE "' + dateCol + '" >= \'' + start + "' AND \"" + zipCol + "\" = '" + zip + "'";
  }
  function persist() {
    try {
      localStorage.setItem(STORE, JSON.stringify({ p: $("prop").value, z: $("zips").value }));
    } catch (e) {}
  }
  function restore() {
    try {
      var s = JSON.parse(localStorage.getItem(STORE) || "{}");
      if (s.p) $("prop").value = s.p;
      if (s.z) $("zips").value = s.z;
    } catch (e) {}
  }
  function load() {
    persist();
    var list = zipsFrom($("zips").value);
    var start = weekOnly ? daysAgo(7) : YTD;
    var name = $("prop").value || (pack === "hoa" ? "Association" : "Property");
    $("status").textContent = list.length ? "Loading Open Data SA…" : "Add at least one 5-digit ZIP.";
    $("headline").textContent = name + " · " + (weekOnly ? "last 7 days" : "year to date") + " · " + new Date().toLocaleDateString("en-US");
    $("rows").innerHTML = "";
    if (!list.length) return;
    Promise.all(list.map(function (zip) {
      return Promise.all([
        sql(countSql(OFF, "Zip_Code", "Report_Date", zip, start)).catch(function () { return null; }),
        sql(countSql(ARR, "Zip_Code", "Report_Date", zip, start)).catch(function () { return null; }),
        sql(countSql(CFS, "Postal_Code", "Response_Date", zip, start)).catch(function () { return null; })
      ]).then(function (n) {
        return { zip: zip, o: n[0], a: n[1], c: n[2] };
      });
    })).then(function (rows) {
      $("rows").innerHTML = rows.map(function (r) {
        return "<tr><td>" + r.zip + "</td><td>" + (r.o == null ? "—" : fmt(r.o)) + "</td><td>" +
          (r.a == null ? "—" : fmt(r.a)) + "</td><td>" + (r.c == null ? "—" : fmt(r.c)) + "</td></tr>";
      }).join("");
      $("note").textContent = "Three different City files. Do not add them together. Do not treat this as a block-level crime score.";
      $("status").textContent = "Open Data SA · CC-BY · not 911";
    }).catch(function (e) {
      $("status").textContent = String(e.message || e);
    });
  }
  restore();
  $("load").addEventListener("click", load);
  $("print").addEventListener("click", function () { persist(); window.print(); });
  $("week").addEventListener("click", function () {
    weekOnly = !weekOnly;
    $("week").textContent = weekOnly ? "Year to date" : "This week only";
    load();
  });
})();
