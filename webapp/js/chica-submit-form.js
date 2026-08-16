/**
 * Chica Map — sale listing submit → Formspree + mailto fallback + Boost
 */
(function () {
  var REVIEW = (window.ChicaConfig && window.ChicaConfig.REVIEW_EMAIL) || "mr.jsciaraffa@gmail.com";
  var BOOST_URL = (window.ChicaConfig && window.ChicaConfig.BOOST_PAYMENT_URL) || "https://square.link/u/xiJuZ66C";
  var form = document.getElementById("saleForm");
  if (!form || form.dataset.chicaSaleBound) return;
  form.dataset.chicaSaleBound = "1";

  var status = document.getElementById("saleStatus");
  var progressBar = document.getElementById("progressBar");
  var progressLabel = document.getElementById("progressLabel");
  var summary = document.getElementById("saleSummary");
  var summaryCount = document.getElementById("summaryCount");
  var requiredFields = ["saleTitle", "saleAddress", "saleStart", "saleHours", "saleSummary", "saleName"];
  var checks = ["saleAttest", "saleAccurate", "saleTerms"];

  try {
    var params = new URLSearchParams(window.location.search);
    var boostFlag = params.get("boost");
    var banner = document.getElementById("boostBanner");
    if (banner && boostFlag === "success") {
      banner.hidden = false;
      banner.className = "submit-status";
      banner.textContent = "Payment received (or in progress). Your listing still needs review — Boost activates after approval.";
    } else if (banner && boostFlag === "cancel") {
      banner.hidden = false;
      banner.className = "submit-status error";
      banner.textContent = "Boost payment canceled. You can still list free without Boost.";
    }
  } catch (_) {}

  function updateProgress() {
    var complete =
      requiredFields.filter(function (id) {
        var el = document.getElementById(id);
        return el && el.value.trim();
      }).length +
      checks.filter(function (id) {
        var el = document.getElementById(id);
        return el && el.checked;
      }).length;
    var total = requiredFields.length + checks.length;
    var pct = Math.round((complete / total) * 100);
    if (progressBar) progressBar.style.width = pct + "%";
    if (progressLabel) progressLabel.textContent = pct + "% complete";
  }

  function updateCount() {
    if (summary && summaryCount) summaryCount.textContent = summary.value.length + " / 500";
  }

  form.addEventListener("input", function () {
    updateProgress();
    updateCount();
  });
  form.addEventListener("change", updateProgress);
  updateProgress();
  updateCount();

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;

    if (
      !document.getElementById("saleAttest").checked ||
      !document.getElementById("saleAccurate").checked ||
      !document.getElementById("saleTerms").checked
    ) {
      status.hidden = false;
      status.className = "submit-status error";
      status.textContent = "Please confirm all three statements before submitting.";
      return;
    }

    var start = document.getElementById("saleStart").value;
    var end = document.getElementById("saleEnd").value;
    if (end && start && end < start) {
      status.hidden = false;
      status.className = "submit-status error";
      status.textContent = "The end date cannot be earlier than the start date.";
      document.getElementById("saleEnd").focus();
      return;
    }

    var cats = [];
    form.querySelectorAll('input[name="cat"]:checked').forEach(function (c) {
      cats.push(c.value);
    });

    var communitySource = document.getElementById("saleCommunitySource").value || null;
    var communityLink = document.getElementById("saleCommunityLink").value.trim() || null;
    var wantBoost = !!(document.getElementById("saleFeatured") && document.getElementById("saleFeatured").checked);

    var payload = {
      title: document.getElementById("saleTitle").value.trim(),
      address: document.getElementById("saleAddress").value.trim(),
      start_date: start,
      end_date: end || null,
      hours: document.getElementById("saleHours").value.trim(),
      categories: cats,
      summary: summary.value.trim(),
      submitter_name: document.getElementById("saleName").value.trim(),
      contact: document.getElementById("saleContact").value.trim() || null,
      public_contact: document.getElementById("salePublicContact").checked,
      featured_request: wantBoost,
      boost_pass_months: wantBoost ? 6 : 0,
      boost_payment_url: wantBoost ? BOOST_URL : null,
      payment_provider: wantBoost ? "square" : null,
      community_source: communitySource,
      community_link_or_notes: communityLink,
      submitted_at: new Date().toISOString(),
      status: "pending_review",
      source: communitySource && communitySource !== "own_listing" ? "community_tip" : "user_submit_free",
      _subject: wantBoost
        ? "Chica Map — BOOST listing for review"
        : communitySource && communitySource !== "own_listing"
          ? "Chica Map — community tip for review"
          : "Chica Map — free sale listing for review",
      email: document.getElementById("saleContact").value.trim() || "listing@chicasmap.local",
    };

    var btn = document.getElementById("saleSubmit");
    if (btn) {
      btn.disabled = true;
      btn.dataset.orig = btn.textContent;
      btn.textContent = "Submitting…";
    }

    var formId =
      (window.ChicaConfig && window.ChicaConfig.FORMSPREE_SALE_ID) ||
      (window.ChicaConfig && window.ChicaConfig.FORMSPREE_EMAIL_ID) ||
      "";
    var posted = false;

    if (formId && window.ChicaForms && window.ChicaForms.postFormspree) {
      try {
        var result = await window.ChicaForms.postFormspree(formId, payload);
        posted = !!(result && result.ok);
      } catch (_) {
        posted = false;
      }
    } else if (formId) {
      try {
        var res = await fetch("https://formspree.io/f/" + formId, {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        posted = res.ok;
      } catch (_) {
        posted = false;
      }
    }

    if (!posted) {
      var subject = encodeURIComponent(payload._subject);
      var body = encodeURIComponent(
        "Please review this user-submitted garage sale for the map.\n\n" +
          JSON.stringify(payload, null, 2)
      );
      window.location.href = "mailto:" + REVIEW + "?subject=" + subject + "&body=" + body;
    }

    if (wantBoost && BOOST_URL) {
      setTimeout(function () {
        window.open(BOOST_URL, "_blank", "noopener,noreferrer");
      }, 600);
    }

    status.hidden = false;
    status.className = "submit-status";
    status.textContent = posted
      ? wantBoost
        ? "Submitted for review. Square checkout opens for the $9 Boost — gold pin after payment + approval."
        : "Submitted for review. Your sale appears on the map only after verification."
      : wantBoost
        ? "Review email opened (Formspree unavailable). Square opens next for Boost."
        : "Review email opened (Formspree unavailable). Listing still needs verification.";

    if (btn) {
      btn.disabled = true;
      btn.textContent = posted ? "Submitted ✓" : btn.dataset.orig || "Submit for review →";
    }
    updateProgress();
  });
})();
