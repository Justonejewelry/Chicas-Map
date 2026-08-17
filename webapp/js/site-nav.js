(function () {
  "use strict";

  var NAV_ID = "chica-standard-nav";

  function build() {
    if (document.getElementById(NAV_ID)) return;

    var old = document.querySelector("header");
    var nav = document.createElement("header");
    nav.id = NAV_ID;
    nav.className = "chica-site-nav";
    nav.innerHTML =
      '<div class="chica-site-nav-inner">' +
        '<div class="chica-nav-menu">' +
          '<button class="chica-nav-logo" id="chicaNavLogo" type="button" aria-haspopup="true" aria-expanded="false" aria-controls="chicaNavDrop" title="Open Chica Map menu">' +
            '<img src="favicon.png" alt="Chica Map" width="42" height="42">' +
            '<span class="chica-nav-caret" aria-hidden="true">⌄</span>' +
          '</button>' +
          '<div class="chica-nav-drop" id="chicaNavDrop" role="menu" hidden>' +
            '<a role="menuitem" href="map.html"><span>🗺️</span>Map</a>' +
            '<a role="menuitem" href="submit.html"><span>📍</span>List a Sale</a>' +
            '<a role="menuitem" href="backyard.html"><span>🐾</span>Backyard</a>' +
            '<a role="menuitem" href="partnership.html"><span>🤝</span>Partnership</a>' +
            '<a role="menuitem" href="https://www.facebook.com/61593215043603/" target="_blank" rel="noopener noreferrer"><span>f</span>Follow on Facebook</a>' +
          '</div>' +
        '</div>' +
        '<a class="chica-nav-title" href="index.html" aria-label="Chica Map home"><strong>Chica\'s Map</strong><span>Garage Sale Intelligence Network</span></a>' +
        '<div class="chica-nav-actions"><a class="chica-nav-open" href="map.html">Open Map</a></div>' +
      '</div>';

    if (old) old.replaceWith(nav);
    else document.body.insertBefore(nav, document.body.firstChild);

    var menu = nav.querySelector(".chica-nav-menu");
    var btn = nav.querySelector("#chicaNavLogo");
    var drop = nav.querySelector("#chicaNavDrop");

    function close() {
      drop.hidden = true;
      btn.setAttribute("aria-expanded", "false");
      menu.classList.remove("open");
    }
    function open() {
      drop.hidden = false;
      btn.setAttribute("aria-expanded", "true");
      menu.classList.add("open");
    }

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      drop.hidden ? open() : close();
    });
    drop.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", close); });
    document.addEventListener("click", function (e) { if (!menu.contains(e.target)) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  }

  function standardizeFavicon() {
    document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]').forEach(function (link) {
      link.href = "favicon.png";
    });
    if (!document.querySelector('link[rel~="icon"]')) {
      var link = document.createElement("link");
      link.rel = "icon";
      link.type = "image/png";
      link.href = "favicon.png";
      document.head.appendChild(link);
    }
  }

  function addHomeFeaturesLink() {
    var cta = document.querySelector(".hero-cta");
    if (!cta || cta.querySelector('a[href="features.html"]')) return;
    var link = document.createElement("a");
    link.className = "btn btn-ghost btn-lg features-home-link";
    link.href = "features.html";
    link.textContent = "Features";
    cta.appendChild(link);
  }

  function addDevelopmentNote() {
    if (!/\/backyard\.html$/.test(location.pathname) || document.getElementById("chicaDevNoteCard")) return;
    var actions = document.querySelector(".by-actions");
    if (!actions) return;
    var card = document.createElement("a");
    card.id = "chicaDevNoteCard";
    card.className = "by-card-link by-card-note";
    card.href = "#development-notes";
    card.innerHTML = '<div class="by-card-inner"><div class="by-card-icon"><span class="by-emoji-icon">🛠️</span></div><h3>Notes from the<br>Development Team</h3><p>What we are building</p></div>';
    actions.appendChild(card);

    var section = document.createElement("section");
    section.id = "development-notes";
    section.className = "by-shell";
    section.innerHTML =
      '<div class="by-card by-prose chica-dev-note-panel" style="border:1.5px solid #8bc8e8;background:linear-gradient(180deg,#fff,#f1faff)">' +
        '<div style="display:flex;gap:14px;align-items:flex-start">' +
          '<div style="font-size:2rem;line-height:1">🛠️</div>' +
          '<div>' +
            '<h2 style="margin:0 0 6px">Notes from the Development Team</h2>' +
            '<p style="margin:0 0 10px;color:#7a736b"><strong>Emergency Plan & Activation</strong></p>' +
            '<p style="margin:0 0 12px">The emergency public-information layer is designed to stay dormant during normal map use. When a real need arises, the team can activate the deployment flag and expose resilience hubs, emergency resources and official information links without rebuilding the everyday map.</p>' +
            '<p style="margin:0 0 14px">We are also building a safe preview mode so the Pack can see the emergency presentation without changing its normal map preferences.</p>' +
            '<a href="map.html?emergency-preview=1" style="display:inline-flex;align-items:center;gap:7px;background:#0ea5e9;color:#fff;padding:10px 14px;border-radius:999px;text-decoration:none;font-weight:800">🆘 Preview emergency map · 5 seconds</a>' +
          '</div>' +
        '</div>' +
      '</div>';
    var main = document.querySelector("main");
    if (main) main.appendChild(section);
  }

  function emergencyPreview() {
    var params = new URLSearchParams(location.search || "");
    if (params.get("emergency-preview") !== "1") return;
    var previousDeploy = null;
    try { previousDeploy = localStorage.getItem("chica_emergency_deploy"); } catch (_) {}
    try { window.CHICA_EMERGENCY_DEPLOY = true; } catch (_) {}

    var tries = 0;
    var timer = setInterval(function () {
      tries++;
      if (window.ChicaEmergencyInfo && typeof window.ChicaEmergencyInfo.toggle === "function") {
        clearInterval(timer);
        try { window.ChicaEmergencyInfo.toggle(); } catch (_) {}
        setTimeout(function () {
          try { window.ChicaEmergencyInfo.toggle(); } catch (_) {}
          try {
            if (previousDeploy === null) localStorage.removeItem("chica_emergency_deploy");
            else localStorage.setItem("chica_emergency_deploy", previousDeploy);
            history.replaceState({}, document.title, location.pathname + location.hash);
          } catch (_) {}
        }, 5000);
      } else if (tries > 70) {
        clearInterval(timer);
      }
    }, 100);
  }

  function init() {
    standardizeFavicon();
    build();
    addHomeFeaturesLink();
    addDevelopmentNote();
    emergencyPreview();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();