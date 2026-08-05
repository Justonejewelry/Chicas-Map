/**
 * Chica form helpers — Formspree AJAX + mailto fallback
 * Aurora Voss: stay on page, one clear success state, never silent failure.
 */
(function (global) {
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
   * Submit payload to Formspree. Returns { ok, error? }
   */
  async function postFormspree(formId, data) {
    const url = cfg().formspreeUrl && cfg().formspreeUrl(formId);
    if (!url) return { ok: false, error: "no_form_id" };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    let body = null;
    try {
      body = await res.json();
    } catch (_) {}

    if (res.ok) return { ok: true, body };
    const errMsg =
      (body && body.errors && body.errors.map((e) => e.message).join(" ")) ||
      (body && body.error) ||
      "Submission failed";
    return { ok: false, error: errMsg, body };
  }

  function mailtoFallback(subject, body) {
    const to = cfg().REVIEW_EMAIL || "mr.jsciaraffa@gmail.com";
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
   * Expected fields: input[type=email] (or #id), optional name.
   * statusEl optional for success/error message.
   */
  function bindEmailForm(form, options) {
    if (!form || form.dataset.chicaBound) return;
    form.dataset.chicaBound = "1";
    const opts = options || {};
    const statusEl = opts.statusEl || null;
    const emailInput =
      opts.emailInput ||
      form.querySelector('input[type="email"]') ||
      form.querySelector("[name=email]");
    const submitBtn = form.querySelector('[type="submit"]');

    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      const email = (emailInput && emailInput.value.trim()) || "";
      if (!email) {
        setStatus(statusEl, "Please enter your email.", "error");
        return;
      }

      const payload = {
        email: email,
        _subject: "Chica Friday Email Updates — new subscriber",
        source: opts.source || "web",
        list: "friday_updates",
        submitted_at: new Date().toISOString(),
      };

      // Honeypot (if present)
      const hp = form.querySelector('[name="_gotcha"]');
      if (hp && hp.value) return;

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.orig = submitBtn.textContent;
        submitBtn.textContent = "Joining…";
      }

      const formId = cfg().FORMSPREE_EMAIL_ID;
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
        const result = await postFormspree(formId, payload);
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

  /**
   * Open mailto for “Join Friday” from a button (map menu).
   */
  function openEmailSignupMailto() {
    mailtoFallback(
      "Join Chica Friday Email Updates",
      "Please add me to Chica’s Friday email updates.\n\nEmail: \n\nI understand updates publish every Friday with weekend garage sale intel."
    );
  }

  global.ChicaForms = {
    postFormspree,
    bindEmailForm,
    openEmailSignupMailto,
    setStatus,
  };
})(window);
