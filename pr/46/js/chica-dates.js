/* Shared America/Chicago date helpers for map quick filters (Today / This weekend). No dependencies. */
(function (root) {
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ctToday(now) {
    try {
      return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(now || new Date());
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
  /* A sale matches when its start..end overlaps the range. Undated sales are kept. */
  function overlaps(sale, from, to) {
    var s = String(sale.date_start || sale.date_from || "").slice(0, 10);
    var e = String(sale.date_end || sale.date_to || sale.end_date || s).slice(0, 10);
    if (!s) return true;
    return s <= to && (e || s) >= from;
  }
  var api = { ctToday: ctToday, addDays: addDays, weekendRange: weekendRange, range: range, overlaps: overlaps };
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ChicaDates = api;
})(typeof window !== "undefined" ? window : globalThis);
