/* Chicas Map — $5 weekend pin claim overlay.
   Does not replace the map. Adds a claim CTA on popups + submit. */
(function () {
  var CFG = window.CHICA_CONFIG || {};
  var FEED = CFG.PIN_CLAIMS_FEED || "/Chicas-Map/data/pin-claims.json";
  var PAGE = CFG.CLAIM_PAGE || "/Chicas-Map/claim/";
  var claims = [];
  var today = new Date().toISOString().slice(0, 10);

  function base() {
    var p = location.pathname || "";
    return p.indexOf("/Chicas-Map") === 0 ? "/Chicas-Map" : "";
  }

  function claimHref(saleId) {
    var url = (PAGE.indexOf("/Chicas-Map") === 0 ? PAGE : base() + PAGE);
    if (saleId) url += (url.indexOf("?") >= 0 ? "&" : "?") + "sale=" + encodeURIComponent(saleId);
    return url;
  }

  function isLive(row) {
    if (!row) return false;
    var until = String(row.claimed_until || row.boost_until || "").slice(0, 10);
    return !until || until >= today;
  }

  function claimedIds() {
    var out = {};
    claims.forEach(function (c) {
      if (!isLive(c)) return;
      if (c.id) out[String(c.id)] = c;
      if (c.external_id) out[String(c.external_id)] = c;
    });
    return out;
  }

  function textOf(el) {
    return (el && el.textContent) || "";
  }

  function saleIdFromPopup(box) {
    var html = box.innerHTML || "";
    var m = html.match(/[?&]sale=([^"'&]+)/);
    if (m) return decodeURIComponent(m[1]);
    var link = box.querySelector("a[href]");
    if (link) {
      try {
        var u = new URL(link.href, location.origin);
        var q = u.searchParams.get("sale") || u.searchParams.get("pin");
        if (q) return q;
      } catch (e) {}
    }
    return "";
  }

  function decoratePopup(box) {
    if (!box || box.getAttribute("data-chica-claim") === "1") return;
    box.setAttribute("data-chica-claim", "1");
    var live = claimedIds();
    var id = saleIdFromPopup(box);
    var hit = id && live[id];
    var title = textOf(box.querySelector("h2, h3, strong, .font-display")) || textOf(box).slice(0, 80);
    if (!hit) {
      claims.forEach(function (c) {
        if (!isLive(c) || !c.title) return;
        if (title && title.indexOf(c.title.slice(0, 24)) !== -1) hit = c;
      });
    }
    var node = document.createElement(hit ? "span" : "a");
    if (hit) {
      node.className = "chica-claim-live";
      node.textContent = "Claimed this weekend";
    } else {
      node.className = "chica-claim-cta";
      node.href = claimHref(id);
      node.textContent = "Claim this pin — $5";
    }
    box.appendChild(node);
  }

  function watchPopups() {
    var obs = new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        m.addedNodes &&
          m.addedNodes.forEach(function (n) {
            if (!n || n.nodeType !== 1) return;
            var box = n.classList && n.classList.contains("leaflet-popup-content")
              ? n
              : n.querySelector && n.querySelector(".leaflet-popup-content");
            if (box) decoratePopup(box);
          });
      });
      document.querySelectorAll(".leaflet-popup-content").forEach(decoratePopup);
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  function submitUpsell() {
    var p = location.pathname || "";
    if (!/\/submit\/?$/.test(p) && p.indexOf("/submit") === -1) return;
    if (document.getElementById("chica-claim-submit")) return;
    var form = document.querySelector("form");
    if (!form) return;
    var box = document.createElement("p");
    box.id = "chica-claim-submit";
    box.style.cssText = "margin:16px 0 0;padding:12px 14px;border:1px solid #eab308;border-radius:12px;font:500 14px/1.45 Inter,system-ui,sans-serif";
    box.innerHTML =
      'Listing is free. Want the gold pin this weekend? <a href="' +
      claimHref("") +
      '" style="color:#a16207;font-weight:800">Claim it for $5</a>.';
    form.appendChild(box);
  }

  function homeHint() {
    var p = location.pathname || "";
    if (!/\/map\/?$/.test(p) && p.indexOf("/map/") === -1) return;
    if (sessionStorage.getItem("chica-claim-hint") === "1") return;
    var el = document.createElement("div");
    el.className = "chica-claim-banner";
    el.innerHTML =
      'Hosting this weekend? <a href="' +
      claimHref("") +
      '">Claim your pin — $5</a>. Gold star through the sale dates.';
    var close = document.createElement("button");
    close.type = "button";
    close.textContent = "×";
    close.setAttribute("aria-label", "Dismiss");
    close.style.cssText =
      "position:absolute;top:6px;right:10px;background:none;border:0;color:#fffdf8;font-size:18px;cursor:pointer";
    close.onclick = function () {
      sessionStorage.setItem("chica-claim-hint", "1");
      el.remove();
    };
    el.style.position = "relative";
    el.appendChild(close);
    document.body.appendChild(el);
  }

  function boot() {
    submitUpsell();
    watchPopups();
    fetch(FEED, { cache: "no-store" })
      .then(function (r) {
        return r.ok ? r.json() : { claims: [] };
      })
      .then(function (data) {
        claims = data.claims || [];
        homeHint();
      })
      .catch(function () {
        homeHint();
      });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
