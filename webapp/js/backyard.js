(function () {
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadFeed);
  } else {
    loadFeed();
  }
})();
