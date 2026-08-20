/* Chica Map — progressive disclosure for the live map.
 * Preserve existing IDs and controls; only reorganize the DOM so existing handlers keep working.
 */
(function () {
  function makeDetails(className, label, open) {
    var details = document.createElement("details");
    details.className = className;
    if (open) details.open = true;
    var summary = document.createElement("summary");
    summary.textContent = label;
    details.appendChild(summary);
    return details;
  }

  function move(node, target) {
    if (node && target) target.appendChild(node);
  }

  function applyDensityPass() {
    var rail = document.getElementById("sideRail");
    var scroll = rail && rail.querySelector(".rail-scroll");
    if (!rail || !scroll || rail.dataset.progressive === "true") return;
    rail.dataset.progressive = "true";

    var findSection = scroll.querySelector(".rail-desktop-tools");
    var list = scroll.querySelector(".list-wrap");
    var sections = scroll.querySelectorAll(".rail-section");
    var toolsSection = sections.length > 1 ? sections[1] : null;

    /* Keep the first decision obvious: location, then sales. */
    if (findSection) {
      var nearRow = document.getElementById("nearRadiusRow");
      var locRow = nearRow && nearRow.nextElementSibling && nearRow.nextElementSibling.classList.contains("rail-row") ? nearRow.nextElementSibling : null;
      var keyword = findSection.querySelector(".keyword-row");
      var days = findSection.querySelector(".day-toggle");
      var status = document.getElementById("nearStatus");
      var refine = makeDetails("map-progressive map-refine", "Refine search", false);
      var body = document.createElement("div");
      body.className = "map-progressive-body";
      move(locRow, body);
      move(keyword, body);
      move(days, body);
      move(status, body);
      if (body.children.length) {
        refine.appendChild(body);
        findSection.appendChild(refine);
      }
    }

    /* Sales are the product; surface them before secondary tools. */
    if (list && toolsSection) scroll.insertBefore(list, toolsSection);

    if (toolsSection) {
      var toolsBar = toolsSection.querySelector(".tools-bar");
      var featBar = toolsSection.querySelector(".feat-bar");
      var wishlist = document.getElementById("btnWishlist");
      var share = document.getElementById("btnShareRoute");

      /* Promote the three actions that matter most. */
      if (toolsBar && wishlist) toolsBar.appendChild(wishlist);

      var more = makeDetails("map-progressive map-more-tools", "More hunt tools", false);
      var moreBody = document.createElement("div");
      moreBody.className = "map-progressive-body";
      if (share) moreBody.appendChild(share);
      if (featBar) moreBody.appendChild(featBar);
      if (moreBody.children.length) {
        more.appendChild(moreBody);
        toolsSection.appendChild(more);
      }
    }

    /* Make the list header explain the immediate task. */
    var listTitle = document.getElementById("listTitle");
    if (listTitle && !listTitle.dataset.progressiveCopy) {
      listTitle.dataset.progressiveCopy = "true";
      listTitle.textContent = "Sales to explore";
    }

    var listCount = document.getElementById("listCount");
    if (listCount) listCount.setAttribute("aria-label", "Number of matching sales");

    /* Add a compact hint only once. */
    if (findSection && !findSection.querySelector(".map-start-hint")) {
      var hint = document.createElement("p");
      hint.className = "map-start-hint";
      hint.textContent = "Start here: find nearby sales, open one, then save or route it.";
      var label = findSection.querySelector(".rail-label");
      if (label && label.nextSibling) findSection.insertBefore(hint, label.nextSibling);
    }
  }

  function boot() {
    if (!document.body || !document.body.classList.contains("grass-map")) return;
    applyDensityPass();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
