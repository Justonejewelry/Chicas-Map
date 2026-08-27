(function () {
  var cfg = window.CHICA_CONFIG || {};
  var pay = cfg.PIN_CLAIM_PAYMENT_URL || "https://square.link/u/qjunxHoo";
  var claim = "/Chicas-Map/claim/";
  var BAR_ID = "chica-pin-claim";

  function path() {
    return location.pathname || "";
  }
  function onClaim() {
    return /\/claim\/?$/.test(path()) || path().indexOf("/claim/") !== -1;
  }
  function onMap() {
    return /\/map\/?$/.test(path()) || path().indexOf("/map/") !== -1;
  }
  function es() {
    return (document.documentElement.lang || "").toLowerCase().indexOf("es") === 0;
  }

  function copy() {
    if (es()) {
      return {
        line: "List it. Sell it. Done. Pin $5 este fin.",
        pay: "Pinar · $5",
        more: "Cómo funciona",
      };
    }
    return {
      line: "Hey pack. List it. Sell it. Done. — $5 pin.",
      pay: "Pin it · $5",
      more: "How it works",
    };
  }

  function place(bar) {
    if (onMap()) {
      bar.style.left = "12px";
      bar.style.right = "12px";
      bar.style.bottom = "max(14px, env(safe-area-inset-bottom))";
      bar.style.top = "auto";
    } else {
      bar.style.left = "12px";
      bar.style.right = "12px";
      bar.style.bottom = "max(76px, calc(env(safe-area-inset-bottom) + 64px))";
      bar.style.top = "auto";
    }
  }

  function mount() {
    if (onClaim()) {
      var leftover = document.getElementById(BAR_ID);
      if (leftover) leftover.remove();
      return;
    }
    var t = copy();
    var bar = document.getElementById(BAR_ID);
    if (!bar) {
      bar = document.createElement("div");
      bar.id = BAR_ID;
      bar.setAttribute("role", "region");
      bar.setAttribute("aria-label", t.line);
      document.body.appendChild(bar);
    }
    bar.style.cssText =
      "position:fixed;z-index:2147483645;display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:11px 14px;border-radius:14px;background:#1a1714;color:#f3eee4;box-shadow:0 10px 28px rgba(0,0,0,.4);font:600 14px/1.3 Inter,system-ui,sans-serif;border:1px solid #3a342e";
    place(bar);
    bar.innerHTML =
      "<span style=\"flex:1;min-width:140px\">" +
      t.line +
      "</span>" +
      '<span style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<a href="' +
      pay +
      '" target="_blank" rel="noreferrer" style="display:inline-flex;align-items:center;padding:10px 14px;border-radius:10px;background:#c513af;color:#fff;text-decoration:none;white-space:nowrap;font-weight:800">' +
      t.pay +
      "</a>" +
      '<a href="' +
      claim +
      '" style="display:inline-flex;align-items:center;padding:10px 12px;border-radius:10px;background:transparent;color:#f3eee4;text-decoration:none;white-space:nowrap;border:1px solid #5a534c">' +
      t.more +
      "</a></span>";
  }

  function boot() {
    mount();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  window.addEventListener("popstate", function () {
    setTimeout(boot, 40);
  });
})();
