(function () {
  "use strict";

  var NAV_ID = "chica-standard-nav";
  var ICON = "favicon.svg";

  function item(href, icon, label, note, external) {
    var target = external ? ' target="_blank" rel="noopener noreferrer"' : "";
    return '<a class="chica-nav-item" role="menuitem" href="' + href + '"' + target + '>' +
      '<span class="chica-nav-item-icon" aria-hidden="true">' + icon + '</span>' +
      '<span class="chica-nav-item-copy"><strong>' + label + '</strong>' + (note ? '<small>' + note + '</small>' : '') + '</span>' +
      '</a>';
  }

  function section(label, content) {
    return '<div class="chica-nav-section"><div class="chica-nav-section-label">' + label + '</div>' + content + '</div>';
  }

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
            '<img src="' + ICON + '" alt="Chica Map" width="42" height="42">' +
            '<span class="chica-nav-caret" aria-hidden="true">⌄</span>' +
          '</button>' +
          '<div class="chica-nav-drop" id="chicaNavDrop" role="menu" hidden>' +
            section("Explore", item("map.html", "🗺️", "Open the Map", "Live sales, routes & map tools") +
              item("index.html", "🏠", "Home", "Chica Map overview")) +
            section("Find & Share", item("submit.html", "📍", "List a Sale", "Add a garage, yard or estate sale") +
              item("backyard.html", "🐾", "The Backyard", "Community, stories & extras") +
              item("sponsor.html", "🤝", "Sponsor Chica Map", "Partnerships & promotion")) +
            section("Stay Connected", item("https://www.facebook.com/61593215043603/", "f", "Follow on Facebook", "Updates and new finds", true)) +
            section("Help & Legal", item("disclaimer.html", "ⓘ", "Disclaimer", "Map accuracy & source notes") +
              item("privacy.html", "🔒", "Privacy", "How information is handled") +
              item("terms.html", "📄", "Terms", "Use of Chica Map")) +
            '<div class="chica-nav-footer"><span>Chica Map</span><span>San Antonio · Texas</span></div>' +
          '</div>' +
        '</div>' +
        '<a class="chica-nav-title" href="index.html" aria-label="Chica Map home"><strong>Chica\'s Map</strong><span>Garage Sale Intelligence Network</span></a>' +
        '<div class="chica-nav-actions"><a class="chica-nav-open" href="map.html">Open Map</a></div>' +
      '</div>';

    if (old) old.replaceWith(nav);
    else if (document.body) document.body.insertBefore(nav, document.body.firstChild);

    var menu = nav.querySelector(".chica-nav-menu");
    var btn = nav.querySelector("#chicaNavLogo");
    var drop = nav.querySelector("#chicaNavDrop");

    function close() {
      if (!drop || !btn || !menu) return;
      drop.hidden = true;
      btn.setAttribute("aria-expanded", "false");
      menu.classList.remove("open");
    }
    function open() {
      if (!drop || !btn || !menu) return;
      drop.hidden = false;
      btn.setAttribute("aria-expanded", "true");
      menu.classList.add("open");
      var first = drop.querySelector("a");
      if (first) first.focus();
    }

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      drop.hidden ? open() : close();
    });
    drop.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", close); });
    document.addEventListener("click", function (e) { if (!menu.contains(e.target)) close(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { close(); btn.focus(); }
    });
  }

  function standardizeFavicon() {
    document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]').forEach(function (link) {
      link.href = ICON;
    });
    if (!document.querySelector('link[rel~="icon"]')) {
      var link = document.createElement("link");
      link.rel = "icon";
      link.type = "image/svg+xml";
      link.href = ICON;
      document.head.appendChild(link);
    }
  }

  function addHomeFeaturesLink() {
    var cta = document.querySelector(".hero-cta");
    if (!cta || cta.querySelector('a[href="features.html"]')) return;
    /* features.html is not currently a published page, so do not create a dead link. */
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
      } else if (tries > 70) clearInterval(timer);
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
