(function () {
  var BAR_ID = "chica-pin-claim";
  var CLAIM = "/Chicas-Map/claim/";
  var PAY =
    (window.CHICA_CONFIG && window.CHICA_CONFIG.PIN_CLAIM_PAYMENT_URL) ||
    "https://square.link/u/qjunxHoo";
  var last = "";
  var queued = 0;

  function skipPath(p) {
    if (!p) p = "/";
    if (p.indexOf("/map") !== -1 || p.indexOf("/claim") !== -1) return true;
    var bare = p.replace(/\/+$/, "") || "/";
    return bare === "/" || bare === "/Chicas-Map" || p.indexOf("index.html") !== -1;
  }

  function kill() {
    var el = document.getElementById(BAR_ID);
    if (el) el.remove();
    last = "skip";
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  function paint() {
    var p = location.pathname || "/";
    if (skipPath(p)) {
      if (last !== "skip") kill();
      return;
    }
    var es = (document.documentElement.lang || "").toLowerCase().indexOf("es") === 0;
    var key = es ? "es" : "en";
    if (last === key && document.getElementById(BAR_ID)) return;

    var line = es
      ? "List it. Sell it. Done. Pin $5 este fin."
      : "Hey pack. List it. Sell it. Done. — $5 pin.";
    var payLabel = es ? "Pinar · $5" : "Pin it · $5";
    var moreLabel = es ? "Cómo funciona" : "How it works";

    var bar = document.getElementById(BAR_ID);
    var fresh = !bar;
    if (!bar) {
      bar = el("div", "");
      bar.id = BAR_ID;
      bar.setAttribute("role", "region");
      document.body.appendChild(bar);
    } else {
      while (bar.firstChild) bar.removeChild(bar.firstChild);
    }
    bar.setAttribute("aria-label", line);
    bar.style.cssText =
      "left:12px;right:12px;bottom:max(76px,calc(env(safe-area-inset-bottom) + 64px));top:auto";

    var copy = el("span", "chica-claim-line", line);
    copy.style.cssText = "flex:1;min-width:140px";
    var actions = el("span", "chica-claim-actions");
    actions.style.cssText = "display:flex;gap:8px;flex-wrap:wrap";
    var pay = el("a", "chica-claim-pay", payLabel);
    pay.href = PAY;
    pay.target = "_blank";
    pay.rel = "noreferrer";
    var more = el("a", "chica-claim-more", moreLabel);
    more.href = CLAIM;
    actions.appendChild(pay);
    actions.appendChild(more);
    bar.appendChild(copy);
    bar.appendChild(actions);
    if (fresh) bar.classList.add("is-in");
    last = key;
  }

  function schedule() {
    if (queued) return;
    queued = 1;
    var run = function () {
      queued = 0;
      paint();
    };
    if (skipPath(location.pathname || "/")) {
      run();
      return;
    }
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(run, { timeout: 700 });
    } else {
      setTimeout(run, 0);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", schedule, { once: true });
  } else {
    schedule();
  }
  window.addEventListener("popstate", schedule, { passive: true });
})();
