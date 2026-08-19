/**
 * Chica Map — Layers panel + Tools roll-up
 * - Sales / Pantries / WiFi / Zone / Permits / Parking
 * - Route, export, radar, DNA, first30, hunt in a collapsible Tools menu
 * - Zone: after enable, close rail so map + school zones are visible
 */
(function () {
  if (!document.getElementById("map-tools-depth-css")) {
    var link = document.createElement("link");
    link.id = "map-tools-depth-css";
    link.rel = "stylesheet";
    link.href = "css/map-tools-depth.css?v=depth2";
    document.head.appendChild(link);
  }

  /** Close the mobile List / side rail so the map is fully visible */
  function closeMapRail() {
    try {
      if (typeof window.closeRail === "function") {
        window.closeRail();
        return;
      }
    } catch (_) {}
    var rail = document.getElementById("sideRail");
    var backdrop = document.getElementById("railBackdrop");
    if (rail) {
      rail.classList.remove("open");
      rail.classList.remove("detail-mode");
    }
    if (backdrop) {
      backdrop.classList.remove("open");
      backdrop.hidden = true;
    }
    var wrap = document.getElementById("menuWrap");
    var menuBtn = document.getElementById("menuBtn");
    if (wrap) wrap.classList.remove("open");
    if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
  }

  function removeDuplicateLayerButtons() {
    ["btnFoodPantry", "btnPublicWifi", "btnZoneAware", "btnDowntownParking"].forEach(function (id) {
      var nodes = document.querySelectorAll("#" + id);
      if (nodes.length <= 1) return;
      var keep = null;
      nodes.forEach(function (n) {
        if (n.classList.contains("layer-btn") || n.closest(".rail-layers")) keep = n;
      });
      if (!keep) keep = nodes[0];
      nodes.forEach(function (n) {
        if (n !== keep) n.remove();
      });
    });
    document.querySelectorAll(".feat-bar .tool-btn, .tools-bar .tool-btn").forEach(function (btn) {
      var t = (btn.textContent || "").toLowerCase();
      if (t.indexOf("pantries") >= 0 || t.indexOf("wifi") >= 0 || t === "zone" || t.indexOf("zone aware") >= 0 || t.indexOf("parking") >= 0) {
        if (!btn.closest(".rail-layers")) btn.remove();
      }
    });
  }

  function wireLayerButtons() {
    function bindToggle(id, getter, label, opts) {
      var btn = document.getElementById(id);
      if (!btn) return;
      if (btn.__ybLayerHandler) {
        btn.removeEventListener("click", btn.__ybLayerHandler, true);
      }
      btn.__ybLayerHandler = function (e) {
        e.preventDefault();
        e.stopPropagation();
        var api = getter();
        if (api && typeof api.toggle === "function") {
          try {
            var result = api.toggle();
            var closeOnEnable = opts && opts.closeRailOnEnable;
            function maybeClose() {
              if (!closeOnEnable) return;
              var on = false;
              try {
                if (typeof api.isEnabled === "function") on = !!api.isEnabled();
                else on = btn.classList.contains("active");
              } catch (_) {
                on = btn.classList.contains("active");
              }
              if (on) setTimeout(closeMapRail, 80);
            }
            if (result && typeof result.then === "function") {
              result.then(maybeClose).catch(function () {});
            } else {
              setTimeout(maybeClose, 50);
            }
          } catch (err) {
            console.warn("[layers-rail]", label, err);
            btn.classList.toggle("active");
          }
        } else {
          btn.classList.toggle("active");
          console.warn("[layers-rail] " + label + " module not ready yet");
        }
      };
      btn.addEventListener("click", btn.__ybLayerHandler, true);
      btn.__ybWired = true;
    }
    bindToggle("btnFoodPantry", function () { return window.ChicaFoodPantry; }, "Pantries");
    bindToggle("btnPublicWifi", function () { return window.ChicaPublicWifi; }, "WiFi");
    bindToggle("btnZoneAware", function () { return window.ChicaZoneAware; }, "Zone Aware", {
      closeRailOnEnable: true,
    });
    bindToggle("btnDowntownParking", function () { return window.ChicaDowntownParking; }, "Parking");
    var perm = document.getElementById("btnLayerPermits");
    if (perm && !perm.__ybWired) {
      perm.__ybWired = true;
      perm.addEventListener("click", function () {
        perm.classList.toggle("active");
        var chip = document.querySelector('.chip[data-filter="permit"]');
        if (chip) chip.click();
      });
    }
  }

  function buildLayers(section) {
    if (section.querySelector(".rail-layers")) return;
    var layers = document.createElement("div");
    layers.className = "rail-layers";
    layers.innerHTML =
      '<div class="rail-label">Layers</div>' +
      '<div class="layer-grid">' +
      '<button type="button" class="layer-btn active" id="btnLayerSales" data-layer="sales" title="Garage & estate sales">' +
      '<span class="layer-ico">🏷️</span><span>Sales</span></button>' +
      '<button type="button" class="layer-btn" id="btnFoodPantry" data-layer="pantries" title="Food pantries">' +
      '<span class="layer-ico">🥫</span><span>Pantries</span></button>' +
      '<button type="button" class="layer-btn" id="btnPublicWifi" data-layer="wifi" title="Free public WiFi">' +
      '<span class="layer-ico">📶</span><span>WiFi</span></button>' +
      '<button type="button" class="layer-btn" id="btnZoneAware" data-layer="zones" title="Zone Aware — school zones + soft voice">' +
      '<span class="layer-ico">🚸</span><span>Zone</span></button>' +
      '<button type="button" class="layer-btn" id="btnLayerPermits" data-layer="permits" title="Permit pins">' +
      '<span class="layer-ico">📋</span><span>Permits</span></button>' +
      '<button type="button" class="layer-btn" id="btnDowntownParking" data-layer="parking" title="Downtown parking rates & hours">' +
      '<span class="layer-ico">🅿️</span><span>Parking</span></button>' +
      "</div>";
    var label = section.querySelector(".rail-label");
    if (label && label.textContent.toLowerCase().indexOf("tools") >= 0) {
      section.insertBefore(layers, label);
    } else {
      section.insertBefore(layers, section.firstChild);
    }
  }

  function buildToolsRollup(section) {
    if (section.querySelector(".tools-rollup")) return;
    var toolsBar = section.querySelector(".tools-bar");
    var featBar = section.querySelector(".feat-bar");
    var wish = document.getElementById("wishlistPanel");
    if (!toolsBar && !featBar) return;
    var exp = document.getElementById("btnExport");
    if (exp) exp.hidden = false;
    var details = document.createElement("details");
    details.className = "tools-rollup";
    details.open = false;
    var summary = document.createElement("summary");
    summary.className = "tools-rollup-summary";
    summary.innerHTML =
      '<span class="tools-rollup-title">Tools</span>' +
      '<span class="tools-rollup-hint">Route · Radar · Export</span>' +
      '<span class="tools-rollup-chevron" aria-hidden="true">▾</span>';
    var body = document.createElement("div");
    body.className = "tools-rollup-body";
    section.querySelectorAll(".rail-label").forEach(function (lab) {
      if (lab.textContent.toLowerCase().trim() === "tools") lab.remove();
    });
    if (toolsBar) body.appendChild(toolsBar);
    if (featBar) body.appendChild(featBar);
    if (wish) body.appendChild(wish);
    details.appendChild(summary);
    details.appendChild(body);
    var layers = section.querySelector(".rail-layers");
    if (layers && layers.nextSibling) section.insertBefore(details, layers.nextSibling);
    else if (layers) section.appendChild(details);
    else section.insertBefore(details, section.firstChild);
  }

  function enhance() {
    var tools = document.querySelector(".rail-section .tools-bar");
    if (!tools) return;
    var section = tools.closest(".rail-section");
    if (!section) return;
    buildLayers(section);
    removeDuplicateLayerButtons();
    buildToolsRollup(section);
    removeDuplicateLayerButtons();
    wireLayerButtons();
  }

  window.ChicaCloseRail = closeMapRail;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", enhance);
  } else {
    enhance();
  }
  setTimeout(enhance, 400);
  setTimeout(enhance, 1000);
  setTimeout(enhance, 2200);
  setTimeout(enhance, 4000);
})();
