import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { saveSubmission, type Sale, type SaleKind } from "@/lib/sales";

export const Route = createFileRoute("/submit")({ component: SubmitPage });

const SA_FALLBACK = { lat: 29.4241, lon: -98.4936 };
const MAX_TITLE = 120;
const MAX_ADDRESS = 200;
const MAX_DETAILS = 800;
const MAX_HOURS = 80;

function clamp(s: string, max: number): string {
  return s.trim().slice(0, max);
}

function SubmitPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const title = clamp(String(fd.get("title") || ""), MAX_TITLE);
    const address = clamp(String(fd.get("address") || ""), MAX_ADDRESS);
    const hours = clamp(String(fd.get("hours") || ""), MAX_HOURS);
    const details = clamp(String(fd.get("details") || ""), MAX_DETAILS);
    const typeRaw = String(fd.get("type") || "garage");
    const type: SaleKind =
      typeRaw === "yard" || typeRaw === "estate" || typeRaw === "permit"
        ? typeRaw
        : "garage";

    if (!title || !address) {
      setError("Title and address are required.");
      return;
    }
    if (title.length < 3 || address.length < 5) {
      setError("Please provide a clearer title and street address.");
      return;
    }

    setBusy(true);
    try {
      const q = encodeURIComponent(`${address}, San Antonio TX`);
      // Nominatim usage policy requires a valid identifying User-Agent
      const geo = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`,
        {
          headers: {
            Accept: "application/json",
            "User-Agent":
              "ChicasMap/1.0 (https://justonejewelry.github.io/Chicas-Map/; tips@local)",
          },
          signal: AbortSignal.timeout(10000),
        },
      );
      if (!geo.ok) {
        throw new Error("Geocoder unavailable");
      }
      const hits = (await geo.json()) as { lat: string; lon: string }[];
      let lat = SA_FALLBACK.lat;
      let lon = SA_FALLBACK.lon;
      if (hits[0]) {
        const glat = Number(hits[0].lat);
        const glon = Number(hits[0].lon);
        if (Number.isFinite(glat) && Number.isFinite(glon)) {
          // soft bound to greater San Antonio area
          if (glat > 28.8 && glat < 30.2 && glon > -99.3 && glon < -97.8) {
            lat = glat;
            lon = glon;
          }
        }
      }

      const sale: Sale = {
        id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
      // Future: POST to a moderated Worker endpoint here, then navigate.
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
          Drop your garage, yard, or estate sale on the map. Tips stay on this device until a
          moderator reviews them for the public layer.
        </p>
        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
          <Field
            label="Title"
            name="title"
            placeholder="Tools, vintage, and a riding mower"
            required
            maxLength={MAX_TITLE}
          />
          <Field
            label="Address"
            name="address"
            placeholder="1234 Oak St, San Antonio"
            required
            maxLength={MAX_ADDRESS}
          />
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Type
            <select
              name="type"
              className="h-11 rounded-xl bg-paper px-3 font-normal ring-1 ring-line"
            >
              <option value="garage">Garage sale</option>
              <option value="yard">Yard sale</option>
              <option value="estate">Estate sale</option>
            </select>
          </label>
          <Field
            label="Hours"
            name="hours"
            placeholder="Fri–Sat 8am–2pm"
            maxLength={MAX_HOURS}
          />
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Details
            <textarea
              name="details"
              rows={4}
              maxLength={MAX_DETAILS}
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
  maxLength,
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        maxLength={maxLength}
        className="h-11 rounded-xl bg-paper px-3 font-normal ring-1 ring-line outline-none focus:ring-2 focus:ring-pine"
      />
    </label>
  );
}
