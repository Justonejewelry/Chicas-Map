// Super Chica cape photo loader
// Upload webapp/assets/chica-hero-cape.jpg then hard-refresh.
(function () {
  function apply(uri) {
    document.querySelectorAll('[data-chica-hero]').forEach(function (el) {
      el.src = uri;
    });
    var v = document.getElementById('adventureVideo');
    if (v) v.setAttribute('poster', uri);
  }
  var img = new Image();
  img.onload = function () { apply('assets/chica-hero-cape.jpg');
  };
  img.onerror = function () { /* keep SVG fallback */ };
  img.src = 'assets/chica-hero-cape.jpg';
})();
