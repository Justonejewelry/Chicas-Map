import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { haversineMi, SA_CENTER, saveSubmission, type Sale, type SaleKind } from "@/lib/sales";
import { sanAntonioTodayISO } from "@/lib/sa-date";

export const Route = createFileRoute("/submit")({ component: SubmitPage });

const PAY = "https://square.link/u/qjunxHoo";
const CLAIM = "https://justonejewelry.github.io/Chicas-Map/claim/";
const INTAKE = "https://formsubmit.co/ajax/mr.jsciaraffa@gmail.com";

function SubmitPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") || "").trim();
    const address = String(fd.get("address") || "").trim();
    const hours = String(fd.get("hours") || "").trim();
    const details = String(fd.get("details") || "").trim();
    const date_from = String(fd.get("date_from") || "");
    const date_to = String(fd.get("date_to") || "");
    const type = (String(fd.get("type") || "garage") as SaleKind);

    if (!title || !address || !date_from || !date_to) {
      setError("Title, address, and both sale dates are required.");
      return;
    }
    if (date_to < date_from) {
      setError("The end date cannot be before the start date.");
      return;
    }
    // Sale dates are interpreted in San Antonio time, regardless of the visitor's device timezone.
    const todayISO = sanAntonioTodayISO();
    if (date_from < todayISO) {
      setError("The sale start date cannot be in the past.");
      return;
    }

    setBusy(true);
    try {
      const q = encodeURIComponent(address + ", San Antonio, Texas");
      const geo = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${q}`,
        { headers: { Accept: "application/json" } },
      );
      if (!geo.ok) throw new Error("geocode");
      const hits = (await geo.json()) as { lat: string; lon: string }[];
      if (!hits.length) throw new Error("address");
      const lat = Number(hits[0].lat);
      const lon = Number(hits[0].lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon) ||
          haversineMi({ lat, lon }, { lat: SA_CENTER[0], lon: SA_CENTER[1] }) > 60) {
        throw new Error("address");
      }

      const sale: Sale = {
        id: `user-${Date.now()}`,
        title,
        address,
        lat,
        lon,
        type,
        hours,
        dates: date_from === date_to ? date_from : `${date_from} to ${date_to}`,
        date_from,
        date_to,
        details,
        source: "Neighbor tip",
        url: "",
        status: "submitted",
        categories: [type],
        boost: false,
        preferred: false,
        permit_number: "",
        submitted: true,
      };

      // Do not show a successful submission unless the review email is accepted.
      const response = await fetch(INTAKE, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          _subject: `Chicas Map — New sale tip: ${title}`,
          _template: "table",
          title,
          address,
          type,
          date_from,
          date_to,
          hours,
          details,
          lat,
          lon,
          source_url: location.href,
        }),
      });
      if (!response.ok) throw new Error("email");
      const result = await response.json().catch(() => ({}));
      if (result && (result.success === false || result.success === "false")) throw new Error("email");

      saveSubmission(sale);
      await navigate({ to: "/map", search: { sale: sale.id } });
    } catch (err) {
      const reason = err instanceof Error ? err.message : "";
      setError(reason === "address"
        ? "We couldn't verify an address in the San Antonio area. Check the street address and try again."
        : reason === "email"
          ? "Your sale details could not be sent for review. Please try again; the listing has not been submitted."
          : "We couldn't verify the address or send the listing. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-bg">
      <SiteHeader />
      <main className="mx-auto max-w-lg px-4 py-10">
        <h1 className="font-display text-3xl font-bold">List a sale — free</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Share your garage or estate sale with the pack. Your dates and address are sent for review before the sale is added to the public map.
        </p>
        <aside className="mt-4 rounded-2xl bg-paper p-4 ring-1 ring-line">
          <p className="font-display text-base font-semibold">Want the weekend highlight?</p>
          <p className="mt-1 text-sm text-muted">Claimed pin is $5. Listing stays free.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={PAY} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-full bg-pine px-4 text-sm font-semibold text-cream">
              Pay $5
            </a>
            <a href={CLAIM} className="inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold ring-1 ring-line">
              How it works
            </a>
          </div>
        </aside>
        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
          <Field label="Title" name="title" placeholder="Tools, vintage, and a riding mower" required />
          <Field label="Address" name="address" placeholder="1234 Oak St, San Antonio" required />
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Type
            <select name="type" className="h-11 rounded-xl bg-paper px-3 font-normal ring-1 ring-line">
              <option value="garage">Garage sale</option>
              <option value="estate">Estate sale</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sale starts" name="date_from" inputType="date" required />
            <Field label="Sale ends" name="date_to" inputType="date" required />
          </div>
          <Field label="Hours" name="hours" placeholder="Fri–Sat 8am–2pm" />
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Details
            <textarea
              name="details"
              rows={4}
              className="rounded-xl bg-paper px-3 py-2 font-normal ring-1 ring-line outline-none focus:ring-2 focus:ring-pine"
              placeholder="What you're selling, cash/Venmo, parking notes"
            />
          </label>
          {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="h-12 rounded-full bg-pine text-sm font-semibold text-cream disabled:opacity-60"
          >
            {busy ? "Sending for review…" : "Submit sale for review"}
          </button>
          <p className="text-xs leading-relaxed text-muted">Submitting is free. Your sale is not published automatically; we review the details first.</p>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}

function Field({
  label,
  name,
  placeholder,
  required,
  inputType = "text",
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  inputType?: "text" | "date";
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      <input
        name={name}
        type={inputType}
        required={required}
        placeholder={placeholder}
        className="h-11 rounded-xl bg-paper px-3 font-normal ring-1 ring-line outline-none focus:ring-2 focus:ring-pine"
      />
    </label>
  );
}
