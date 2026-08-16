/** Merge preferred / gold-star sellers into the live city feed. */
(function () {
  async function mergePreferred(city, feed) {
    if (!feed) return feed;
    try {
      const res = await fetch("data/preferred.json?t=" + Date.now(), { cache: "no-store" });
      if (!res.ok) return feed;
      const data = await res.json();
      const add = (data && data.preferred) || [];
      if (!add.length) return feed;

      const norm = (s) =>
        String(s || "")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");
      const seen = new Set(
        (feed.public || []).map(
          (p) =>
            (p.external_id || "") +
            "|" +
            norm(p.address) +
            "|" +
            (p.start_date || p.date_from || p.end_date || "")
        )
      );

      const extras = [];
      for (let i = 0; i < add.length; i++) {
        const p = add[i];
        if (!p || typeof p !== "object") continue;
        const k =
          (p.external_id || "") +
          "|" +
          norm(p.address) +
          "|" +
          (p.start_date || p.date_from || p.end_date || "");
        if (seen.has(k)) continue;
        seen.add(k);
        const copy = Object.assign({}, p);
        if (copy.boost === true || copy.preferred === true) {
          copy.boost = true;
          if (copy.boost_until) copy.boost_until = String(copy.boost_until).slice(0, 10);
        }
        extras.push(copy);
      }
      if (!extras.length) return feed;
      const merged = extras.concat(feed.public || []);
      return Object.assign({}, feed, {
        public: merged,
        total_locations: merged.length + (feed.permits || []).length,
        sources: Array.from(
          new Set([].concat(feed.sources || [], ["Preferred seller"]))
        ),
      });
    } catch (_) {
      return feed;
    }
  }
  window.ChicaPreferredOverlay = { mergePreferred };
})();
