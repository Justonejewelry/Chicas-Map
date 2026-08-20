/* Chica Map — progressive disclosure for the live map.
 * Preserve existing IDs and controls; only reorganize the DOM so existing handlers keep working.
 */
(function () {
  function injectStyles() {
    if (document.getElementById("chicaMapDensityStyles")) return;
    var style = document.createElement("style");
    style.id = "chicaMapDensityStyles";
    style.textContent = [
      ".grass-map .map-start-hint{margin:0 12px 10px;font-size:.76rem;line-height:1.35;color:#7a736b}",
      ".grass-map .map-progressive{margin:10px 12px 2px;border:1px solid #ece7ef;border-radius:12px;background:#fbf9fc;overflow:hidden}",
      ".grass-map .map-progressive>summary{display:flex;align-items:center;justify-content:space-between;min-height:42px;padding:0 12px;cursor:pointer;list-style:none;font-size:.8rem;font-weight:800;color:#2b172a;letter-spacing:.01em}",
      ".grass-map .map-progressive>summary::-webkit-details-marker{display:none}",
      ".grass-map .map-progressive>summary:after{content:'+';font-size:1.15rem;color:#c513b8;font-weight:500}",
      ".grass-map .map-progressive[open]>summary{border-bottom:1px solid #ece7ef}",
      ".grass-map .map-progressive[open]>summary:after{content:'–'}",
      ".grass-map .map-progressive-body{padding:10px 0 12px;display:grid;gap:10px}",
      ".grass-map .map-progressive-body .rail-row,.grass-map .map-progressive-body .keyword-row,.grass-map .map-progressive-body .day-toggle{margin-top:0!important}",
      ".grass-map .map-more-tools .map-progressive-body{padding:10px 12px 12px}",
      ".grass-map .map-more-tools .feat-bar{margin:0!important}",
      ".grass-map .map-more-tools #btnShareRoute{width:100%;min-height:42px}",
      ".grass-map .tools-bar{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;padding:0 12px}",
      ".grass-map .tools-bar .tool-btn{min-height:44px;border-radius:10px;font-size:.76rem}",
      ".grass-map .list-wrap{border-top:1px solid #e6e1d8;border-bottom:1px solid #e6e1d8;background:#fff}",
      ".grass-map .list-head{position:sticky;top:0;z-index:3;background:rgba(255,255,255,.97);backdrop-filter:blur(8px);padding:12px 12px 8px}",
      ".grass-map .list-head h2{font-size:.96rem;letter-spacing:-.01em}",
      ".grass-map .list-head #listCount{background:#f8e8f7;color:#a30f99;border-radius:999px;padding:3px 8px;font-weight:800}",
      ".grass-map .rail-desktop-tools{padding-top:10px}",
      ".grass-map .scope-toggle{margin-bottom:10px}",
      ".grass-map .scope-btn.active{color:#a30f99;box-shadow:0 0 0 1px rgba(197,19,184,.14),0 2px 8px rgba(20,17,15,.06)}",
      ".grass-map .near-btn.primary{background:#c513b8!important;border-color:#c513b8!important;color:#fff!important}",
      ".grass-map .near-btn.primary:hover{filter:brightness(.95)}",
      "@media(max-width:900px){.grass-map .map-start-hint{font-size:.74rem}.grass-map .map-progressive{margin-top:8px}.grass-map .list-head{position:relative}.grass-map .tools-bar{gap:5px}.grass-map .tools-bar .tool-btn{font-size:.72rem;padding:6px 4px}}",
      "@media(max-width:380px){.grass-map .tools-bar{grid-template-columns:1fr 1fr}.grass-map .tools-bar .tool-btn:last-child{grid-column:1/-1}}"
    ].join("");
    document.head.appendChild(style);
  }

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
    injectStyles();

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

    var listTitle = document.getElementById("listTitle");
    if (listTitle && !listTitle.dataset.progressiveCopy) {
      listTitle.dataset.progressiveCopy = "true";
      listTitle.textContent = "Sales to explore";
    }

    var listCount = document.getElementById("listCount");
    if (listCount) listCount.setAttribute("aria-label", "Number of matching sales");

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
