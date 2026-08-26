/* Chicas Map — labeled Full screen on the live Leaflet map. No Google Maps JS. */
(function () {
  var BTN_ID = "chica-fs-btn";

  function onMapPath() {
    var p = location.pathname || "";
    return /\/map\/?$/.test(p) || p.indexOf("/map/") !== -1;
  }

  function fsEl() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function resizeMap(host) {
    window.dispatchEvent(new Event("resize"));
    var leaf = host && host.querySelector(".leaflet-container");
    if (leaf && leaf._leaflet_id && window.L) {
      try {
        /* leaflet stores maps internally; ResizeObserver on the live map already runs */
      } catch (e) {}
    }
  }

  function mount() {
    if (!onMapPath()) {
      var leftover = document.getElementById(BTN_ID);
      if (leftover) leftover.remove();
      return;
    }
    if (document.getElementById(BTN_ID)) return;
    var map = document.querySelector(".chica-map");
    if (!map) return;
    var host = map.parentElement || map;
    host.classList.add("chica-map-fs-host");
    if (getComputedStyle(host).position === "static") host.style.position = "relative";

    var btn = document.createElement("button");
    btn.id = BTN_ID;
    btn.type = "button";
    btn.textContent = "Full screen";
    host.appendChild(btn);

    function label() {
      var on = Boolean(fsEl()) || host.classList.contains("chica-map-fs-css");
      btn.textContent = on ? "Exit" : "Full screen";
    }

    btn.addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      var on = Boolean(fsEl()) || host.classList.contains("chica-map-fs-css");
      if (on) {
        host.classList.remove("chica-map-fs-css");
        document.body.style.overflow = "";
        var exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (exit && fsEl()) {
          Promise.resolve(exit.call(document)).catch(function () {});
        }
        label();
        setTimeout(function () {
          resizeMap(host);
        }, 80);
        return;
      }
      var req = host.requestFullscreen || host.webkitRequestFullscreen;
      var go = req
        ? Promise.resolve(req.call(host, { navigationUI: "hide" })).catch(function () {
            return Promise.reject();
          })
        : Promise.reject();
      go.then(function () {
        label();
        setTimeout(function () {
          resizeMap(host);
        }, 80);
        setTimeout(function () {
          resizeMap(host);
        }, 300);
      }).catch(function () {
        host.classList.add("chica-map-fs-css");
        document.body.style.overflow = "hidden";
        label();
        setTimeout(function () {
          resizeMap(host);
        }, 80);
      });
    });

    document.addEventListener("fullscreenchange", label);
    document.addEventListener("webkitfullscreenchange", label);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && host.classList.contains("chica-map-fs-css")) {
        host.classList.remove("chica-map-fs-css");
        document.body.style.overflow = "";
        label();
        resizeMap(host);
      }
    });
  }

  var mo = new MutationObserver(function () {
    mount();
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
  window.addEventListener("popstate", function () {
    setTimeout(mount, 50);
  });
})();
