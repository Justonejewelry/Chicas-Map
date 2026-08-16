/**
 * Chica Map — Layers rail polish + depth styles
 */
(function () {
  if (!document.getElementById("map-tools-depth-css")) {
    var link = document.createElement("link");
    link.id = "map-tools-depth-css";
    link.rel = "stylesheet";
    link.href = "css/map-tools-depth.css?v=depth1";
    document.head.appendChild(link);
  }

  function enhance() {
    var tools = document.querySelector(".rail-section .tools-bar");
    if (!tools) return;
    var section = tools.closest(".rail-section");
    if (!section || section.querySelector(".rail-layers")) return;

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

    var perm = document.getElementById("btnLayerPermits");
    if (perm) {
      perm.addEventListener("click", function () {
        perm.classList.toggle("active");
        var chip = document.querySelector('.chip[data-filter="permit"]');
        if (chip) chip.click();
      });
    }

    // Sync active state when layer scripts toggle buttons
    document.addEventListener("click", function (e) {
      var t = e.target && e.target.closest && e.target.closest(".layer-btn, .tool-btn");
      if (!t) return;
      if (t.id === "btnPublicWifi" || t.id === "btnFoodPantry") {
        setTimeout(function () {
          if (t.classList.contains("active")) t.classList.add("active");
        }, 50);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", enhance);
  } else {
    enhance();
  }
  setTimeout(enhance, 600);
  setTimeout(enhance, 1500);
})();
