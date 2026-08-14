(function () {
  // ---- Hero image rotation (different on every visit) ----
  var heroImages = [
    "assets/backyard/webapp:assets:backyard:chica-doghouse.png",
    "assets/backyard/chica-at-computer.jpg",
    "assets/backyard/chica-cape-finds.jpg",
    "assets/backyard/chica-garage-sale.jpg"
  ];

  function rotateHero() {
    var img = document.getElementById("chicaHero");
    if (!img) return;
    var pick = heroImages[Math.floor(Math.random() * heroImages.length)];
    img.src = pick;
    img.onerror = function () {
      // fallback to doghouse if any image fails
      this.onerror = null;
      this.src = heroImages[0];
    };
  }

  // ---- Daily posts (one a day) ----
  // These will be introduced one per day.
  var dailyPosts = [
    {
      day: 1,
      title: "How It Started",
      body: `It started with a quiet, stubborn truth most people already knew but kept pretending wasn’t true: finding a good garage sale shouldn’t mean opening twelve tabs, chasing dead links, and discovering the whole thing ended three days ago while you were still trying to figure out which side of the street the address was on.

So Chica started sniffing.

She searches.  
She follows every trail that still has a scent on it.  
She checks the listings the way a dog checks a trash can—thorough, unsentimental, a little suspicious.  
She strips away the noise.  
Then she puts the real treasure on a map and leaves it there for the Pack.`
    },
    {
      day: 2,
      title: "Why Chica",
      body: `Why Chica?

Because somebody had to do the work. The information is scattered across half the internet and every community page that ever got half-abandoned. People shouldn’t have to dig through the same five sites, open the same listings twice, compare the ones that are basically the same sale with different photos, guess which ones are still happening, hunt for addresses that were never properly written down, or rebuild a route from memory while the coffee gets cold.

Chica absorbs the friction.  
That’s the deal.

Humans have jobs.  
Chica has a nose.`
    },
    {
      day: 3,
      title: "One Little Chica vs. The Big Dogs",
      body: `There are large companies doing pieces of what she’s trying. They have teams. They have budgets. They have marketing departments and more commas in their funding rounds than Chica has bones in her whole body.

Chica has a map, a laptop that runs hot, a stubborn streak, and a Pack that keeps showing up. She’s doing her best with what she’s got.

She’s not trying to outgrow the giants.  
She’s trying to be useful.  
She’s trying to make the hunt cleaner and faster and a little more human for regular people who still believe the good stuff is out there if somebody just bothers to look properly.

Local. Independent. Community-powered.  
That’s the whole argument.`
    },
    {
      day: 4,
      title: "What Happens Behind the Map",
      body: `Chica does the internet work so you can spend your time finding things.

1. Sniff — She searches the web and the public places that still publish this kind of information.  
2. Follow — She tracks the links down to the actual listings and original sources when they still exist.  
3. Check — Dates, times, addresses, descriptions, whether the sale is still breathing.  
4. Clean — Duplicates and dead weight get cut.  
5. Map — What’s left gets organized onto the Chica Map.  
6. Share — She puts the useful daily information in front of the Pack.  
7. Improve — Every new source, every correction, every tip from someone who knows a neighborhood better than she does makes the system a little sharper.`
    },
    {
      day: 5,
      title: "This Isn’t Just Chica’s Project",
      body: `Every person who shares the map gives the whole thing a slightly larger nose.

It gets better when people participate. You can help by sharing it, by sending the sales she missed, by saying when something’s wrong, by pointing out a source that still works, by talking about the good finds, by telling a friend, or by supporting the work if that’s something you want to do.`
    }
  ];

  // Control which day is currently live (change this number when you want to advance)
  var CURRENT_DAY = 2;

  function renderDaily() {
    var el = document.getElementById("dailyPost");
    if (!el) return;
    var post = dailyPosts.find(function (p) { return p.day === CURRENT_DAY; }) || dailyPosts[0];
    el.innerHTML = "<strong>" + post.title + "</strong><br/><br/>" + post.body.replace(/\n/g, "<br/>");
  }

  // ---- Blog feed (future posts) ----
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, """);
  }

  function formatDate(d) {
    try {
      return new Date(d + "T12:00:00").toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (_) {
      return d || "";
    }
  }

  async function loadFeed() {
    var blog = document.getElementById("blogList");
    if (!blog) return;

    var data = null;
    try {
      var r = await fetch("data/backyard.json");
      if (r.ok) data = await r.json();
    } catch (_) {}

    var posts = (data && (data.blog || data.posts)) || [];
    if (!posts.length) {
      blog.innerHTML =
        '<p class="by-muted" style="text-align:center">New stories land here when Chica has something real to share. No invented finds.</p>';
      return;
    }

    blog.innerHTML = posts
      .map(function (p) {
        var excerpt = (p.excerpt || p.body || "").slice(0, 180);
        return (
          '<article class="by-blog-card">' +
          "<h3>" +
          esc(p.title || "Update") +
          "</h3>" +
          '<div class="meta">' +
          esc(formatDate(p.date || "")) +
          "</div>" +
          "<p>" +
          esc(excerpt) +
          (excerpt.length >= 180 ? "…" : "") +
          "</p>" +
          "</article>"
        );
      })
      .join("");
  }

  function init() {
    rotateHero();
    renderDaily();
    loadFeed();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
