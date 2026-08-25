import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { saveSubmission, type Sale, type SaleKind } from "@/lib/sales";

export const Route = createFileRoute("/submit")({ component: SubmitPage });

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
    const type = (String(fd.get("type") || "garage") as SaleKind);
    if (!title || !address) {
      setError("Title and address are required.");
      return;
    }
    setBusy(true);
    try {
      const q = encodeURIComponent(`${address}, San Antonio TX`);
      const geo = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`,
        { headers: { Accept: "application/json" } },
      );
      const hits = (await geo.json()) as { lat: string; lon: string }[];
      const lat = hits[0] ? Number(hits[0].lat) : 29.4241;
      const lon = hits[0] ? Number(hits[0].lon) : -98.4936;
      const sale: Sale = {
        id: `user-${Date.now()}`,
        title,
        address,
        lat,
        lon,
        type,
        hours,
        dates: "This weekend",
        date_from: "",
        date_to: "",
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
      await navigate({ to: "/map", search: { sale: sale.id } });
    } catch {
      setError("Could not place that address. Try a fuller street address.");
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
          Drop your garage, yard, or estate sale on the map. It stays on this device so you can
          share the pin with the pack.
        </p>
        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
          <Field label="Title" name="title" placeholder="Tools, vintage, and a riding mower" required />
          <Field label="Address" name="address" placeholder="1234 Oak St, San Antonio" required />
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Type
            <select name="type" className="h-11 rounded-xl bg-paper px-3 font-normal ring-1 ring-line">
              <option value="garage">Garage sale</option>
              <option value="yard">Yard sale</option>
              <option value="estate">Estate sale</option>
            </select>
          </label>
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
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="h-12 rounded-full bg-pine text-sm font-semibold text-cream disabled:opacity-60"
          >
            {busy ? "Pinning…" : "Pin it on the map"}
          </button>
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
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        className="h-11 rounded-xl bg-paper px-3 font-normal ring-1 ring-line outline-none focus:ring-2 focus:ring-pine"
      />
    </label>
  );
}
