/**
 * Sale Hopper scoring. Pure functions. No DOM, no network.
 * A hop is an already-accepted 200 ft sniff of a real sale id.
 * Weekend key is the Saturday date in America/Chicago.
 */
(function (root) {
  var CHAIN_MS = 25 * 60 * 1000;
  var MIN_MILES = 0.15;
  var MAX_MPH = 70;
  var BASE = 10;

  function weekendKey(date) {
    var parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
      hour: "2-digit",
      hourCycle: "h23"
    }).formatToParts(date);
    var get = function (t) {
      return parts.filter(function (p) { return p.type === t; })[0].value;
    };
    var y = +get("year");
    var m = +get("month");
    var d = +get("day");
    var wd = get("weekday");
    var day = new Date(Date.UTC(y, m - 1, d));
    var shift = { Fri: 1, Sat: 0, Sun: -1 }[wd];
    if (shift == null) return null;
    if (wd === "Fri" && +get("hour") < 16) return null;
    day.setUTCDate(day.getUTCDate() + shift);
    return day.toISOString().slice(0, 10);
  }

  function miles(a, b) {
    var r = Math.PI / 180;
    var dLat = (b.lat - a.lat) * r;
    var dLon = (b.lon - a.lon) * r;
    var h = Math.sin(dLat / 2) ** 2 +
      Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
    return 3958.8 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  function tier(hops) {
    if (hops >= 12) return { id: "warrior", label: "Weekend Warrior", rank: "cape" };
    if (hops >= 7) return { id: "nomad", label: "Neighborhood Nomad", rank: "pack" };
    if (hops >= 3) return { id: "starter", label: "Saturday Starter", rank: "trail" };
    if (hops >= 1) return { id: "nose", label: "On the trail", rank: "nose" };
    return { id: "pup", label: "Pup", rank: "pup" };
  }

  function multiplier(chain, sundayCarry) {
    var m = chain >= 4 ? 2 : chain === 3 ? 1.5 : chain === 2 ? 1.25 : 1;
    if (sundayCarry) m = Math.max(m, 1.25);
    return Math.min(2, m);
  }

  /**
   * hops: prior verified sniffs this weekend, oldest first.
   * sniff: { saleId, at, lat, lon, zoneId, openAt }
   * Returns null if this sale was already sniffed this weekend.
   */
  function scoreHop(hops, sniff) {
    var key = weekendKey(new Date(sniff.at));
    if (!key) return null;
    if (hops.some(function (h) { return h.saleId === sniff.saleId && h.weekendKey === key; })) {
      return null;
    }
    var prev = hops.filter(function (h) { return h.weekendKey === key; }).slice(-1)[0];
    var chain = 1;
    var linked = false;
    if (prev) {
      var dt = new Date(sniff.at) - new Date(prev.at);
      var dist = miles(prev, sniff);
      var hours = dt / 36e5;
      var mph = hours > 0 ? dist / hours : Infinity;
      linked = dt >= 0 && dt <= CHAIN_MS && dist >= MIN_MILES && mph <= MAX_MPH;
      chain = linked ? (prev.chain || 1) + 1 : 1;
    }
    var day = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      weekday: "short"
    }).format(new Date(sniff.at));
    var satHops = hops.filter(function (h) {
      return h.weekendKey === key && h.day === "Sat";
    }).length;
    var carry = day === "Sun" && satHops >= 3;
    var mult = multiplier(chain, carry);
    var bonus = 0;
    var badges = [];
    if (sniff.openAt) {
      var early = new Date(sniff.at) - new Date(sniff.openAt);
      if (early >= 0 && early <= 15 * 60 * 1000) {
        bonus += 5;
        badges.push("early-bird");
      }
    }
    var bones = Math.round((BASE + bonus) * mult);
    return {
      saleId: sniff.saleId,
      weekendKey: key,
      at: sniff.at,
      lat: sniff.lat,
      lon: sniff.lon,
      zoneId: sniff.zoneId || null,
      day: day,
      chain: chain,
      linked: linked,
      multiplier: mult,
      bones: bones,
      badges: badges,
      tier: tier(hops.filter(function (h) { return h.weekendKey === key; }).length + 1)
    };
  }

  function boardRow(name, hops) {
    var bones = hops.reduce(function (n, h) { return n + (h.bones || 0); }, 0);
    return {
      pack_name: String(name || "Pack").slice(0, 24),
      hops: hops.length,
      bones: bones,
      tier: tier(hops.length).id
    };
  }

  var api = { weekendKey: weekendKey, scoreHop: scoreHop, tier: tier, boardRow: boardRow, miles: miles };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.ChicaHopper = api;
})(typeof window !== "undefined" ? window : globalThis);
