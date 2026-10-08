/* Home reels. Popup player. Does not navigate away. */
(function () {
  var BASE = "/Chicas-Map";
  var REELS = [
    { id: "weekend", title: "This weekend", poster: BASE + "/media/reel-weekend.jpg", url: "https://www.facebook.com/61593215043603/videos/1538315900891586/" },
    { id: "flys", title: "Weekend fly-by", poster: BASE + "/media/reel-1.jpg", url: "https://www.facebook.com/jay.sciaraffa/videos/1830161145021445/" },
    { id: "this-is-chica", title: "This is Chica", poster: BASE + "/media/reel-2.jpg", url: "https://www.facebook.com/jay.sciaraffa/videos/1997896027486170/" },
    { id: "citywide", title: "Citywide", poster: BASE + "/media/reel-citywide.jpg", url: "https://www.facebook.com/jay.sciaraffa/videos/1490119993157202/" },
    { id: "cape", title: "Cape on", poster: BASE + "/media/reel-cover.jpg", url: "https://www.facebook.com/61593215043603/videos/1538315900891586/" }
  ];
  function home() {
    var p = (location.pathname || "/").replace(/\/+$/, "") || "/";
    return p === BASE || p === BASE + "/index.html";
  }
  function es() { return String(document.documentElement.lang || "").toLowerCase().indexOf("es") === 0; }
  function dialog() {
    var d = document.getElementById("chica-reel-dialog");
    if (d) return d;
    d = document.createElement("div");
    d.id = "chica-reel-dialog";
    d.setAttribute("role", "dialog");
    d.setAttribute("aria-modal", "true");
    d.setAttribute("aria-label", "Chica reel");
    d.hidden = true;
    d.innerHTML = '<div class="scrim" data-close="1"></div><div class="sheet"><button type="button" class="close chica-glass" data-close="1">Close</button><div class="stage"></div></div>';
    d.addEventListener("click", function (ev) { if (ev.target && ev.target.getAttribute("data-close") === "1") close(); });
    document.body.appendChild(d);
    return d;
  }
  function close() {
    var d = document.getElementById("chica-reel-dialog");
    if (!d) return;
    d.hidden = true;
    d.querySelector(".stage").textContent = "";
    document.body.style.overflow = "";
  }
  function open(reel) {
    var d = dialog();
    var src = "https://www.facebook.com/plugins/video.php?href=" + encodeURIComponent(reel.url) + "&show_text=false&width=360";
    d.querySelector(".stage").innerHTML = '<iframe title="' + reel.title.replace(/"/g, "") + '" src="' + src + '" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>';
    d.hidden = false;
    document.body.style.overflow = "hidden";
    d.querySelector(".close").focus();
  }
  function mount() {
    if (!home() || document.getElementById("chica-home-reels")) return;
    var main = document.querySelector("main");
    if (!main) return;
    var sec = document.createElement("section");
    sec.id = "chica-home-reels";
    sec.setAttribute("data-chica-keep", "1");
    sec.setAttribute("aria-label", es() ? "Reels de Chica" : "Chica reels");
    var head = document.createElement("h2");
    head.textContent = es() ? "Reels de Chica" : "Chica’s reels";
    var rail = document.createElement("div");
    rail.className = "rail";
    REELS.forEach(function (reel) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chica-reel-play chica-glass";
      b.setAttribute("aria-label", (es() ? "Reproducir " : "Play ") + reel.title);
      b.innerHTML = '<img alt="" src="' + reel.poster + '"><span>' + reel.title + "</span>";
      b.addEventListener("click", function () { open(reel); });
      rail.appendChild(b);
    });
    sec.appendChild(head);
    sec.appendChild(rail);
    main.appendChild(sec);
  }
  function css() {
    if (document.getElementById("chica-reels-css")) return;
    var s = document.createElement("style");
    s.id = "chica-reels-css";
    s.textContent = "#chica-home-reels{padding:28px 16px 36px;border-top:1px solid rgba(255,255,255,.08)}#chica-home-reels h2{margin:0 0 12px;font:700 22px/1.2 Inter,system-ui,sans-serif}#chica-home-reels .rail{display:flex;gap:12px;overflow-x:auto;padding-bottom:8px}#chica-home-reels button{flex:0 0 148px;min-height:220px;padding:0;border-radius:16px;overflow:hidden;text-align:left;cursor:pointer}#chica-home-reels img{display:block;width:100%;height:180px;object-fit:cover}#chica-home-reels span{display:block;padding:8px 10px 10px;font:700 13px/1.2 Inter,system-ui,sans-serif}#chica-reel-dialog{position:fixed;inset:0;z-index:400;display:flex;align-items:flex-end;justify-content:center}#chica-reel-dialog[hidden]{display:none}#chica-reel-dialog .scrim{position:absolute;inset:0;background:rgba(0,0,0,.62)}#chica-reel-dialog .sheet{position:relative;width:min(420px,100%);margin:0 10px 12px;padding:12px;border-radius:18px;background:rgba(18,18,18,.78);border:1px solid rgba(255,255,255,.22);backdrop-filter:blur(16px)}#chica-reel-dialog .close{min-height:44px;margin-bottom:8px;padding:0 16px;border-radius:999px;cursor:pointer}#chica-reel-dialog iframe{width:100%;height:72vh;border:0;border-radius:12px;background:#000}";
    document.head.appendChild(s);
  }
  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape") close(); });
  function run() { css(); mount(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
  setInterval(run, 900);
})();
