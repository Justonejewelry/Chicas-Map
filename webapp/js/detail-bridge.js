/** Bridges private app detail drawer → permit tips without patching app.js */
(function () {
  function syncFromDom() {
    var drawer = document.getElementById("detailDrawer");
    var body = document.getElementById("detailBody");
    if (!drawer || !body || drawer.classList.contains("hidden")) return;
    var addr = (body.querySelector(".d-addr") && body.querySelector(".d-addr").textContent.trim()) || "";
    var meta = Array.prototype.map
      .call(body.querySelectorAll(".d-meta"), function (n) {
        return n.textContent || "";
      })
      .join(" ");
    var blob = meta + " " + (body.textContent || "");
    var isPermit = /Type:\s*permit/i.test(blob) || /permit issued/i.test(blob);
    var sale = {
      address: addr,
      type: isPermit ? "permit" : "garage",
      permit_number: (blob.match(/BLDG-GS-PMT-\d+/i) || [])[0] || "",
      title: (body.querySelector("h3") && body.querySelector("h3").textContent) || "",
    };
    window.__YB_LAST_SALE = sale;
    var tipBtn = document.getElementById("btnOpenTipForm");
    if (tipBtn) tipBtn.hidden = !isPermit;
    var slot = document.getElementById("detailTipSlot");
    if (slot && window.YardBirdTips) {
      var tip = window.YardBirdTips.findTip(sale);
      slot.innerHTML = tip ? window.YardBirdTips.tipHtml(tip) : "";
    }
  }
  function observe(el, opts) {
    if (!el || !window.MutationObserver) return;
    new MutationObserver(syncFromDom).observe(el, opts);
  }
  observe(document.getElementById("detailDrawer"), {
    attributes: true,
    attributeFilter: ["class"],
    childList: true,
    subtree: true,
  });
  observe(document.getElementById("detailBody"), { childList: true, subtree: true });
})();
