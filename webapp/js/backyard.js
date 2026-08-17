(function () {
  var heroImages = [
    "assets/backyard/chica-doghouse.png",
    "assets/backyard/chica-at-computer.jpg",
    "assets/backyard/chica-cape-finds.jpg",
    "assets/backyard/chica-garage-sale.jpg"
  ];

  function rotateHero() {
    var img = document.getElementById("chicaHero");
    if (!img) return;
    var pick = heroImages[Math.floor(Math.random() * heroImages.length)];
    var webpSource = document.getElementById("chicaHeroWebp");
    var webpMap = { "assets/backyard/chica-doghouse.png": "assets/backyard/chica-doghouse.webp" };
    var webp = webpMap[pick] || null;
    img.decoding = "async";
    img.loading = "eager";
    img.fetchPriority = "high";
    if (webpSource) {
      if (webp) webpSource.srcset = webp;
      else webpSource.removeAttribute("srcset");
    }
    img.src = pick;
    img.onerror = function () {
      this.onerror = null;
      this.src = "assets/backyard/chica-doghouse.png";
      if (webpSource) webpSource.srcset = "assets/backyard/chica-doghouse.webp";
    };
  }

  var dailyPosts = [
    { title: "How It Started", body: `It started with a quiet, stubborn truth: finding a good garage sale shouldn’t mean opening twelve tabs, chasing dead links, and discovering the whole thing ended three days ago while you were still trying to find the address.\n\nSo Chica started sniffing.\n\nShe searches. She follows trails. She checks listings. She strips away noise. Then she puts the useful information on a map and leaves it there for the Pack.` },
    { title: "Why Chica", body: `Why Chica?\n\nBecause somebody had to do the work. Local information is scattered across websites, social pages and old listings. People shouldn’t have to dig through all of it just to find out what is happening nearby.\n\nChica absorbs the friction. That’s the deal.\n\nHumans have jobs. Chica has a nose.` },
    { title: "One Little Chica vs. The Big Dogs", body: `There are large companies doing pieces of what she’s trying. They have teams, budgets and marketing departments.\n\nChica has a map, a laptop, a stubborn streak and a Pack that keeps showing up.\n\nShe isn’t trying to be the biggest. She is trying to be useful. Local. Independent. Community-powered.` },
    { title: "What Happens Behind the Map", body: `Chica does the internet work so you can spend your time finding things.\n\n1. Sniff — Find public listings and sources.\n2. Follow — Trace information back to its source.\n3. Check — Review dates, times, addresses and details.\n4. Clean — Reduce duplicates and dead information.\n5. Map — Organize useful discoveries geographically.\n6. Share — Put the information in front of the Pack.\n7. Improve — Use corrections and local knowledge to make the system better.` },
    { title: "This Isn’t Just Chica’s Project", body: `Every person who participates gives the map a slightly larger nose.\n\nShare the map. Send a sale Chica missed. Report something that changed. Suggest a useful source. Tell a friend. Support the work.\n\nA community map becomes powerful when the community participates.` }
  ];

  function getDailyPost() {
    var start = new Date(2026, 0, 1);
    var now = new Date();
    var day = Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - start) / 86400000);
    return dailyPosts[((day % dailyPosts.length) + dailyPosts.length) % dailyPosts.length];
  }

  function renderDaily() {
    var titleEl = document.getElementById("dailyTitle");
    var bodyEl = document.getElementById("dailyPost");
    if (!bodyEl) return;
    var post = getDailyPost();
    if (titleEl) titleEl.textContent = post.title;
    bodyEl.innerHTML = post.body.replace(/\n/g, "<br/>");
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function formatDate(d) {
    try { return new Date(d + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" }); }
    catch (_) { return d || ""; }
  }

  async function loadFeed() {
    var blog = document.getElementById("blogList");
    if (!blog) return;
    var data = null;
    try { var r = await fetch("data/backyard.json"); if (r.ok) data = await r.json(); } catch (_) {}
    var posts = (data && (data.blog || data.posts)) || [];
    if (!posts.length) {
      blog.innerHTML = '<p class="by-muted" style="text-align:center">New stories land here when Chica has something real to share. No invented finds.</p>';
      return;
    }
    blog.innerHTML = posts.map(function (p) {
      var excerpt = (p.excerpt || p.body || "").slice(0, 180);
      return '<article class="by-blog-card"><h3>' + esc(p.title || "Update") + '</h3><div class="meta">' + esc(formatDate(p.date || "")) + '</div><p>' + esc(excerpt) + (excerpt.length >= 180 ? "…" : "") + '</p></article>';
    }).join("");
  }

  function init() { rotateHero(); renderDaily(); loadFeed(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
