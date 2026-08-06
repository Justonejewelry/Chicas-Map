/**
 * Permit-holder community tips (moderated).
 * Legal posture: user attestation + public disclaimer + owner moderation via permit-tips.json.
 * Static hosting: form builds a review email with Approve deep-link; published tips only from JSON.
 */
(function (global) {
  const TIPS_URL = "data/permit-tips.json";
  const REVIEW_EMAIL = "mr.jsciaraffa@gmail.com";
  const APPROVE_BASE = "https://justonejewelry.github.io/Project-YardBird/admin/approve.html";
  let tipsIndex = {}; // key: normalized address or permit #

  function normKey(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 48);
  }

  function toBase64Url(str) {
    try {
      const b64 = btoa(unescape(encodeURIComponent(str)));
      return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
    } catch (_) {
      return "";
    }
  }

  async function loadTips() {
    try {
      const res = await fetch(TIPS_URL + "?t=" + Date.now(), { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      tipsIndex = {};
      (data.tips || []).forEach((t) => {
        if (t.permit_number) tipsIndex["p:" + normKey(t.permit_number)] = t;
        if (t.address) tipsIndex["a:" + normKey(t.address)] = t;
      });
      global.__YB_TIPS_DISCLAIMER = data.disclaimer || "";
    } catch (e) {
      console.warn("permit tips load failed", e);
    }
  }

  function findTip(sale) {
    if (!sale) return null;
    if (sale.permit_number && tipsIndex["p:" + normKey(sale.permit_number)]) {
      return tipsIndex["p:" + normKey(sale.permit_number)];
    }
    if (sale.address && tipsIndex["a:" + normKey(sale.address)]) {
      return tipsIndex["a:" + normKey(sale.address)];
    }
    return null;
  }

  function tipHtml(tip) {
    if (!tip) return "";
    const schedule = tip.schedule ? `<div><b>Schedule:</b> ${esc(tip.schedule)}</div>` : "";
    const summary = tip.summary ? `<div><b>For sale:</b> ${esc(tip.summary)}</div>` : "";
    const contact =
      tip.public_contact === true && tip.contact
        ? `<div><b>Contact:</b> ${esc(tip.contact)}</div>`
        : "";
    return `<div class="seller-tip-card">
      <span class="permit-tip-badge">Seller tip · unverified</span>
      ${schedule}${summary}${contact}
      <div style="margin-top:6px;font-size:0.68rem;color:#78716c">Not verified by YardBird or the City. Treat as a lead only.</div>
    </div>`;
  }

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, """);
  }

  function openTipForm(sale) {
    const box = document.getElementById("permitTipForm");
    if (!box) return;
    box.classList.remove("hidden");
    document.getElementById("tipAddress").value = sale?.address || "";
    document.getElementById("tipPermit").value = sale?.permit_number || "";
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function bindForm() {
    const form = document.getElementById("permitTipFormEl");
    if (!form || form.dataset.bound) return;
    form.dataset.bound = "1";
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const attest = document.getElementById("tipAttest");
      const accurate = document.getElementById("tipAccurate");
      const terms = document.getElementById("tipTerms");
      if (!attest?.checked || !accurate?.checked || !terms?.checked) {
        alert("Please check all three boxes to submit a tip for review.");
        return;
      }
      const payload = {
        address: document.getElementById("tipAddress").value.trim(),
        permit_number: document.getElementById("tipPermit").value.trim(),
        schedule: document.getElementById("tipSchedule").value.trim(),
        summary: document.getElementById("tipSummary").value.trim(),
        contact: document.getElementById("tipContact").value.trim(),
        public_contact: document.getElementById("tipPublicContact")?.checked === true,
        submitted_at: new Date().toISOString(),
        status: "pending_review",
      };
      if (!payload.address || !payload.schedule) {
        alert("Address and schedule are required.");
        return;
      }

      const compact = JSON.stringify(payload);
      const approveUrl = APPROVE_BASE + "#tip=" + toBase64Url(compact);
      const pretty = JSON.stringify(payload, null, 2);

      const subject = encodeURIComponent("YardBird permit tip — review");
      const body = encodeURIComponent(
        "YardBird permit tip — review\n\n" +
          "APPROVE (opens tip pre-filled; then one click to push):\n" +
          approveUrl +
          "\n\n" +
          "Alternate — GitHub Actions:\n" +
          "https://github.com/Justonejewelry/Project-YardBird/actions/workflows/publish-tip.yml\n" +
          "Run workflow → paste tip_json → Run\n\n" +
          "——— TIP JSON ———\n" +
          pretty +
          "\n\nAttestation: submitter checked permit-holder/agent, accuracy, and public-tip terms.\n" +
          "Tips stay labeled unverified on the map until you publish."
      );

      // Prefer opening approve link for the operator when body is huge for some mail clients
      window.location.href = "mailto:" + REVIEW_EMAIL + "?subject=" + subject + "&body=" + body;

      const status = document.getElementById("tipFormStatus");
      if (status) {
        status.hidden = false;
        status.innerHTML =
          'Review email opened with an <b>Approve</b> link. Tips appear on the map only after you approve.';
      }
    });
  }

  global.YardBirdTips = {
    loadTips,
    findTip,
    tipHtml,
    openTipForm,
    bindForm,
  };
})(window);
