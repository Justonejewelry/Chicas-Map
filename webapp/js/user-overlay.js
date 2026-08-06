/** Merge approved user submissions into the live feed (per-city *-user.json). */
(function () {
  async function mergeUserOverlay(city, feed) {
    if (!feed || !city || city === "texas") return feed;
    try {
      const res = await fetch("data/cities/" + city + "-user.json?t=" + Date.now(), {
        cache: "no-store",
      });
      if (!res.ok) return feed;
      const extra = await res.json();
      const add = extra.public || extra.sales || [];
      if (!add.length) return feed;
      const norm = (s) =>
        String(s || "")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");
      const seen = new Set(
        (feed.public || []).map((p) => norm(p.address) + "|" + (p.start_date || p.end_date || ""))
      );
      const merged = [...add.filter((p) => !seen.has(norm(p.address) + "|" + (p.start_date || p.end_date || ""))), ...(feed.public || [])];
      return {
        ...feed,
        public: merged,
        total_locations: merged.length + (feed.permits || []).length,
        sources: Array.from(new Set([...(feed.sources || []), "User submit (approved)"])),
      };
    } catch (_) {
      return feed;
    }
  }
  window.YardBirdUserOverlay = { mergeUserOverlay };
})();
