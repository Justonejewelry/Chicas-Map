/* Adds a "Follow Chica" row of social links to the site footer on every page. */
(function () {
  var L = [
    ["TikTok", "@chicasmap", "https://www.tiktok.com/@chicasmap", '<path d="M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.1v12.4a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V9.7a5.7 5.7 0 1 0 4.9 5.7V9.1a7.3 7.3 0 0 0 4.3 1.4V7.4a4.3 4.3 0 0 1-3.2-1.6Z"/>'],
    ["Instagram", "@just1jewelry", "https://www.instagram.com/just1jewelry/", '<path d="M12 7.3a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4Zm0 7.7a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm6-7.9a1.1 1.1 0 1 1-2.2 0 1.1 1.1 0 0 1 2.2 0ZM12 2.5c-2.6 0-2.9 0-3.9.1-3.5.2-5.3 2-5.5 5.5-.1 1-.1 1.3-.1 3.9s0 2.9.1 3.9c.2 3.5 2 5.3 5.5 5.5 1 .1 1.3.1 3.9.1s2.9 0 3.9-.1c3.5-.2 5.3-2 5.5-5.5.1-1 .1-1.3.1-3.9s0-2.9-.1-3.9c-.2-3.5-2-5.3-5.5-5.5-1-.1-1.3-.1-3.9-.1Zm0 1.7c2.5 0 2.8 0 3.8.1 2.5.1 3.7 1.3 3.8 3.8.1 1 .1 1.3.1 3.8s0 2.8-.1 3.8c-.1 2.5-1.3 3.7-3.8 3.8-1 .1-1.3.1-3.8.1s-2.8 0-3.8-.1c-2.5-.1-3.7-1.3-3.8-3.8-.1-1-.1-1.3-.1-3.8s0-2.8.1-3.8C4.5 5.6 5.7 4.4 8.2 4.3c1-.1 1.3-.1 3.8-.1Z"/>'],
    ["X", "@justinraineys", "https://x.com/justinraineys", '<path d="M17.8 3h3.1l-6.8 7.7 8 10.3h-6.2l-4.9-6.3L5.4 21H2.3l7.2-8.2L1.8 3h6.4l4.4 5.8L17.8 3Zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5Z"/>'],
    ["Facebook", "Chica", "https://www.facebook.com/61593215043603/", '<path d="M14 8.5V6.6c0-.9.6-1.1 1-1.1h2.6V2h-3.6C10 2 9.2 4.9 9.2 6.8v1.7H6.8V12h2.4v10H14V12h3.2l.4-3.5H14Z"/>']
  ];
  var es = String(document.documentElement.lang || "").toLowerCase().indexOf("es") === 0;
  function add() {
    if (document.getElementById("chica-socials")) return true;
    var fs = document.querySelectorAll("footer"); if (!fs.length) return false;
    var f = fs[fs.length - 1];
    var d = document.createElement("nav"); d.id = "chica-socials"; d.setAttribute("aria-label", es ? "Sigue a Chica" : "Follow Chica");
    d.style.cssText = "max-width:72rem;margin:0 auto;padding:18px 20px;display:flex;flex-wrap:wrap;align-items:center;gap:10px;border-top:1px solid var(--chica-line,rgba(127,127,127,.25))";
    d.innerHTML = '<span style="font:700 11px/1 Inter,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;opacity:.75;margin-right:4px">' + (es ? "Sigue a Chica" : "Follow Chica") + "</span>" +
      L.map(function (s) {
        return '<a href="' + s[2] + '" target="_blank" rel="noopener noreferrer" title="' + s[0] + " " + s[1] + '" style="display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 14px;border-radius:999px;background:#c513af;color:#fff;text-decoration:none;font:650 13px/1 Inter,system-ui,sans-serif;border:1px solid rgba(255,255,255,.35)">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + s[3] + "</svg><span>" + s[1] + '</span><span style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)"> ' + s[0] + (es ? " (se abre en otra pestaña)" : " (opens in a new tab)") + "</span></a>";
      }).join("");
    f.appendChild(d); return true;
  }
  var n = 0; (function tick() { add(); if (++n > 40) return; setTimeout(tick, 500); })();
})();
