/**
 * Chicas Map — Square Boost payment webhook
 *
 * Verifies x-square-hmacsha256-signature (URL + raw body, HMAC-SHA256, base64).
 * On COMPLETED ~$9 USD payment, notifies review inbox and optional GitHub dispatch.
 *
 * Secrets (wrangler secret put):
 *   SQUARE_SIGNATURE_KEY
 *   SQUARE_NOTIFICATION_URL   // must match Square subscription URL exactly
 *   NOTIFY_FORMSPREE_ID       // optional Formspree form id
 *   GITHUB_TOKEN              // optional PAT for repository_dispatch
 *
 * Vars:
 *   BOOST_AMOUNT_CENTS=900
 *   BOOST_CURRENCY=USD
 *   GITHUB_REPO=Justonejewelry/Chicas-Map
 *   NOTIFY_EMAIL_TO=...
 */

const encoder = new TextEncoder();

function timingSafeEqualStr(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const ab = encoder.encode(a);
  const bb = encoder.encode(b);
  if (ab.byteLength !== bb.byteLength) return false;
  let out = 0;
  for (let i = 0; i < ab.byteLength; i++) out |= ab[i] ^ bb[i];
  return out === 0;
}

async function hmacSha256Base64(key, message) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
  const bytes = new Uint8Array(sig);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function verifySquareSignature(rawBody, signatureHeader, signatureKey, notificationUrl) {
  if (!signatureHeader || !signatureKey || !notificationUrl) return false;
  const expected = await hmacSha256Base64(signatureKey, notificationUrl + rawBody);
  return timingSafeEqualStr(expected, signatureHeader);
}

function centsFromMoney(money) {
  if (!money) return null;
  if (typeof money.amount === "number") return money.amount;
  if (money.amount != null) return Number(money.amount);
  return null;
}

function extractPayment(event) {
  const obj = event && event.data && event.data.object;
  if (!obj) return null;
  return obj.payment || obj;
}

function isBoostPayment(payment, amountCents, currency) {
  if (!payment) return false;
  const status = String(payment.status || "").toUpperCase();
  if (status !== "COMPLETED") return false;
  const cur = String(
    (payment.amount_money && payment.amount_money.currency) ||
      (payment.total_money && payment.total_money.currency) ||
      ""
  ).toUpperCase();
  if (currency && cur && cur !== currency.toUpperCase()) return false;
  const cents =
    centsFromMoney(payment.amount_money) ??
    centsFromMoney(payment.total_money);
  if (cents == null) return false;
  // Allow exact match or within $0.50 in case of rounding / tax config
  const target = Number(amountCents) || 900;
  return Math.abs(cents - target) <= 50;
}

function paymentSummary(event, payment) {
  return {
    event_id: event.event_id || event.id || null,
    event_type: event.type || null,
    created_at: event.created_at || null,
    merchant_id: event.merchant_id || null,
    payment_id: payment.id || null,
    status: payment.status || null,
    amount_cents: centsFromMoney(payment.amount_money) ?? centsFromMoney(payment.total_money),
    currency:
      (payment.amount_money && payment.amount_money.currency) ||
      (payment.total_money && payment.total_money.currency) ||
      null,
    order_id: payment.order_id || null,
    receipt_url: payment.receipt_url || null,
    buyer_email:
      (payment.buyer_email_address) ||
      (payment.customer_id ? null : null) ||
      null,
    note: payment.note || null,
    source_type: payment.source_type || null,
    product: "boost_pass",
    boost_months: 6,
    verified_at: new Date().toISOString(),
  };
}

async function notifyFormspree(formId, toEmail, summary) {
  if (!formId) return { ok: false, reason: "no_formspree" };
  const res = await fetch("https://formspree.io/f/" + formId, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      _subject: "Chica Map — BOOST PAID ($9 Square)",
      to: toEmail || undefined,
      message:
        "Square webhook verified a completed Boost payment.\n\n" +
        "Activate gold pin only after listing approval.\n\n" +
        JSON.stringify(summary, null, 2),
      payment_id: summary.payment_id,
      amount_cents: summary.amount_cents,
      status: summary.status,
      event_id: summary.event_id,
      source: "square_webhook",
    }),
  });
  return { ok: res.ok, status: res.status };
}

async function notifyGitHub(token, repo, summary) {
  if (!token || !repo) return { ok: false, reason: "no_github" };
  const res = await fetch("https://api.github.com/repos/" + repo + "/dispatches", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      event_type: "boost_paid",
      client_payload: summary,
    }),
  });
  return { ok: res.ok || res.status === 204, status: res.status };
}

// Simple in-isolate dedupe (best-effort; not durable across isolates)
const seenEvents = new Map();
function alreadySeen(eventId) {
  if (!eventId) return false;
  const now = Date.now();
  for (const [k, t] of seenEvents) {
    if (now - t > 24 * 60 * 60 * 1000) seenEvents.delete(k);
  }
  if (seenEvents.has(eventId)) return true;
  seenEvents.set(eventId, now);
  return false;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
      return new Response(JSON.stringify({ ok: true, service: "chicas-square-boost-webhook" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method !== "POST" || url.pathname !== "/webhooks/square") {
      return new Response("Not found", { status: 404 });
    }

    const signatureKey = env.SQUARE_SIGNATURE_KEY;
    const notificationUrl = env.SQUARE_NOTIFICATION_URL;
    if (!signatureKey || !notificationUrl) {
      return new Response("Server misconfigured", { status: 500 });
    }

    const rawBody = await request.text();
    const sig =
      request.headers.get("x-square-hmacsha256-signature") ||
      request.headers.get("X-Square-Hmacsha256-Signature") ||
      "";

    const valid = await verifySquareSignature(rawBody, sig, signatureKey, notificationUrl);
    if (!valid) {
      return new Response("Invalid signature", { status: 401 });
    }

    let event;
    try {
      event = JSON.parse(rawBody);
    } catch (_) {
      return new Response("Bad JSON", { status: 400 });
    }

    const type = String(event.type || "");
    // Ack non-payment events after signature OK
    if (type !== "payment.updated" && type !== "payment.created") {
      return new Response(JSON.stringify({ ok: true, ignored: type }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const eventId = event.event_id || event.id;
    if (alreadySeen(eventId)) {
      return new Response(JSON.stringify({ ok: true, deduped: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payment = extractPayment(event);
    const amountCents = env.BOOST_AMOUNT_CENTS || "900";
    const currency = env.BOOST_CURRENCY || "USD";

    if (!isBoostPayment(payment, amountCents, currency)) {
      return new Response(
        JSON.stringify({
          ok: true,
          boost: false,
          status: payment && payment.status,
          amount: payment && (payment.amount_money || payment.total_money),
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const summary = paymentSummary(event, payment);

    const results = {
      formspree: await notifyFormspree(
        env.NOTIFY_FORMSPREE_ID,
        env.NOTIFY_EMAIL_TO,
        summary
      ),
      github: await notifyGitHub(env.GITHUB_TOKEN, env.GITHUB_REPO, summary),
    };

    return new Response(
      JSON.stringify({ ok: true, boost: true, payment_id: summary.payment_id, notify: results }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  },
};
