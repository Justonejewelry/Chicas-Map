/* Chica Map — mobile bottom dock + Details consolidation
 * UX rule: the old List destination becomes Details. The Details rail owns
 * the sale list/detail view, and the social/share controls live at its bottom.
 */
(function () {
  "use strict";

  function moveSocialIntoDetails() {
    var drawer = document.getElementById("detailDrawer");
    var social = document.getElementById("chicaSocialMap");
    if (!drawer || !social) return;
    var body = drawer.querySelector("#detailBody") || drawer;
    if (social.parentNode !== body) body.appendChild(social);
    social.classList.add("chica-social-in-details");
  }

  function findListButton(dock) {
    var buttons = dock.querySelectorAll("button, a");
    for (var i = 0; i < buttons.length; i++) {
      var text = (buttons[i].textContent || "").trim().toLowerCase();
      var aria = (buttons[i].getAttribute("aria-label") || "").toLowerCase();
      if (text === "list" || aria === "list" || text.indexOf("list") === 0) return buttons[i];
    }
    return null;
  }

  function setupDock() {
    var dock = document.querySelector(".mobile-dock");
    if (!dock) return;

    var listBtn = findListButton(dock);
    if (!listBtn || listBtn.dataset.chicaDetails === "1") return;

    listBtn.dataset.chicaDetails = "1";
    var label = listBtn.querySelector("span:last-child") || listBtn;
    if (label) {
      var text = label.textContent || "";
      label.textContent = text.replace(/\bList\b/i, "Details");
    }
    listBtn.setAttribute("aria-label", "Open Details");
    listBtn.title = "Open Details";

    listBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var rail = document.getElementById("sideRail");
      if (!rail) return;
      rail.classList.add("open");
      rail.classList.add("details-mode");
      var back = document.getElementById("railBackdrop");
      if (back) back.classList.add("open");
      moveSocialIntoDetails();
    }, true);
  }

  function consolidate() {
    setupDock();
    moveSocialIntoDetails();
  }

  function start() {
    consolidate();
    var observer = new MutationObserver(function () { consolidate(); });
    observer.observe(document.body, { childList: true, subtree: true });
    [250, 700, 1500, 3000, 5000].forEach(function (ms) { setTimeout(consolidate, ms); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
