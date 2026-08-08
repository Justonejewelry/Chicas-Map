/** Bridges private app detail drawer → permit tips + trust signals without patching app.js */
(function () {
  function formatRelative(iso) {
    if (!iso) return "—";
    try {
      var t = new Date(iso);
      if (isNaN(t.getTime())) return String(iso).slice(0, 16);
      var diff = Math.round((Date.now() - t.getTime()) / 1000);
      if (diff < 60) return "just now";
      if (diff < 3600) return Math.floor(diff / 60) + "m ago";
      if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
      if (diff < 604800) return Math.floor(diff / 86400) + "d ago";
      return t.toLocaleString(undefined, { month: "short", day: "numeric" });
    } catch (_) {
      return String(iso).slice(0, 19);
    }
  }

  function enhanceTrustSignals() {
    var body = document.getElementById("detailBody");
    if (!body) return;
    var metas = body.querySelectorAll(".d-meta");
    metas.forEach(function (el) {
      var t = el.textContent || "";
      if (/Confidence:\s*0\.\d+/.test(t) && t.indexOf("%") === -1) {
        el.innerHTML = t.replace(/Confidence:\s*(0\.\d+)/, function (_, n) {
          return "Confidence: <strong>" + Math.round(parseFloat(n) * 100) + "%</strong>";
        });
      }
    });
    if (window.__YB_LAST_SALE && window.__YB_LAST_SALE.last_verified) {
      var hasVerified = Array.prototype.some.call(metas, function (el) {
        return /Last verified/i.test(el.textContent || "");
      });
      if (!hasVerified) {
        var line = document.createElement("div");
        line.className = "d-meta";
        line.innerHTML =
          "Last verified · <strong>" +
          formatRelative(window.__YB_LAST_SALE.last_verified) +
          "</strong>";
        var src = Array.prototype.find.call(metas, function (el) {
          return /Source:/i.test(el.textContent || "");
        });
        if (src && src.parentNode) src.parentNode.insertBefore(line, src);
        else body.appendChild(line);
      }
    }
  }

  function syncFromDom() {
    var drawer = document.getElementById("detailDrawer");
    var body = document.getElementById("detailBody");
    if (!drawer || !body || drawer.classList.contains("hidden")) return;
    var addr =
      (body.querySelector(".d-addr") && body.querySelector(".d-addr").textContent.trim()) || "";
    var meta = Array.prototype.map
      .call(body.querySelectorAll(".d-meta"), function (n) {
        return n.textContent || "";
      })
      .join(" ");
    var blob = meta + " " + (body.textContent || "");
    var isPermit = /Type:\s*permit/i.test(blob) || /permit issued/i.test(blob);
    var prev = window.__YB_LAST_SALE || {};
    var sale = {
      address: addr,
      type: isPermit ? "permit" : prev.type || "garage",
      permit_number: (blob.match(/BLDG-GS-PMT-\d+/i) || [])[0] || "",
      title: (body.querySelector("h3") && body.querySelector("h3").textContent) || "",
      confidence: prev.confidence,
      last_verified: prev.last_verified,
    };
    window.__YB_LAST_SALE = Object.assign({}, prev, sale);
    var tipBtn = document.getElementById("btnOpenTipForm");
    if (tipBtn) tipBtn.hidden = !isPermit;
    var slot = document.getElementById("detailTipSlot");
    if (slot && window.YardBirdTips) {
      var tip = window.YardBirdTips.findTip(sale);
      slot.innerHTML = tip ? window.YardBirdTips.tipHtml(tip) : "";
    }
    enhanceTrustSignals();
  }

  function enhanceEmptyState() {
    var list = document.getElementById("saleList");
    if (!list) return;
    var empty = list.querySelector(".empty");
    if (empty && !empty.dataset.enhanced) {
      empty.dataset.enhanced = "1";
      empty.innerHTML =
        'No sales match this filter.<br/><span style="font-size:0.85em;color:#7a736b">Try <strong>City-wide</strong>, widen the radius, or clear filters.</span>';
    }
  }

  function observe(el, opts, fn) {
    if (!el || !window.MutationObserver) return;
    new MutationObserver(fn).observe(el, opts);
  }

  function start() {
    observe(
      document.getElementById("detailDrawer"),
      { attributes: true, attributeFilter: ["class"], childList: true, subtree: true },
      syncFromDom
    );
    observe(document.getElementById("detailBody"), { childList: true, subtree: true }, syncFromDom);
    observe(document.getElementById("saleList"), { childList: true }, enhanceEmptyState);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
