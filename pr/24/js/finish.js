/* Phone header: keep brand, language, theme, menu. Desk links live in the menu. */
(function () {
  var DESK = { Sponsor: 1, "Add a sale": 1, "Sales Map": 1, "Crime Map": 1, Patrocinar: 1, "Agregar venta": 1 };
  function tidy() {
    if (window.innerWidth > 720) return;
    var header = document.querySelector("header");
    if (!header) return;
    var links = header.querySelectorAll("a");
    for (var i = 0; i < links.length; i++) {
      var t = (links[i].textContent || "").replace(/\s+/g, " ").trim();
      if (DESK[t]) links[i].setAttribute("data-chica-desk", "1");
    }
  }
  tidy();
  setInterval(tidy, 1000);
})();
