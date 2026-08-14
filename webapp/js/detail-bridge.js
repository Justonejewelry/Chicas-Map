/** Bridges private app detail drawer → permit tips + trust signals + mobile detail sheet
 *  without patching the pinned app.js.
 *  Fix: when detail opens, release/hide the rail "menu" (list + tools) so the detail
 *  sheet becomes the sole scrollable surface. Users can then freely scroll and tap
 *  Google / Apple / Waze without nested-scroll fights or buried buttons.
 *
 *  Also enforces map-first on load: detail stays closed until the user taps a pin/list row.
 *
 *  Enrichment (all posts):
 *  - QR code linking to the original source URL (when present)
 *  - Google Street View of the sale location (lat/lon or address)
 */
(function () {
  function formatRelative(iso) {
    if (!iso) return "\u2014";
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

  function forceMapFirst() {
    var rail = document.getElementById("sideRail");
    var drawer = document.getElementById("detailDrawer");
    var bd = document.getElementById("railBackdrop");
    if (rail) {
      rail.classList.remove("open");
      rail.classList.remove("detail-mode");
    }
    if (drawer) {
      drawer.classList.add("hidden");
      drawer.classList.remove("open");
      drawer.style.display = "";
    }
    if (bd) {
      bd.classList.remove("open");
      bd.hidden = true;
    }
    document.getElementById("dockList")?.classList.remove("active");
  }

  function enhanceTrustSignals() {
    var body = document.getElementById("detailBody");
    if (!body) return;
    var metas = body.querySelectorAll(".d-meta");
    metas.forEach(function (el) {
      var t = el.textContent || "";
      var m = t.match(/Confidence:\s*(0\.\d+)/);
      if (m && t.indexOf("%") === -1) {
        el.textContent = "";
        el.appendChild(document.createTextNode("Confidence: "));
        var strong = document.createElement("strong");
        strong.textContent = String(Math.round(parseFloat(m[1]) * 100)) + "%";
        el.appendChild(strong);
      }
    });
    if (window.__YB_LAST_SALE && window.__YB_LAST_SALE.last_verified) {
      var hasVerified = Array.prototype.some.call(metas, function (el) {
        return /Last verified/i.test(el.textContent || "");
      });
      if (!hasVerified) {
        var line = document.createElement("div");
        line.className = "d-meta";
        line.appendChild(document.createTextNode("Last verified \u00b7 "));
        var strong = document.createElement("strong");
        strong.textContent = formatRelative(window.__YB_LAST_SALE.last_verified);
        line.appendChild(strong);
        var src = Array.prototype.find.call(metas, function (el) {
          return /Source:/i.test(el.textContent || "");
        });
        if (src && src.parentNode) src.parentNode.insertBefore(line, src);
        else body.appendChild(line);
      }
    }
  }

  function streetViewUrl(s) {
    if (!s) return null;
    if (s.lat != null && s.lon != null) {
      return (
        "https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=" +
        encodeURIComponent(s.lat + "," + s.lon)
      );
    }
    if (s.address) {
      return (
        "https://www.google.com/maps?layer=c&q=" + encodeURIComponent(s.address)
      );
    }
    return null;
  }

  function sourceUrl(s) {
    if (!s) return null;
    var u = s.source_url || s.url || s.sourceUrl || null;
    if (u && typeof u === "string" && /^https?:\/\//i.test(u)) return u;
    return null;
  }

  function qrImageUrl(data) {
    return (
      "https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=8&data=" +
      encodeURIComponent(data)
    );
  }

  function enhanceDetailExtras() {
    var body = document.getElementById("detailBody");
    if (!body) return;
    if (body.querySelector(".d-extras")) return;

    var s = window.__YB_LAST_SALE || {};
    var src = sourceUrl(s);
    var sv = streetViewUrl(s);
    if (!src && !sv) return;

    var wrap = document.createElement("div");
    wrap.className = "d-extras";
    wrap.setAttribute(
      "style",
      "margin-top:14px;padding-top:12px;border-top:1px solid rgba(0,0,0,.08);display:flex;flex-wrap:wrap;gap:14px;align-items:flex-start"
    );

    if (src) {
      var qrBox = document.createElement("div");
      qrBox.setAttribute(
        "style",
        "display:flex;flex-direction:column;align-items:center;gap:6px;min-width:120px"
      );
      var label = document.createElement("div");
      label.className = "d-meta";
      label.textContent = "Source QR";
      label.setAttribute("style", "font-size:0.72rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;opacity:.75");
      var img = document.createElement("img");
      img.src = qrImageUrl(src);
      img.alt = "QR code linking to original listing source";
      img.width = 120;
      img.height = 120;
      img.loading = "lazy";
      img.decoding = "async";
      img.setAttribute(
        "style",
        "width:120px;height:120px;border-radius:12px;background:#fff;border:1px solid rgba(0,0,0,.08);padding:6px"
      );
      var a = document.createElement("a");
      a.href = src;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = "Open source";
      a.setAttribute(
        "style",
        "font-size:0.8rem;font-weight:700;color:#0f3d24;text-decoration:none"
      );
      qrBox.appendChild(label);
      qrBox.appendChild(img);
      qrBox.appendChild(a);
      wrap.appendChild(qrBox);
    }

    if (sv) {
      var svBox = document.createElement("div");
      svBox.setAttribute("style", "flex:1;min-width:160px");
      var svLabel = document.createElement("div");
      svLabel.className = "d-meta";
      svLabel.textContent = "Street view";
      svLabel.setAttribute(
        "style",
        "font-size:0.72rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;opacity:.75;margin-bottom:6px"
      );
      var svLink = document.createElement("a");
      svLink.href = sv;
      svLink.target = "_blank";
      svLink.rel = "noopener noreferrer";
      svLink.setAttribute(
        "style",
        "display:flex;align-items:center;justify-content:center;gap:8px;min-height:88px;padding:14px 16px;border-radius:14px;background:linear-gradient(135deg,#e8f2eb,#f7f4ec);border:1.5px solid #cfe3d5;text-decoration:none;color:#0f3d24;font-weight:800;font-size:0.92rem"
      );
      svLink.innerHTML =
        '<span style="font-size:1.35rem" aria-hidden="true">\uD83D\uDEE3</span><span>View on Google Street View</span>';
      svBox.appendChild(svLabel);
      svBox.appendChild(svLink);

      if (s.lat != null && s.lon != null) {
        var embedWrap = document.createElement("div");
        embedWrap.setAttribute(
          "style",
          "margin-top:8px;border-radius:12px;overflow:hidden;border:1px solid rgba(0,0,0,.08);aspect-ratio:16/10;max-height:160px;background:#e8ebe6"
        );
        var iframe = document.createElement("iframe");
        iframe.title = "Google Street View of sale location";
        iframe.loading = "lazy";
        iframe.referrerPolicy = "no-referrer-when-downgrade";
        iframe.setAttribute(
          "style",
          "width:100%;height:100%;min-height:140px;border:0"
        );
        iframe.src =
          "https://maps.google.com/maps?q=&layer=c&cbll=" +
          encodeURIComponent(s.lat + "," + s.lon) +
          "&cbp=11,0,0,0,0&output=svembed";
        embedWrap.appendChild(iframe);
        svBox.appendChild(embedWrap);
      }

      wrap.appendChild(svBox);
    }

    var report = body.querySelector(".report-row");
    if (report && report.parentNode === body) {
      body.insertBefore(wrap, report);
    } else {
      body.appendChild(wrap);
    }
  }

  function setDetailMode(on) {
    var rail = document.getElementById("sideRail");
    var drawer = document.getElementById("detailDrawer");
    if (!rail) return;
    if (on) {
      rail.classList.add("detail-mode");
      rail.classList.add("open");
      var bd = document.getElementById("railBackdrop");
      if (bd) {
        bd.hidden = false;
        bd.classList.add("open");
      }
      document.getElementById("dockList")?.classList.add("active");
      if (drawer) {
        drawer.style.display = "";
        drawer.scrollTop = 0;
        var sc = document.querySelector(".rail-scroll");
        if (sc) sc.scrollTop = 0;
      }
    } else {
      rail.classList.remove("detail-mode");
    }
  }

  function syncFromDom() {
    var drawer = document.getElementById("detailDrawer");
    var body = document.getElementById("detailBody");
    if (!drawer) return;

    var hasContent = !!(body && body.textContent && body.textContent.trim().length > 0);
    var isOpen = !drawer.classList.contains("hidden") && hasContent;

    if (!isOpen) {
      setDetailMode(false);
      return;
    }

    setDetailMode(true);

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
      address: addr || prev.address,
      type: isPermit ? "permit" : prev.type || "garage",
      permit_number: (blob.match(/BLDG-GS-PMT-\d+/i) || [])[0] || prev.permit_number || "",
      title: (body.querySelector("h3") && body.querySelector("h3").textContent) || prev.title || "",
      confidence: prev.confidence,
      last_verified: prev.last_verified,
      lat: prev.lat,
      lon: prev.lon,
      source_url: prev.source_url || prev.url,
      url: prev.url,
      source: prev.source,
    };
    var srcA = body.querySelector('.d-meta a[href^="http"]');
    if (srcA && srcA.href) {
      sale.source_url = srcA.href;
    }
    window.__YB_LAST_SALE = Object.assign({}, prev, sale);
    var tipBtn = document.getElementById("btnOpenTipForm");
    if (tipBtn) tipBtn.hidden = !isPermit;
    var slot = document.getElementById("detailTipSlot");
    if (slot && window.YardBirdTips) {
      var tip = window.YardBirdTips.findTip(sale);
      slot.innerHTML = tip ? window.YardBirdTips.tipHtml(tip) : "";
    }
    enhanceTrustSignals();
    enhanceDetailExtras();
  }

  function enhanceEmptyState() {
    var list = document.getElementById("saleList");
    if (!list) return;
    var empty = list.querySelector(".empty");
    if (empty && !empty.dataset.enhanced) {
      empty.dataset.enhanced = "1";
      empty.textContent = "";
      empty.appendChild(document.createTextNode("No sales match this filter."));
      empty.appendChild(document.createElement("br"));
      var span = document.createElement("span");
      span.style.cssText = "font-size:0.85em;color:#7a736b";
      span.appendChild(document.createTextNode("Try "));
      var strong = document.createElement("strong");
      strong.textContent = "City-wide";
      span.appendChild(strong);
      span.appendChild(document.createTextNode(", widen the radius, or clear filters."));
      empty.appendChild(span);
    }
  }

  function observe(el, opts, fn) {
    if (!el || !window.MutationObserver) return;
    new MutationObserver(fn).observe(el, opts);
  }

  function start() {
    forceMapFirst();

    var drawer = document.getElementById("detailDrawer");
    observe(
      drawer,
      { attributes: true, attributeFilter: ["class"], childList: true, subtree: true },
      syncFromDom
    );
    observe(document.getElementById("detailBody"), { childList: true, subtree: true }, syncFromDom);
    observe(document.getElementById("saleList"), { childList: true }, enhanceEmptyState);

    var backdrop = document.getElementById("railBackdrop");
    if (backdrop) {
      backdrop.addEventListener("click", function () {
        setDetailMode(false);
        forceMapFirst();
      });
    }

    document.getElementById("detailClose")?.addEventListener("click", function () {
      setDetailMode(false);
      forceMapFirst();
    });

    setTimeout(forceMapFirst, 300);
    setTimeout(forceMapFirst, 1200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
