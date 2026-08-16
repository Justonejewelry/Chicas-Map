/**
 * Chica Map — Layers panel + Tools roll-up
 * - One Pantries / WiFi control (no duplicates above forecast)
 * - Route, export, radar, DNA, first30, hunt in a collapsible Tools menu
 */
(function () {
  if (!document.getElementById("map-tools-depth-css")) {
    var link = document.createElement("link");
    link.id = "map-tools-depth-css";
    link.rel = "stylesheet";
    link.href = "css/map-tools-depth.css?v=depth2";
    document.head.appendChild(link);
  }

  function removeDuplicateLayerButtons() {
    // Keep the Layers-panel versions; strip extras from feat-bar / tools-bar
    ["btnFoodPantry", "btnPublicWifi"].forEach(function (id) {
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
    // Legacy text-only pantry/wifi tool buttons outside layers
    document.querySelectorAll(".feat-bar .tool-btn, .tools-bar .tool-btn").forEach(function (btn) {
      var t = (btn.textContent || "").toLowerCase();
      if (t.indexOf("pantries") >= 0 || t.indexOf("wifi") >= 0) {
        if (!btn.closest(".rail-layers")) btn.remove();
      }
    });
  }

  function wireLayerButtons() {
    var pantry = document.getElementById("btnFoodPantry");
    if (pantry && !pantry.__ybWired) {
      pantry.__ybWired = true;
      pantry.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (window.ChicaFoodPantry && typeof window.ChicaFoodPantry.toggle === "function") {
          window.ChicaFoodPantry.toggle();
        } else {
          pantry.classList.toggle("active");
        }
      });
    }
    var wifi = document.getElementById("btnPublicWifi");
    if (wifi && !wifi.__ybWired) {
      wifi.__ybWired = true;
      wifi.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (window.ChicaPublicWifi && typeof window.ChicaPublicWifi.toggle === "function") {
          window.ChicaPublicWifi.toggle();
        } else {
          wifi.classList.toggle("active");
        }
      });
    }
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
      '<button type="button" class="layer-btn" id="btnLayerPermits" data-layer="permits" title="Permit pins">' +
      '<span class="layer-ico">📋</span><span>Permits</span></button>' +
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

    // Show Export inside roll-up
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

    // Remove old static "Tools" label
    section.querySelectorAll(".rail-label").forEach(function (lab) {
      if (lab.textContent.toLowerCase().trim() === "tools") lab.remove();
    });

    if (toolsBar) body.appendChild(toolsBar);
    if (featBar) body.appendChild(featBar);
    if (wish) body.appendChild(wish);

    details.appendChild(summary);
    details.appendChild(body);

    // Place after Layers panel if present
    var layers = section.querySelector(".rail-layers");
    if (layers && layers.nextSibling) {
      section.insertBefore(details, layers.nextSibling);
    } else if (layers) {
      section.appendChild(details);
    } else {
      section.insertBefore(details, section.firstChild);
    }
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", enhance);
  } else {
    enhance();
  }
  setTimeout(enhance, 400);
  setTimeout(enhance, 1000);
  setTimeout(enhance, 2200);
})();
