/* Shared America/Chicago date helpers for map quick filters (Today / This weekend). No dependencies. */
(function (root) {
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ctToday(now) {
    try {
      var parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit"
      }).formatToParts(now || new Date());
      var values = {};
      for (var i = 0; i < parts.length; i++) values[parts[i].type] = parts[i].value;
      return values.year + "-" + values.month + "-" + values.day;
    } catch (e) { var d = now || new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  }
  function addDays(iso, n) {
    var p = iso.split("-").map(Number), d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + n));
    return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate());
  }
  function dow(iso) { var p = iso.split("-").map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay(); }
  /* Upcoming or current Fri–Sun. Mon–Thu: the coming Fri–Sun. Fri/Sat/Sun: this weekend's Fri–Sun. */
  function weekendRange(today) {
    var d = dow(today);
    var toFri = d === 5 ? 0 : d === 6 ? -1 : d === 0 ? -2 : 5 - d;
    var fri = addDays(today, toFri);
    return [fri, addDays(fri, 2)];
  }
  function range(name, today) {
    today = today || ctToday();
    if (name === "today") return [today, today];
    if (name === "tomorrow") { var t = addDays(today, 1); return [t, t]; }
    if (name === "weekend") return weekendRange(today);
    return ["", ""];
  }
  /* Date status is based on San Antonio's calendar day, never the visitor's device timezone. */
  function status(sale, today) {
    today = today || ctToday();
    var start = String(sale.date_start || sale.date_from || "").slice(0, 10);
    var end = String(sale.date_end || sale.date_to || sale.end_date || start).slice(0, 10);
    if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(start)) return "";
    if (end && end < today) return "expired";
    if (start > today) return "upcoming";
    if (end === today && start < today) return "ends_today";
    return "today";
  }
  /* A sale matches when its start..end overlaps the range. Undated sales are kept. */
  function overlaps(sale, from, to) {
    var s = String(sale.date_start || sale.date_from || "").slice(0, 10);
    var e = String(sale.date_end || sale.date_to || sale.end_date || s).slice(0, 10);
    if (!s) return true;
    return s <= to && (e || s) >= from;
  }
  var api = { ctToday: ctToday, addDays: addDays, weekendRange: weekendRange, range: range, status: status, overlaps: overlaps };
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ChicaDates = api;
})(typeof window !== "undefined" ? window : globalThis);
