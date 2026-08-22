/** Alias — map.html historically pointed here. Real logic lives in chica-go-fix.js + chica-open-fresh.js */
(function () {
  if (document.getElementById("chicaGoFixScript")) return;
  var s = document.createElement("script");
  s.id = "chicaGoFixScript";
  s.src = "js/chica-go-fix.js?v=fresh1";
  document.head.appendChild(s);
})();
