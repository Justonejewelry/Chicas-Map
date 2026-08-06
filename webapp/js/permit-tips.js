/**
 * Permit-holder tips — moderated publish only.
 * Easiest approve for owner: paste JSON in chat and say "approve this tip".
 */
(function (global) {
  const TIPS_URL = "data/permit-tips.json";
  const WEBHOOK_CONFIG_URL = "data/webhook-config.json";
  const REVIEW_EMAIL = "mr.jsciaraffa@gmail.com";
  const APPROVE_BASE = "https://justonejewelry.github.io/Project-YardBird/admin/approve.html";
  let tipsIndex = {};
  let webhookConfig = { inbound_url: "", also_mailto: true };

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

  function esc(s) {
    return String(s || "")
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, """);
  }

  async function loadWebhookConfig() {
    try {
      const res = await fetch(WEBHOOK_CONFIG_URL + "?t=" + Date.now(), { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      webhookConfig = {
        inbound_url: (data.inbound_url || "").trim(),
        also_mailto: data.also_mailto !== false,
      };
    } catch (_) {}
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

  function openTipForm(sale) {
    const box = document.getElementById("permitTipForm");
    if (!box) return;
    box.classList.remove("hidden");
    document.getElementById("tipAddress").value = sale?.address || "";
    document.getElementById("tipPermit").value = sale?.permit_number || "";
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function buildMail(payload) {
    const compact = JSON.stringify(payload);
    const approveUrl = APPROVE_BASE + "#tip=" + toBase64Url(compact);
    const pretty = JSON.stringify(payload, null, 2);
    const subject = encodeURIComponent("YardBird permit tip — review");
    const body = encodeURIComponent(
      "YardBird permit tip — REVIEW\n\n" +
        "EASIEST APPROVE:\n" +
        "1) Copy the TIP JSON below\n" +
        "2) Open Grok (GitHub connected)\n" +
        "3) Paste JSON and say: approve this tip\n\n" +
        "OR click Approve page:\n" +
        approveUrl +
        "\n\nOR GitHub: new issue → paste JSON in ```json block → label tip-approved\n\n" +
        "——— TIP JSON ———\n" +
        pretty
    );
    return "mailto:" + REVIEW_EMAIL + "?subject=" + subject + "&body=" + body;
  }

  async function postInbound(payload) {
    const url = webhookConfig.inbound_url;
    if (!url) return { ok: false, skipped: true };
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          event: "tip_submit",
          source: "yardbird_map",
          tip: payload,
        }),
      });
      return { ok: res.ok, status: res.status };
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) };
    }
  }

  function bindForm() {
    const form = document.getElementById("permitTipFormEl");
    if (!form || form.dataset.bound) return;
    form.dataset.bound = "1";
    loadWebhookConfig();

    form.addEventListener("submit", async function (e) {
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
        id: "tip_" + Date.now().toString(36),
      };
      if (!payload.address || !payload.schedule) {
        alert("Address and schedule are required.");
        return;
      }

      const status = document.getElementById("tipFormStatus");
      if (status) {
        status.hidden = false;
        status.textContent = "Submitting for review…";
      }

      await postInbound(payload);

      if (webhookConfig.also_mailto || !webhookConfig.inbound_url) {
        window.location.href = buildMail(payload);
      }

      if (status) {
        status.innerHTML =
          "Review email opened. Tips go live only after you approve (easiest: paste JSON here and say <b>approve this tip</b>)."
      }
    });
  }

  global.YardBirdTips = {
    loadTips,
    findTip,
    tipHtml,
    openTipForm,
    bindForm,
    loadWebhookConfig,
  };
})(window);
