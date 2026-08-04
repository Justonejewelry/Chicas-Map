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

  const CAPE = "assets/file_000000009f8c71fda0f56075f84270f7.png";
  const NAP = "assets/chica/napping.jpg";
  const HUMAN = "assets/1.jpg";
  const NEW_PIC = "chicarar.jpg"; // uploaded for Backyard

  // One of each — no duplicates
  const CHICA_GALLERY = [
    {
      key: "cape",
      src: CAPE,
      fallback: CAPE,
      alt: "Chica in a red superhero cape",
      caption: "Super Chica",
    },
    {
      key: "chicarar",
      src: NEW_PIC,
      fallback: NAP,
      alt: "Chica",
      caption: "Chica in the backyard",
    },
    {
      key: "napping",
      src: NAP,
      fallback: NAP,
      alt: "Chica napping",
      caption: "Power nap mode",
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
    if (!gallery) return;

    // Hero prefers new backyard photo, then cape
    wireImg(hero, NEW_PIC, CAPE);
    if (hero) hero.alt = "Chica";
    wireImg(avatar, NAP, CAPE);
    if (avatar) avatar.alt = "Chica";

    gallery.innerHTML = CHICA_GALLERY.map(
      (p) => `<figure class="mc-fig">
          <img src="${esc(p.src)}" alt="${esc(p.alt)}" loading="lazy" decoding="async"
            onerror="this.onerror=null;this.src='${esc(p.fallback)}'" />
          <figcaption>${esc(p.caption)}</figcaption>
        </figure>`
    ).join("");
  }

  function showPost(post) {
    document.querySelector(".by-grid")?.classList.add("hidden");
    ["meetCheeks", "featuredAdventure", "chicaTalk", "shareSection", "commentSection"].forEach((id) => {
      document.getElementById(id)?.classList.add("hidden");
    });
    const view = document.getElementById("postView");
    view.classList.remove("hidden");
    document.getElementById("postTitle").textContent = post.title;
    document.getElementById("postMeta").textContent =
      formatDate(post.date) + (post.tags ? " · " + post.tags.join(" · ") : "");
    document.getElementById("postBody").textContent = post.body || post.excerpt || "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function hidePost() {
    document.getElementById("postView")?.classList.add("hidden");
    document.querySelector(".by-grid")?.classList.remove("hidden");
    ["meetCheeks", "featuredAdventure", "chicaTalk", "shareSection", "commentSection"].forEach((id) => {
      document.getElementById(id)?.classList.remove("hidden");
    });
  }

  function renderBlog(posts) {
    const el = document.getElementById("blogList");
    if (!el) return;
    if (!posts.length) {
      el.innerHTML = '<p class="excerpt">No posts yet — check back after the next weekend pass.</p>';
      return;
    }
    el.innerHTML = posts
      .map(
        (p, i) => `<article class="by-card" data-i="${i}">
        <div class="date">${esc(formatDate(p.date))}</div>
        <h4>${esc(p.title)}</h4>
        <p class="excerpt">${esc(p.excerpt || "")}</p>
        <div class="by-tags">${(p.tags || []).map((t) => `<span class="by-tag">${esc(t)}</span>`).join("")}</div>
      </article>`
      )
      .join("");
    el.querySelectorAll("[data-i]").forEach((card) => {
      card.addEventListener("click", () => showPost(posts[+card.dataset.i]));
    });
  }

  function renderVideos(videos) {
    const el = document.getElementById("videoList");
    if (!el) return;
    if (!videos.length) {
      el.innerHTML = '<p class="excerpt">Weekly videos will land here.</p>';
      return;
    }
    const list = videos.filter((v) => !v.featured);
    el.innerHTML = list
      .map((v) => {
        const hasYt = v.youtube_id && v.status !== "placeholder";
        const thumb = hasYt
          ? `<a href="https://www.youtube.com/watch?v=${esc(v.youtube_id)}" target="_blank" rel="noopener" class="by-video-thumb" style="background:url(https://img.youtube.com/vi/${esc(v.youtube_id)}/hqdefault.jpg) center/cover"><span class="play">▶</span></a>`
          : `<div class="by-video-thumb" style="background:url(${CAPE}) center/cover"><span class="play">▶</span><span style="position:absolute;bottom:10px;font-size:0.75rem;opacity:0.9;color:#fff;text-shadow:0 1px 2px #000">${v.status === "local" ? "Local" : "Coming soon"}</span></div>`;
        return `<article class="by-video-card ${hasYt || v.status === "local" ? "" : "placeholder"}">
          ${thumb}
          <div class="by-video-body">
            <h4>${esc(v.title)}</h4>
            <p>${esc(v.description || "")}</p>
            <div class="by-video-meta">${esc(formatDate(v.date))}${v.duration ? " · " + esc(v.duration) : ""}</div>
          </div>
        </article>`;
      })
      .join("");
  }

  function talkToChica() {
    const msg = document.getElementById("ctMessage");
    if (!msg) return;
    msg.textContent = tips[tipIndex % tips.length];
    tipIndex++;
  }

  function boot() {
    renderMeetChica();
    document.getElementById("btnBackPosts")?.addEventListener("click", hidePost);
    document.getElementById("btnTalk")?.addEventListener("click", talkToChica);
    document.getElementById("btnTip")?.addEventListener("click", talkToChica);
    document.getElementById("ctAvatar")?.addEventListener("click", talkToChica);

    fetch("data/backyard.json")
      .then((res) => res.json())
      .then((data) => {
        if (data.tips && data.tips.length) tips = data.tips;
        renderBlog(data.blog || []);
        renderVideos(data.videos || []);
      })
      .catch(() => {
        const b = document.getElementById("blogList");
        const v = document.getElementById("videoList");
        if (b) b.textContent = "Could not load backyard posts.";
        if (v) v.textContent = "Could not load videos.";
      });
  }

  boot();
})();
