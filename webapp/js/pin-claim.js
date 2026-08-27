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
    var fresh = !bar;
    if (!bar) {
      bar = document.createElement("div");
      bar.id = BAR_ID;
      bar.setAttribute("role", "region");
      bar.setAttribute("aria-label", t.line);
      document.body.appendChild(bar);
    }
    place(bar);
    if (bar.getAttribute("data-chica-copy") === t.line) return;
    bar.setAttribute("data-chica-copy", t.line);
    bar.innerHTML =
      "<span style=\"flex:1;min-width:140px\">" +
      t.line +
      "</span>" +
      '<span style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<a href="' +
      pay +
      '" target="_blank" rel="noreferrer" class="chica-claim-pay">' +
      t.pay +
      "</a>" +
      '<a href="' +
      claim +
      '" class="chica-claim-more">' +
      t.more +
      "</a></span>";
    if (fresh) bar.classList.add("is-in");
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
