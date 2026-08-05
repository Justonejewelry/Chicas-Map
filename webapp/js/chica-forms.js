/**
 * Chica form helpers — Formspree AJAX + reCAPTCHA v3 + mailto fallback
 * Aurora Voss: stay on page, invisible captcha, never silent failure.
 */
(function (global) {
  var recaptchaReady = null;

  function cfg() {
    return global.ChicaConfig || {};
  }

  function setStatus(el, msg, kind) {
    if (!el) return;
    el.hidden = false;
    el.className = "v-form-status" + (kind === "error" ? " error" : "");
    el.textContent = msg;
  }

  /**
   * Load Google reCAPTCHA v3 once. Resolves when grecaptcha.ready fires.
   */
  function ensureRecaptcha() {
    var siteKey = (cfg().RECAPTCHA_SITE_KEY || "").trim();
    if (!siteKey) return Promise.resolve(null);

    if (recaptchaReady) return recaptchaReady;

    recaptchaReady = new Promise(function (resolve) {
      if (global.grecaptcha && global.grecaptcha.execute) {
        global.grecaptcha.ready(function () {
          resolve(siteKey);
        });
        return;
      }

      var existing = document.querySelector('script[data-chica-recaptcha]');
      if (existing) {
        existing.addEventListener("load", function () {
          if (global.grecaptcha) {
            global.grecaptcha.ready(function () {
              resolve(siteKey);
            });
          } else resolve(null);
        });
        return;
      }

      var s = document.createElement("script");
      s.src =
        "https://www.google.com/recaptcha/api.js?render=" +
        encodeURIComponent(siteKey);
      s.async = true;
      s.defer = true;
      s.dataset.chicaRecaptcha = "1";
      s.onload = function () {
        if (global.grecaptcha) {
          global.grecaptcha.ready(function () {
            resolve(siteKey);
          });
        } else resolve(null);
      };
      s.onerror = function () {
        resolve(null);
      };
      document.head.appendChild(s);
    });

    return recaptchaReady;
  }

  /**
   * Get a v3 token for the configured action. Returns null if captcha disabled/unavailable.
   */
  async function getRecaptchaToken() {
    var siteKey = await ensureRecaptcha();
    if (!siteKey || !global.grecaptcha || !global.grecaptcha.execute) return null;

    var action = cfg().RECAPTCHA_ACTION || "submit";
    try {
      return await global.grecaptcha.execute(siteKey, { action: action });
    } catch (e) {
      console.warn("reCAPTCHA execute failed", e);
      return null;
    }
  }

  /**
   * Submit payload to Formspree. Returns { ok, error? }
   */
  async function postFormspree(formId, data) {
    var url = cfg().formspreeUrl && cfg().formspreeUrl(formId);
    if (!url) return { ok: false, error: "no_form_id" };

    var res = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    var body = null;
    try {
      body = await res.json();
    } catch (_) {}

    if (res.ok) return { ok: true, body };
    var errMsg =
      (body && body.errors && body.errors.map(function (e) {
        return e.message;
      }).join(" ")) ||
      (body && body.error) ||
      "Submission failed";
    return { ok: false, error: errMsg, body: body };
  }

  function mailtoFallback(subject, body) {
    var to = cfg().REVIEW_EMAIL || "mr.jsciaraffa@gmail.com";
    window.location.href =
      "mailto:" +
      to +
      "?subject=" +
      encodeURIComponent(subject) +
      "&body=" +
      encodeURIComponent(body);
  }

  /**
   * Wire a Friday email signup form.
   */
  function bindEmailForm(form, options) {
    if (!form || form.dataset.chicaBound) return;
    form.dataset.chicaBound = "1";
    var opts = options || {};
    var statusEl = opts.statusEl || null;
    var emailInput =
      opts.emailInput ||
      form.querySelector('input[type="email"]') ||
      form.querySelector("[name=email]");
    var submitBtn = form.querySelector('[type="submit"]');

    // Preload reCAPTCHA when a site key is configured
    if ((cfg().RECAPTCHA_SITE_KEY || "").trim()) {
      ensureRecaptcha();
    }

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      var email = (emailInput && emailInput.value.trim()) || "";
      if (!email) {
        setStatus(statusEl, "Please enter your email.", "error");
        return;
      }

      var payload = {
        email: email,
        _subject: "Chica Friday Email Updates — new subscriber",
        source: opts.source || "web",
        list: "friday_updates",
        submitted_at: new Date().toISOString(),
      };

      // Honeypot
      var hp = form.querySelector('[name="_gotcha"]');
      if (hp && hp.value) return;

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.orig = submitBtn.textContent;
        submitBtn.textContent = "Joining…";
      }

      var formId = cfg().FORMSPREE_EMAIL_ID;
      if (!formId) {
        mailtoFallback(
          "Join Chica Friday Email Updates",
          "Please add me to Chica’s Friday email updates.\n\nEmail: " +
            email +
            "\n\nI understand updates publish every Friday with weekend garage sale intel."
        );
        setStatus(
          statusEl,
          "Email opened — send it to join the Friday list. (Formspree not configured yet.)",
          null
        );
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = submitBtn.dataset.orig || "Join Friday list";
        }
        return;
      }

      try {
        // Invisible reCAPTCHA v3 token (Formspree expects g-recaptcha-response)
        var token = await getRecaptchaToken();
        if (token) {
          payload["g-recaptcha-response"] = token;
        } else if ((cfg().RECAPTCHA_SITE_KEY || "").trim()) {
          // Key configured but token failed — still attempt; Formspree may reject if CAPTCHA required
          console.warn("reCAPTCHA token unavailable; submitting without token");
        }

        var result = await postFormspree(formId, payload);
        if (result.ok) {
          setStatus(
            statusEl,
            "You’re on the list. Chica’s Friday briefing lands every week — free.",
            null
          );
          form.reset();
        } else {
          setStatus(
            statusEl,
            result.error || "Could not join right now. Try again or email us.",
            "error"
          );
        }
      } catch (err) {
        setStatus(statusEl, "Network error — check connection and try again.", "error");
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = submitBtn.dataset.orig || "Join Friday list";
        }
      }
    });
  }

  function openEmailSignupMailto() {
    mailtoFallback(
      "Join Chica Friday Email Updates",
      "Please add me to Chica’s Friday email updates.\n\nEmail: \n\nI understand updates publish every Friday with weekend garage sale intel."
    );
  }

  global.ChicaForms = {
    postFormspree: postFormspree,
    bindEmailForm: bindEmailForm,
    openEmailSignupMailto: openEmailSignupMailto,
    setStatus: setStatus,
    ensureRecaptcha: ensureRecaptcha,
    getRecaptchaToken: getRecaptchaToken,
  };
})(window);
