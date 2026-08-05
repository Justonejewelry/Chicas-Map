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
      return d;
    }
  }

  // Main photo: transparent chicarar.png (fallback to jpg)
  const MAIN = "chicarar.png";
  const MAIN_FALLBACK = "chicarar.jpg";
  const CAPE = "assets/cape.jpg";
  const HUMAN = "assets/1.jpg";

  const CHICA_GALLERY = [
    {
      key: "main",
      src: MAIN,
      fallback: MAIN_FALLBACK,
      alt: "Chica",
      caption: "Chica",
    },
    {
      key: "cape",
      src: CAPE,
      fallback: CAPE,
      alt: "Chica in a red superhero cape",
      caption: "Super Chica",
    },
    {
      key: "human",
      src: HUMAN,
      fallback: HUMAN,
      alt: "Chica and her human",
      caption: "Chica & her human",
    },
  ];

  const DEFAULT_TIPS = [
    "Get there before 9 — the good tools disappear first.",
    "Estate sales often have the mid-century furniture. Garage sales have the surprises.",
    "Hot zones this weekend: Fair Oaks, Alamo Ranch, Helotes.",
    "96 degrees. Hydrate. And wipe your paws.",
    "Star a sale if you plan to go. I'll help you build a route.",
    "Near Me works best with a ZIP. Try 78254 or 78015.",
    "I nap hard. You hunt hard. Deal?",
  ];

  let tips = DEFAULT_TIPS.slice();
  let tipIndex = 0;

  function wireImg(el, src, fallback) {
    if (!el) return;
    el.loading = "lazy";
    el.decoding = "async";
    el.onerror = function () {
      if (fallback && this.src.indexOf(fallback) === -1) this.src = fallback;
      else if (this.parentElement) this.parentElement.classList.add("missing");
    };
    el.src = src;
  }

  function renderMeetChica() {
    const gallery = document.getElementById("mcGallery");
    const hero = document.getElementById("mcHero");
    const avatar = document.getElementById("ctAvatar");
    wireImg(hero, MAIN, MAIN_FALLBACK);
    wireImg(avatar, MAIN, MAIN_FALLBACK);
    if (!gallery) return;
    gallery.innerHTML = CHICA_GALLERY.map(
      (g) =>
        `<figure class="mc-shot" data-key="${esc(g.key)}">
          <img src="${esc(g.src)}" alt="${esc(g.alt)}" loading="lazy" decoding="async" />
          <figcaption>${esc(g.caption)}</figcaption>
        </figure>`
    ).join("");
    gallery.querySelectorAll("img").forEach((img, i) => {
      const g = CHICA_GALLERY[i];
      if (g) wireImg(img, g.src, g.fallback);
    });
  }

  function setTip(i) {
    tipIndex = ((i % tips.length) + tips.length) % tips.length;
    const el = document.getElementById("ctMessage");
    if (el) el.textContent = tips[tipIndex];
  }

  function wireTalk() {
    document.getElementById("btnTalk")?.addEventListener("click", () => setTip(tipIndex + 1));
    document.getElementById("btnTip")?.addEventListener("click", () => {
      setTip(Math.floor(Math.random() * tips.length));
    });
  }

  async function loadFeed() {
    let data = null;
    try {
      const r = await fetch("data/backyard.json");
      if (r.ok) data = await r.json();
    } catch (_) {}
    const blog = document.getElementById("blogList");
    const videos = document.getElementById("videoList");
    if (data && data.tips && data.tips.length) tips = data.tips.concat(DEFAULT_TIPS);
    if (blog) {
      const posts = (data && data.posts) || [];
      blog.innerHTML = posts.length
        ? posts
            .map(
              (p) =>
                `<article class="by-post" data-id="${esc(p.id || p.title)}">
                  <h4>${esc(p.title)}</h4>
                  <div class="by-meta">${esc(formatDate(p.date || ""))}</div>
                  <p>${esc((p.excerpt || p.body || "").slice(0, 140))}</p>
                </article>`
            )
            .join("")
        : `<p class="comment-empty">New posts land here each week.</p>`;
      blog.querySelectorAll(".by-post").forEach((card) => {
        card.addEventListener("click", () => {
          const id = card.dataset.id;
          const post = posts.find((p) => (p.id || p.title) === id);
          if (!post) return;
          document.getElementById("postView")?.classList.remove("hidden");
          document.getElementById("postTitle").textContent = post.title || "";
          document.getElementById("postMeta").textContent = formatDate(post.date || "");
          document.getElementById("postBody").textContent = post.body || post.excerpt || "";
          document.getElementById("postView")?.scrollIntoView({ behavior: "smooth" });
        });
      });
    }
    if (videos) {
      const vids = (data && data.videos) || [];
      videos.innerHTML = vids.length
        ? vids
            .map(
              (v) =>
                `<article class="by-video">
                  <h4>${esc(v.title)}</h4>
                  <div class="by-meta">${esc(formatDate(v.date || ""))}</div>
                  <p>${esc(v.note || "")}</p>
                </article>`
            )
            .join("")
        : `<p class="comment-empty">Weekly video drops appear here.</p>`;
    }
    document.getElementById("btnBackPosts")?.addEventListener("click", () => {
      document.getElementById("postView")?.classList.add("hidden");
    });
  }

  renderMeetChica();
  wireTalk();
  loadFeed();
})();
