/**
 * Chica PWA — Install / Add to Home Screen
 * Aurora Voss: one calm CTA, platform-aware, never aggressive.
 */
(function (global) {
  let deferredPrompt = null;
  let installed = false;

  function isIos() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
  }

  function showToast(msg) {
    let el = document.getElementById("chicaToast");
    if (!el) {
      el = document.createElement("div");
      el.id = "chicaToast";
      el.className = "chica-toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => el.classList.remove("show"), 2800);
  }

  function hideInstallButtons() {
    document.querySelectorAll("[data-chica-install]").forEach((b) => {
      b.hidden = true;
      b.setAttribute("aria-hidden", "true");
    });
  }

  function showInstallButtons() {
    if (isStandalone() || installed) {
      hideInstallButtons();
      return;
    }
    document.querySelectorAll("[data-chica-install]").forEach((b) => {
      b.hidden = false;
      b.removeAttribute("aria-hidden");
    });
  }

  function openIosSheet() {
    let sheet = document.getElementById("chicaIosSheet");
    if (!sheet) {
      sheet = document.createElement("div");
      sheet.id = "chicaIosSheet";
      sheet.className = "chica-ios-sheet";
      sheet.setAttribute("role", "dialog");
      sheet.setAttribute("aria-label", "Add to Home Screen");
      sheet.innerHTML = `
        <div class="chica-ios-backdrop" data-close></div>
        <div class="chica-ios-card">
          <button type="button" class="chica-ios-close" data-close aria-label="Close">×</button>
          <h3>Add Chica to your Home Screen</h3>
          <p>Get the map in one tap — no App Store needed.</p>
          <ol>
            <li>Tap the <strong>Share</strong> button <span class="ios-share">⎋</span> in Safari’s toolbar</li>
            <li>Scroll and tap <strong>Add to Home Screen</strong></li>
            <li>Tap <strong>Add</strong></li>
          </ol>
          <p class="chica-ios-hint">Works best in Safari on iPhone & iPad.</p>
          <button type="button" class="v-btn v-btn-primary" data-close style="width:100%">Got it</button>
        </div>`;
      document.body.appendChild(sheet);
      sheet.querySelectorAll("[data-close]").forEach((el) => {
        el.addEventListener("click", () => sheet.classList.remove("open"));
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
      showToast("Install is available from your browser menu");
      return;
    }
    try {
      if (btn) btn.disabled = true;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        installed = true;
        hideInstallButtons();
        showToast("Chica added — look for the icon on your home screen");
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

  function bindButtons() {
    document.querySelectorAll("[data-chica-install]").forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = "1";
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        triggerInstall(btn);
      });
    });
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallButtons();
  });

  window.addEventListener("appinstalled", () => {
    installed = true;
    deferredPrompt = null;
    hideInstallButtons();
    showToast("Welcome home — Chica is installed");
  });

  function init() {
    if (isStandalone()) {
      hideInstallButtons();
      return;
    }
    // Always show on iOS (instruction path); on others show when deferredPrompt arrives
    if (isIos()) {
      showInstallButtons();
    } else {
      // hide until beforeinstallprompt; still bind so later show works
      hideInstallButtons();
    }
    bindButtons();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Re-bind if DOM is updated later
  global.ChicaPWA = {
    refresh: () => { bindButtons(); showInstallButtons(); },
    trigger: triggerInstall,
  };
})(window);
