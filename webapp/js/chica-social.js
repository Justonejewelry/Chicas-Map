/**
 * Chica social share / follow bar
 * - Detail sheet (full width)
 * - Home footer
 * - Map bottom-right overlay (compact)
 */
(function () {
  var MAP_URL = "https://justonejewelry.github.io/Chicas-Map/map.html";
  var HOME_URL = "https://justonejewelry.github.io/Chicas-Map/";
  var SHARE_TITLE = "Chica Map — San Antonio garage sales (verified, no ads)";
  var SHARE_TEXT = "Find verified garage, yard, and estate sales in San Antonio. Local. Veteran owned. No ads.";

  var LINKS = [
    { id: "snapchat", label: "Share on Snapchat", href: "https://www.snapchat.com/", title: "Share on Snapchat" },
    { id: "nextdoor", label: "Share on Nextdoor", href: "https://nextdoor.com/", title: "Share on Nextdoor" },
    { id: "instagram", label: "Share on Instagram", href: "https://www.instagram.com/", title: "Share on Instagram" },
    { id: "facebook", label: "Follow on Facebook", href: "https://www.facebook.com/61593215043603/", title: "Follow Chica Map on Facebook" },
    { id: "tiktok", label: "Follow on TikTok", href: "https://www.tiktok.com/@chicas_map", title: "Follow @chicas_map on TikTok" },
    {
      id: "reddit",
      label: "Share on Reddit",
      href: "https://www.reddit.com/submit?url=" + encodeURIComponent(MAP_URL) + "&title=" + encodeURIComponent(SHARE_TITLE),
      title: "Share Chica Map on Reddit",
    },
  ];

  function assetBase() {
    return "assets/social/";
  }

  function buildBar(opts) {
    opts = opts || {};
    var size = opts.size || "full";
    var className = "chica-social-bar chica-social-" + size + (opts.className ? " " + opts.className : "");

    var wrap = document.createElement("nav");
    wrap.className = className;
    wrap.setAttribute("aria-label", "Share and follow Chica Map");

    var frame = document.createElement("div");
    frame.className = "chica-social-frame";

    var pic = document.createElement("picture");
    var srcWebp = document.createElement("source");
    srcWebp.type = "image/webp";
    srcWebp.srcset = assetBase() + (size === "sm" ? "share-bar-sm.webp" : "share-bar.webp");
    var img = document.createElement("img");
    img.src = assetBase() + (size === "sm" ? "share-bar-sm.png" : "share-bar.png");
    img.alt = "Share on Snapchat, Nextdoor, Instagram, Reddit · Follow on Facebook and TikTok";
    img.loading = "lazy";
    img.decoding = "async";
    img.width = size === "sm" ? 300 : 720;
    img.height = size === "sm" ? 72 : 172;
    pic.appendChild(srcWebp);
    pic.appendChild(img);
    frame.appendChild(pic);

    var hit = document.createElement("div");
    hit.className = "chica-social-hits";
    hit.setAttribute("role", "presentation");

    LINKS.forEach(function (item) {
      var a = document.createElement("a");
      a.className = "chica-social-hit";
      a.href = item.href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.title = item.title;
      a.setAttribute("aria-label", item.label);
      a.dataset.platform = item.id;
      if (item.id === "snapchat" || item.id === "nextdoor" || item.id === "instagram") {
        a.addEventListener("click", function (e) {
          if (navigator.share) {
            e.preventDefault();
            navigator
              .share({ title: SHARE_TITLE, text: SHARE_TEXT, url: MAP_URL })
              .catch(function () {
                window.open(item.href, "_blank", "noopener");
              });
          }
        });
      }
      hit.appendChild(a);
    });

    frame.appendChild(hit);
    wrap.appendChild(frame);
    return wrap;
  }

  function injectHome() {
    if (document.getElementById("chicaSocialHome")) return;
    var foot = document.querySelector(".cm-foot .foot-bottom") || document.querySelector(".cm-foot");
    if (!foot) return;
    var host = document.createElement("div");
    host.id = "chicaSocialHome";
    host.className = "chica-social-home wrap";
    host.appendChild(buildBar({ size: "full" }));
    if (foot.classList && foot.classList.contains("foot-bottom")) {
      foot.parentNode.insertBefore(host, foot);
    } else {
      foot.appendChild(host);
    }
  }

  function injectMapOverlay() {
    if (document.getElementById("chicaSocialMap")) return;
    var stage = document.querySelector(".map-wrap") || document.querySelector(".map-stage");
    if (!stage) return;
    var host = document.createElement("div");
    host.id = "chicaSocialMap";
    host.className = "chica-social-map-overlay";
    host.appendChild(buildBar({ size: "sm" }));
    stage.appendChild(host);
  }

  function injectDetail(body) {
    if (!body || body.querySelector(".chica-social-detail")) return;
    var host = document.createElement("div");
    host.className = "chica-social-detail";
    host.appendChild(buildBar({ size: "full" }));
    body.appendChild(host);
  }

  window.ChicaSocial = {
    buildBar: buildBar,
    injectDetail: injectDetail,
    injectHome: injectHome,
    injectMapOverlay: injectMapOverlay,
  };

  function ensureCss() {
    if (document.getElementById("chicaSocialCss")) return;
    var link = document.createElement("link");
    link.id = "chicaSocialCss";
    link.rel = "stylesheet";
    link.href = "css/chica-social.css";
    document.head.appendChild(link);
  }

  function start() {
    ensureCss();
    injectHome();
    injectMapOverlay();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
