import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { SaleMap, zoneFromName } from "@/components/sale-map";
import {
  allSales,
  fetchFeed,
  loadSubmissions,
  type CityFeed,
  type Sale,
} from "@/lib/sales";

const searchSchema = z.object({
  zone: z.string().optional(),
  sale: z.string().optional(),
});

export const Route = createFileRoute("/map")({
  validateSearch: searchSchema,
  component: MapPage,
});

function MapPage() {
  const { zone, sale } = Route.useSearch();
  const [feed, setFeed] = useState<CityFeed | null>(null);
  const [local, setLocal] = useState<Sale[]>([]);

  useEffect(() => {
    fetchFeed().then(setFeed).catch(() => setFeed(null));
    setLocal(loadSubmissions());
  }, []);

  const sales = useMemo(() => {
    const base = feed ? allSales(feed) : [];
    return [...local, ...base];
  }, [feed, local]);

  const focus = useMemo(() => {
    if (sale) {
      const hit = sales.find((s) => s.id === sale);
      if (hit) return { lat: hit.lat, lon: hit.lon, zoom: 19 };
    }
    const z = zoneFromName(zone);
    if (z) return { lat: z.lat, lon: z.lon, zoom: z.zoom };
    return null;
  }, [zone, sale, sales]);

  return (
    <div className="relative h-dvh overflow-hidden bg-night">
      <SaleMap sales={sales} focus={focus} fullscreen />
    </div>
  );
}
