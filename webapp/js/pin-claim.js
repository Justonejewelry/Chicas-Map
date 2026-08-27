(function () {
  var cfg = window.CHICA_CONFIG || {};
  var pay = cfg.PIN_CLAIM_PAYMENT_URL || "https://square.link/u/qjunxHoo";
  if (document.getElementById("chica-pin-claim")) return;

  function mount() {
    if (document.getElementById("chica-pin-claim")) return;
    var bar = document.createElement("div");
    bar.id = "chica-pin-claim";
    bar.style.cssText =
      "position:fixed;z-index:4000;left:12px;right:12px;bottom:12px;display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:12px 14px;border-radius:14px;background:#1a1714;color:#f3eee4;box-shadow:0 8px 28px rgba(0,0,0,.35);font:600 14px/1.3 Inter,system-ui,sans-serif";
    bar.innerHTML =
      '<span>Claim a pin this weekend — $5 on Square.</span>' +
      '<a href="' +
      pay +
      '" target="_blank" rel="noreferrer" style="display:inline-flex;align-items:center;padding:10px 14px;border-radius:10px;background:#9a4a32;color:#fff;text-decoration:none;white-space:nowrap">Pay $5</a>';
    document.body.appendChild(bar);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
