import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { saveSubmission, type Sale, type SaleKind } from "@/lib/sales";

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
    const dateFrom = String(fd.get("date_from") || "");
    const dateTo = String(fd.get("date_to") || "");
    const type = (String(fd.get("type") || "garage") as SaleKind);
    if (!title || !address || !dateFrom || !dateTo) {
      setError("Please add a title, full address, and both sale dates.");
      return;
    }
    if (dateTo < dateFrom) {
      setError("The end date can't be earlier than the start date.");
      return;
    }
    setBusy(true);
    try {
      const q = encodeURIComponent(`${address}, San Antonio TX`);
      const geo = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`,
        { headers: { Accept: "application/json" } },
      );
      if (!geo.ok) throw new Error("Address lookup failed");
      const hits = (await geo.json()) as { lat: string; lon: string }[];
      if (!hits.length) throw new Error("Address not found");
      const lat = Number(hits[0].lat);
      const lon = Number(hits[0].lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error("Invalid coordinates");
      const sale: Sale = {
        id: `user-${Date.now()}`,
        title,
        address,
        lat,
        lon,
        type,
        hours,
        dates: dateFrom === dateTo ? dateFrom : `${dateFrom} to ${dateTo}`,
        date_from: dateFrom,
        date_to: dateTo,
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
      saveSubmission(sale);

      // Email is a review notification; approval is still required before public listing.
      fetch(INTAKE, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          _subject: `Chicas Map — New sale tip: ${title}`,
          _template: "table",
          title, address, type, hours,
          date_from: dateFrom, date_to: dateTo, details, lat, lon,
          source_url: location.href,
        }),
      }).catch(() => {});

      await navigate({ to: "/map", search: { sale: sale.id } });
    } catch {
      setError("We couldn't verify that address. Enter a complete San Antonio street address and try again.");
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
          Share your garage, yard, or estate sale with San Antonio shoppers. Add the actual dates so visitors know when to stop by.
        </p>
        <aside className="mt-4 rounded-2xl bg-paper p-4 ring-1 ring-line">
          <p className="font-display text-base font-semibold">What happens after you submit?</p>
          <p className="mt-1 text-sm text-muted">
            You'll see a preview pin on this device. Chica receives your tip for review; it is not public until approved. Approved sales are added to the map and sale list.
          </p>
        </aside>
        <aside className="mt-4 rounded-2xl bg-paper p-4 ring-1 ring-line">
          <p className="font-display text-base font-semibold">Want the weekend highlight?</p>
          <p className="mt-1 text-sm text-muted">Claimed pin is $5. A standard listing is free.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={PAY} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-full bg-pine px-4 text-sm font-semibold text-cream">Pay $5</a>
            <a href={CLAIM} className="inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold ring-1 ring-line">How it works</a>
          </div>
        </aside>
        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
          <Field label="Sale title" name="title" placeholder="Tools, vintage, and a riding mower" required />
          <Field label="Street address" name="address" placeholder="1234 Oak St, San Antonio, TX" required />
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Sale type
            <select name="type" className="h-11 rounded-xl bg-paper px-3 font-normal ring-1 ring-line">
              <option value="garage">Garage sale</option>
              <option value="yard">Yard sale</option>
              <option value="estate">Estate sale</option>
            </select>
          </label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              First day of sale
              <input name="date_from" type="date" required className="h-11 rounded-xl bg-paper px-3 font-normal ring-1 ring-line" />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Last day of sale
              <input name="date_to" type="date" required className="h-11 rounded-xl bg-paper px-3 font-normal ring-1 ring-line" />
            </label>
          </div>
          <Field label="Hours" name="hours" placeholder="8:00 AM–2:00 PM" />
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Details (optional)
            <textarea name="details" rows={4} className="rounded-xl bg-paper px-3 py-2 font-normal ring-1 ring-line outline-none focus:ring-2 focus:ring-pine" placeholder="What you're selling, payment methods, parking notes" />
          </label>
          {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
          <button type="submit" disabled={busy} className="h-12 rounded-full bg-pine text-sm font-semibold text-cream disabled:opacity-60">
            {busy ? "Submitting…" : "Submit sale for review"}
          </button>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}

function Field({ label, name, placeholder, required }: { label: string; name: string; placeholder?: string; required?: boolean }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      <input name={name} required={required} placeholder={placeholder} className="h-11 rounded-xl bg-paper px-3 font-normal ring-1 ring-line outline-none focus:ring-2 focus:ring-pine" />
    </label>
  );
}
