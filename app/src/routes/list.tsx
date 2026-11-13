import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import {
  allSales,
  fetchFeed,
  kindLabel,
  markerColor,
  type CityFeed,
  type Sale,
} from "@/lib/sales";

export const Route = createFileRoute("/list")({ component: ListPage });

function ListPage() {
  const [feed, setFeed] = useState<CityFeed | null>(null);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"all" | Sale["type"]>("all");

  useEffect(() => {
    fetchFeed().then(setFeed).catch(() => setFeed(null));
  }, []);

  // Only the approved city feed is public. Device-local submission previews
  // must never be mixed into the Live Sales directory.
  const rows = useMemo(() => {
    const all = feed ? allSales(feed) : [];
    const needle = q.trim().toLowerCase();
    return all.filter((s) => {
      if (kind !== "all" && s.type !== kind) return false;
      if (!needle) return true;
      return `${s.title} ${s.address} ${s.details}`.toLowerCase().includes(needle);
    });
  }, [feed, q, kind]);

  return (
    <div className="min-h-dvh bg-bg">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="font-display text-3xl font-bold">Live sales</h1>
        <p className="mt-2 text-sm text-muted">
          Approved listings first, then city permits. Tap any row to open it on the satellite map.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search address or title"
            className="h-11 flex-1 rounded-xl bg-paper px-3 text-sm ring-1 ring-line outline-none focus:ring-2 focus:ring-pine"
          />
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as typeof kind)}
            className="h-11 rounded-xl bg-paper px-3 text-sm ring-1 ring-line"
          >
            <option value="all">All types</option>
            <option value="garage">Garage Sales</option>
            <option value="estate">Estate Sales</option>
            <option value="permit">City Permits</option>
          </select>
        </div>
        <p className="mt-3 text-xs font-semibold text-muted tabular-nums">{rows.length} results</p>
        <ul className="mt-4 divide-y divide-line overflow-hidden rounded-2xl bg-paper ring-1 ring-line">
          {rows.map((s) => (
            <li key={s.id}>
              <Link
                to="/map"
                search={{ sale: s.id }}
                className="flex items-start gap-3 px-4 py-3.5 hover:bg-pine-soft/60"
              >
                <span
                  className="mt-1.5 size-2.5 shrink-0 rounded-full"
                  style={{ background: markerColor(s.type, s.boost) }}
                />
                <span className="min-w-0">
                  <span className="text-xs font-bold tracking-wide text-pine-mid uppercase">
                    {kindLabel(s.type)}
                  </span>
                  <span className="mt-0.5 block font-medium text-ink">{s.title}</span>
                  <span className="mt-0.5 block text-sm text-muted">{s.address}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter />
    </div>
  );
}
