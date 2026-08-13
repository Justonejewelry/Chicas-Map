/**
 * Chica PWA — Install / Add to Home Screen + exit thank-you
 * Aurora Voss: one calm CTA, platform-aware, never aggressive.
 */
(function (global) {
  let deferredPrompt = null;
  let installed = false;
  let exitShownThisSession = false;
  const EXIT_KEY = "chica_exit_thanks_at";
  const EXIT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
  const MIN_DWELL_MS = 18000; // wait ~18s before exit prompt is allowed
  const pageOpenedAt = Date.now();

  function isIos() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
  }

  function ensureStyles() {
    if (document.getElementById("chicaPwaStyles")) return;
    var css = document.createElement("style");
    css.id = "chicaPwaStyles";
    css.textContent = [
      ".chica-toast{position:fixed;left:50%;bottom:88px;transform:translateX(-50%) translateY(12px);",
      "background:#145530;color:#fff;padding:10px 16px;border-radius:12px;font-size:.9rem;font-weight:600;",
      "box-shadow:0 10px 28px rgba(15,23,42,.2);opacity:0;pointer-events:none;z-index:120;",
      "transition:opacity .2s ease,transform .2s ease;max-width:min(92vw,360px);text-align:center}",
      ".chica-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}",
      ".chica-ios-sheet,.chica-exit-sheet{position:fixed;inset:0;z-index:110;display:none;align-items:flex-end;",
      "justify-content:center;padding:16px;padding-bottom:max(16px,env(safe-area-inset-bottom))}",
      ".chica-ios-sheet.open,.chica-exit-sheet.open{display:flex}",
      ".chica-ios-backdrop,.chica-exit-backdrop{position:absolute;inset:0;background:rgba(15,23,42,.45)}",
      ".chica-ios-card,.chica-exit-card{position:relative;width:min(100%,400px);background:#fff;border-radius:18px;",
      "padding:22px 20px 18px;box-shadow:0 20px 50px rgba(15,23,42,.25);color:#14110f;",
      "font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}",
      ".chica-ios-close,.chica-exit-close{position:absolute;top:10px;right:12px;border:0;background:transparent;",
      "font-size:22px;line-height:1;color:#7a736b;cursor:pointer;padding:6px}",
      ".chica-ios-card h3,.chica-exit-card h3{margin:0 0 8px;font-size:1.15rem;font-weight:800;color:#145530}",
      ".chica-ios-card p,.chica-exit-card p{margin:0 0 12px;font-size:.95rem;line-height:1.45;color:#3f3a34}",
      ".chica-ios-card ol{margin:0 0 12px;padding-left:1.2rem;font-size:.92rem;line-height:1.55;color:#3f3a34}",
      ".chica-ios-hint{font-size:.82rem!important;color:#7a736b!important}",
      ".chica-exit-actions{display:flex;flex-direction:column;gap:8px;margin-top:14px}",
      ".chica-exit-btn{border:0;border-radius:12px;padding:12px 14px;font-weight:700;font-size:.95rem;cursor:pointer}",
      ".chica-exit-btn.primary{background:#1a6b3c;color:#fff}",
      ".chica-exit-btn.ghost{background:#f3f1ec;color:#145530}",
      ".chica-exit-btn:active{opacity:.88}",
      ".chica-exit-paw{font-size:1.4rem;margin-bottom:4px}",
      "@media(min-width:720px){.chica-ios-sheet,.chica-exit-sheet{align-items:center}}",
    ].join("");
    document.head.appendChild(css);
  }

  function showToast(msg) {
    ensureStyles();
    var el = document.getElementById("chicaToast");
    if (!el) {
      el = document.createElement("div");
      el.id = "chicaToast";
      el.className = "chica-toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () { el.classList.remove("show"); }, 2800);
  }

  function hideInstallButtons() {
    document.querySelectorAll("[data-chica-install]").forEach(function (b) {
      b.hidden = true;
      b.setAttribute("aria-hidden", "true");
    });
  }

  function showInstallButtons() {
    if (isStandalone() || installed) {
      hideInstallButtons();
      return;
    }
    document.querySelectorAll("[data-chica-install]").forEach(function (b) {
      b.hidden = false;
      b.removeAttribute("aria-hidden");
    });
  }

  function openIosSheet() {
    ensureStyles();
    var sheet = document.getElementById("chicaIosSheet");
    if (!sheet) {
      sheet = document.createElement("div");
      sheet.id = "chicaIosSheet";
      sheet.className = "chica-ios-sheet";
      sheet.setAttribute("role", "dialog");
      sheet.setAttribute("aria-label", "Add to Home Screen");
      sheet.innerHTML =
        '<div class="chica-ios-backdrop" data-close></div>' +
        '<div class="chica-ios-card">' +
        '<button type="button" class="chica-ios-close" data-close aria-label="Close">\u00d7</button>' +
        "<h3>Add Chica to your Home Screen</h3>" +
        "<p>Get the map in one tap \u2014 no App Store needed.</p>" +
        "<ol>" +
        "<li>Tap the <strong>Share</strong> button in Safari\u2019s toolbar</li>" +
        "<li>Scroll and tap <strong>Add to Home Screen</strong></li>" +
        "<li>Tap <strong>Add</strong></li>" +
        "</ol>" +
        '<p class="chica-ios-hint">Works best in Safari on iPhone & iPad.</p>' +
        '<button type="button" class="chica-exit-btn primary" data-close style="width:100%">Got it</button>' +
        "</div>";
      document.body.appendChild(sheet);
      sheet.querySelectorAll("[data-close]").forEach(function (el) {
        el.addEventListener("click", function () { sheet.classList.remove("open"); });
      });
    }
    sheet.classList.add("open");
  }

  async function triggerInstall(btn) {
    if (isStandalone()) {
      showToast("Chica is already on your home screen");
      return;
    }
    if (isIos()) {
      openIosSheet();
      return;
    }
    if (!deferredPrompt) {
      showToast("Install is available from your browser menu (\u22ee or install icon)");
      return;
    }
    try {
      if (btn) btn.disabled = true;
      deferredPrompt.prompt();
      var choice = await deferredPrompt.userChoice;
      if (choice && choice.outcome === "accepted") {
        installed = true;
        hideInstallButtons();
        showToast("Chica added \u2014 look for the icon on your home screen");
      } else {
        showToast("You can install anytime from the browser menu");
      }
      deferredPrompt = null;
    } catch (e) {
      showToast("Could not open install prompt");
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function canShowExitThanks() {
    if (isStandalone() || installed || exitShownThisSession) return false;
    if (Date.now() - pageOpenedAt < MIN_DWELL_MS) return false;
    try {
      var last = Number(localStorage.getItem(EXIT_KEY) || 0);
      if (last && Date.now() - last < EXIT_COOLDOWN_MS) return false;
    } catch (_) {}
    return true;
  }

  function markExitShown() {
    exitShownThisSession = true;
    try {
      localStorage.setItem(EXIT_KEY, String(Date.now()));
    } catch (_) {}
  }

  function closeExitSheet() {
    var sheet = document.getElementById("chicaExitSheet");
    if (sheet) sheet.classList.remove("open");
  }

  function openExitThanks() {
    if (!canShowExitThanks()) return;
    ensureStyles();
    markExitShown();

    var sheet = document.getElementById("chicaExitSheet");
    if (!sheet) {
      sheet = document.createElement("div");
      sheet.id = "chicaExitSheet";
      sheet.className = "chica-exit-sheet";
      sheet.setAttribute("role", "dialog");
      sheet.setAttribute("aria-label", "Thanks for visiting");
      sheet.innerHTML =
        '<div class="chica-exit-backdrop" data-close></div>' +
        '<div class="chica-exit-card">' +
        '<button type="button" class="chica-exit-close" data-close aria-label="Close">\u00d7</button>' +
        '<div class="chica-exit-paw" aria-hidden="true">\ud83d\udc3e</div>' +
        "<h3>Thanks for stopping by</h3>" +
        "<p>Appreciate your time hunting with Chica. Want a one-tap shortcut on your phone or computer for next weekend?</p>" +
        '<div class="chica-exit-actions">' +
        '<button type="button" class="chica-exit-btn primary" id="chicaExitInstall">Add to Home Screen</button>' +
        '<button type="button" class="chica-exit-btn ghost" data-close>Maybe later</button>' +
        "</div></div>";
      document.body.appendChild(sheet);
      sheet.querySelectorAll("[data-close]").forEach(function (el) {
        el.addEventListener("click", closeExitSheet);
      });
      var installBtn = sheet.querySelector("#chicaExitInstall");
      if (installBtn) {
        installBtn.addEventListener("click", function () {
          closeExitSheet();
          triggerInstall(installBtn);
        });
      }
    }
    sheet.classList.add("open");
  }

  function wireExitIntent() {
    if (isStandalone()) return;

    // Desktop: classic exit-intent (cursor leaves toward top of viewport)
    document.addEventListener("mouseout", function (e) {
      if (!e) return;
      if (e.relatedTarget || e.toElement) return;
      if (typeof e.clientY === "number" && e.clientY > 12) return;
      openExitThanks();
    });

    // Mobile / general: if they hide the tab after engaging, offer once
    // (not on every blur — only after dwell + cooldown)
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") {
        // Soft: only if they spent real time; still respects cooldown/session
        openExitThanks();
      }
    });
  }

  function bindButtons() {
    document.querySelectorAll("[data-chica-install]").forEach(function (btn) {
      if (btn.dataset.bound) return;
      btn.dataset.bound = "1";
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        triggerInstall(btn);
      });
    });
  }

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredPrompt = e;
    showInstallButtons();
  });

  window.addEventListener("appinstalled", function () {
    installed = true;
    deferredPrompt = null;
    hideInstallButtons();
    closeExitSheet();
    showToast("Welcome home \u2014 Chica is installed");
  });

  function init() {
    ensureStyles();
    if (isStandalone()) {
      hideInstallButtons();
      return;
    }
    if (isIos()) {
      showInstallButtons();
    } else {
      hideInstallButtons();
    }
    bindButtons();
    wireExitIntent();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  global.ChicaPWA = {
    refresh: function () { bindButtons(); showInstallButtons(); },
    trigger: triggerInstall,
    thankYou: openExitThanks,
  };
})(window);
