/* Home reels. Popup player. Does not navigate away. */
(function () {
  var BASE = "/Chicas-Map";
  var REELS = [
    { id: "1860708111589364", title: "Montrose Market today", poster: BASE + "/media/reels/1860708111589364.jpg", url: "https://www.facebook.com/reel/1860708111589364/" },
    { id: "2109875397081152", title: "Find the sale", poster: BASE + "/media/reels/2109875397081152.jpg", url: "https://www.facebook.com/reel/2109875397081152/" },
    { id: "2238045126762300", title: "San Antonio heat", poster: BASE + "/media/reels/2238045126762300.jpg", url: "https://www.facebook.com/reel/2238045126762300/" },
    { id: "1061526163580861", title: "Chica's comedy special", poster: BASE + "/media/reels/1061526163580861.jpg", url: "https://www.facebook.com/reel/1061526163580861/" },
    { id: "4516692728598835", title: "Good morning San Antonio", poster: BASE + "/media/reels/4516692728598835.jpg", url: "https://www.facebook.com/reel/4516692728598835/" },
    { id: "894843870248831", title: "Saturday sniff: 167 sales", poster: BASE + "/media/reels/894843870248831.jpg", url: "https://www.facebook.com/reel/894843870248831/" },
    { id: "3632339963583250", title: "Stop driving in circles", poster: BASE + "/media/reels/3632339963583250.jpg", url: "https://www.facebook.com/reel/3632339963583250/" },
    { id: "1695212742321208", title: "Chica knows where the sales are", poster: BASE + "/media/reels/1695212742321208.jpg", url: "https://www.facebook.com/reel/1695212742321208/" },
    { id: "1811119236999408", title: "Chica walks the River Walk", poster: BASE + "/media/reels/1811119236999408.jpg", url: "https://www.facebook.com/reel/1811119236999408/" },
    { id: "2211224122785433", title: "Chica's Map reel", poster: BASE + "/media/reels/2211224122785433.jpg", url: "https://www.facebook.com/reel/2211224122785433/" },
    { id: "941296032383365", title: "List it. Sell it. Done.", poster: BASE + "/media/reels/941296032383365.jpg", url: "https://www.facebook.com/reel/941296032383365/" },
    { id: "28092555497094019", title: "The free weekend sale map", poster: BASE + "/media/reels/28092555497094019.jpg", url: "https://www.facebook.com/reel/28092555497094019/" },
    { id: "2150987092158248", title: "Sunday's sale map is live", poster: BASE + "/media/reels/2150987092158248.jpg", url: "https://www.facebook.com/reel/2150987092158248/" },
    { id: "1066032512685205", title: "Chica es buena bailando", poster: BASE + "/media/reels/1066032512685205.jpg", url: "https://www.facebook.com/reel/1066032512685205/" },
    { id: "2503375753499695", title: "Smarter than a chihuahua?", poster: BASE + "/media/reels/2503375753499695.jpg", url: "https://www.facebook.com/reel/2503375753499695/" },
    { id: "4713793582279330", title: "Happy hunting", poster: BASE + "/media/reels/4713793582279330.jpg", url: "https://www.facebook.com/reel/4713793582279330/" },
    { id: "2598871140560320", title: "¡Gracias, San Antonio!", poster: BASE + "/media/reels/2598871140560320.jpg", url: "https://www.facebook.com/reel/2598871140560320/" },
    { id: "2810367082676790", title: "Always free to see", poster: BASE + "/media/reels/2810367082676790.jpg", url: "https://www.facebook.com/reel/2810367082676790/" },
    { id: "930478426780108", title: "New features", poster: BASE + "/media/reels/930478426780108.jpg", url: "https://www.facebook.com/reel/930478426780108/" },
    { id: "2983506971993287", title: "Chica's Map reel", poster: BASE + "/media/reels/2983506971993287.jpg", url: "https://www.facebook.com/reel/2983506971993287/" },
    { id: "1568526414742824", title: "Saturday treasure trail", poster: BASE + "/media/reels/1568526414742824.jpg", url: "https://www.facebook.com/reel/1568526414742824/" },
    { id: "3306054932910171", title: "Best sales this weekend", poster: BASE + "/media/reels/3306054932910171.jpg", url: "https://www.facebook.com/reel/3306054932910171/" },
    { id: "1538315900891586", title: "This weekend's best sales", poster: BASE + "/media/reels/1538315900891586.jpg", url: "https://www.facebook.com/reel/1538315900891586/" },
    { id: "936798232145594", title: "Chica is spreading the word", poster: BASE + "/media/reels/936798232145594.jpg", url: "https://www.facebook.com/reel/936798232145594/" },
    { id: "1381637970779173", title: "Hola, soy Chica", poster: BASE + "/media/reels/1381637970779173.jpg", url: "https://www.facebook.com/reel/1381637970779173/" },
    { id: "1603083818016571", title: "Local and veteran owned", poster: BASE + "/media/reels/1603083818016571.jpg", url: "https://www.facebook.com/reel/1603083818016571/" }
  ];
  function home() {
    if (document.documentElement.hasAttribute("data-home-static")) return true;
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
      b.innerHTML = '<img loading="lazy" alt="' + reel.title.replace(/"/g, "") + ' reel thumbnail" src="' + reel.poster + '"><span>' + reel.title + "</span>";
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
    s.textContent = "#chica-home-reels{padding:28px 16px 36px;border-top:1px solid rgba(255,255,255,.08)}#chica-home-reels h2{margin:0 0 12px;font:700 22px/1.2 Inter,system-ui,sans-serif}#chica-home-reels .rail{display:flex;gap:12px;overflow-x:auto;padding-bottom:8px;scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch}#chica-home-reels button{flex:0 0 148px;min-height:220px;padding:0;border-radius:16px;overflow:hidden;text-align:left;cursor:pointer;scroll-snap-align:start}#chica-home-reels img{display:block;width:100%;height:180px;object-fit:cover}#chica-home-reels span{display:block;padding:8px 10px 10px;font:700 13px/1.2 Inter,system-ui,sans-serif}#chica-reel-dialog{position:fixed;inset:0;z-index:400;display:flex;align-items:flex-end;justify-content:center}#chica-reel-dialog[hidden]{display:none}#chica-reel-dialog .scrim{position:absolute;inset:0;background:rgba(0,0,0,.62)}#chica-reel-dialog .sheet{position:relative;width:min(420px,100%);margin:0 10px 12px;padding:12px;border-radius:18px;background:rgba(18,18,18,.78);border:1px solid rgba(255,255,255,.22);backdrop-filter:blur(16px)}#chica-reel-dialog .close{min-height:44px;margin-bottom:8px;padding:0 16px;border-radius:999px;cursor:pointer}#chica-reel-dialog iframe{width:100%;height:72vh;border:0;border-radius:12px;background:#000}";
    document.head.appendChild(s);
  }
  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape") close(); });
  function run() { css(); mount(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
  setInterval(run, 900);
})();
