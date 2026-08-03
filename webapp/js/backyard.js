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

  // Official Chica photos — identical likeness only (real photos in assets/chica/)
  const CHICA_GALLERY = [
    {
      key: "smile",
      src: "assets/chica/smile.jpg",
      alt: "Chica smiling on her back, showing her teeth",
      caption: "The official Meet Cheeks smile",
    },
    {
      key: "cape",
      src: "assets/chica/cape.jpg",
      alt: "Chica in a sparkly blue superhero cape",
      caption: "Super Chica reporting for duty",
    },
    {
      key: "napping",
      src: "assets/chica/napping.jpg",
      alt: "Chica napping with tongue out on a purple blanket",
      caption: "Power nap mode: tongue deployed",
    },
    {
      key: "adventures",
      src: "assets/chica/adventures.jpg",
      alt: "Chica in a pink harness with her person",
      caption: "Adventure days with my human",
    },
  ];

  function renderMeetCheeks() {
    const gallery = document.getElementById("mcGallery");
    const hero = document.getElementById("mcHero");
    const headerImg = document.getElementById("headerChica");
    if (!gallery) return;

    const smile = CHICA_GALLERY[0];
    if (smile && hero) {
      hero.src = smile.src;
      hero.alt = smile.alt;
      hero.onerror = function () {
        this.style.display = "none";
      };
    }
    if (smile && headerImg) {
      headerImg.src = smile.src;
      headerImg.alt = "Chica";
    }

    gallery.innerHTML = CHICA_GALLERY.map(
      (p) => `<figure class="mc-fig">
          <img src="${esc(p.src)}" alt="${esc(p.alt)}" loading="lazy"
            onerror="this.parentElement.classList.add('missing')" />
          <figcaption>${esc(p.caption)}</figcaption>
        </figure>`
    ).join("");
  }

  function showPost(post) {
    document.querySelector(".by-grid")?.classList.add("hidden");
    document.getElementById("meetCheeks")?.classList.add("hidden");
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
    document.getElementById("meetCheeks")?.classList.remove("hidden");
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
    el.innerHTML = videos
      .map((v) => {
        const hasYt = v.youtube_id && v.status !== "placeholder";
        const thumb = hasYt
          ? `<a href="https://www.youtube.com/watch?v=${esc(v.youtube_id)}" target="_blank" rel="noopener" class="by-video-thumb" style="background:url(https://img.youtube.com/vi/${esc(v.youtube_id)}/hqdefault.jpg) center/cover"><span class="play">▶</span></a>`
          : `<div class="by-video-thumb"><span class="play">▶</span><span style="position:absolute;bottom:10px;font-size:0.75rem;opacity:0.9">Coming soon</span></div>`;
        return `<article class="by-video-card ${hasYt ? "" : "placeholder"}">
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

  async function boot() {
    renderMeetCheeks();
    document.getElementById("btnBackPosts")?.addEventListener("click", hidePost);
    try {
      const res = await fetch("data/backyard.json");
      const data = await res.json();
      renderBlog(data.blog || []);
      renderVideos(data.videos || []);
    } catch (e) {
      const b = document.getElementById("blogList");
      const v = document.getElementById("videoList");
      if (b) b.textContent = "Could not load backyard posts.";
      if (v) v.textContent = "Could not load videos.";
    }
  }

  boot();
})();
