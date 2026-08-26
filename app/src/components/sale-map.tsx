import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ChevronUp,
  Expand,
  LocateFixed,
  Navigation,
  Satellite,
  Map as MapIcon,
  X,
} from "lucide-react";
import type { Sale } from "@/lib/sales";
import {
  haversineMi,
  HOT_ZONES,
  kindLabel,
  mapsLinks,
  markerColor,
  SA_CENTER,
} from "@/lib/sales";
import { cn } from "@/lib/cn";

const ESRI_SAT =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const ESRI_LABELS =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Reference_Overlay/MapServer/tile/{z}/{y}/{x}";
const CARTO =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

type Props = {
  sales: Sale[];
  focus?: { lat: number; lon: number; zoom?: number } | null;
  fullscreen?: boolean;
};

export function SaleMap({ sales, focus, fullscreen }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const tilesRef = useRef<{
    base: import("leaflet").TileLayer;
    labels?: import("leaflet").TileLayer;
  } | null>(null);
  const [ready, setReady] = useState(false);
  const [satellite, setSatellite] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [you, setYou] = useState<{ lat: number; lon: number } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [hud, setHud] = useState(false);
  const [filter, setFilter] = useState<"all" | "public" | "permit">("all");

  const filtered = useMemo(() => {
    if (filter === "permit") return sales.filter((s) => s.type === "permit");
    if (filter === "public") return sales.filter((s) => s.type !== "permit");
    return sales;
  }, [sales, filter]);

  const selected = filtered.find((s) => s.id === selectedId) ?? null;

  const nearby = useMemo(() => {
    const origin = you ?? (selected ? { lat: selected.lat, lon: selected.lon } : null);
    const list = origin
      ? [...filtered].sort((a, b) => haversineMi(origin, a) - haversineMi(origin, b))
      : filtered;
    return list.slice(0, 40);
  }, [filtered, you, selected]);

  useEffect(() => {
    let cancelled = false;
    let map: import("leaflet").Map | undefined;

    (async () => {
      const L = await import("leaflet");
      if (cancelled || !hostRef.current) return;

      map = L.map(hostRef.current, {
        zoomControl: false,
        attributionControl: true,
        maxZoom: 19,
      }).setView(focus ? [focus.lat, focus.lon] : SA_CENTER, focus?.zoom ?? 16);

      const base = L.tileLayer(ESRI_SAT, {
        attribution: "Tiles © Esri",
        maxZoom: 19,
      }).addTo(map);
      const labels = L.tileLayer(ESRI_LABELS, { maxZoom: 19, opacity: 0.9 }).addTo(map);
      L.control.zoom({ position: "bottomright" }).addTo(map);

      const group = L.layerGroup().addTo(map);
      mapRef.current = map;
      layerRef.current = group;
      tilesRef.current = { base, labels };
      setReady(true);
      requestAnimationFrame(() => map?.invalidateSize());
    })();

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
      layerRef.current = null;
      tilesRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focus) return;
    map.flyTo([focus.lat, focus.lon], focus.zoom ?? 19, { duration: 0.8 });
  }, [focus]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !tilesRef.current) return;
    (async () => {
      const L = await import("leaflet");
      tilesRef.current?.base.remove();
      tilesRef.current?.labels?.remove();
      if (satellite) {
        const base = L.tileLayer(ESRI_SAT, {
          attribution: "Tiles © Esri",
          maxZoom: 19,
        }).addTo(map);
        const labels = L.tileLayer(ESRI_LABELS, { maxZoom: 19, opacity: 0.9 }).addTo(map);
        tilesRef.current = { base, labels };
      } else {
        const base = L.tileLayer(CARTO, {
          attribution: "© OpenStreetMap © CARTO",
          maxZoom: 19,
        }).addTo(map);
        tilesRef.current = { base };
      }
    })();
  }, [satellite]);

  useEffect(() => {
    const group = layerRef.current;
    const map = mapRef.current;
    if (!group || !map || !ready) return;
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled) return;
      group.clearLayers();
      for (const sale of filtered) {
        const active = sale.id === selectedId;
        const color = markerColor(sale.type, sale.boost);
        const size = active ? 22 : 16;
        const icon = L.divIcon({
          className: "chica-pin",
          html: `<div class="chica-pin-inner" style="background:${color};width:${size}px;height:${size}px;outline:${active ? "3px solid #fff" : "none"}"></div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
        L.marker([sale.lat, sale.lon], { icon, title: sale.title })
          .on("click", (event) => {
            L.DomEvent.stopPropagation(event.originalEvent);
            setSelectedId(sale.id);
            setSheetOpen(false);
            setHud(false);
            setSatellite(true);
            map.flyTo([sale.lat, sale.lon], 19, { duration: 0.45 });
          })
          .addTo(group);
      }
      if (you) {
        const icon = L.divIcon({
          className: "chica-pin",
          html: `<div class="chica-you"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        L.marker([you.lat, you.lon], { icon, title: "You" }).addTo(group);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filtered, selectedId, you, ready]);

  function nearMe() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setYou(next);
        mapRef.current?.flyTo([next.lat, next.lon], 16, { duration: 0.7 });
      },
      () => undefined,
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  function viewAerial(sale: Sale) {
    setSelectedId(sale.id);
    setSatellite(true);
    setSheetOpen(false);
    setHud(false);
    mapRef.current?.flyTo([sale.lat, sale.lon], 19, { duration: 0.55 });
  }

  const cinema = !hud && !sheetOpen;

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden bg-night",
        fullscreen || true ? "h-dvh w-full" : "h-[52dvh] min-h-[22rem] w-full lg:h-[38rem]",
      )}
    >
      <div ref={hostRef} className="absolute inset-0 z-0" />

      {hud ? (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-20 p-3"
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
            {fullscreen ? (
              <Link
                to="/"
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-night-panel/85 px-3 text-sm font-semibold text-cream ring-1 ring-white/15 backdrop-blur-md"
              >
                <ArrowLeft className="size-4" />
                Home
              </Link>
            ) : null}
            {(
              [
                ["all", "All"],
                ["public", "Posted"],
                ["permit", "Permits"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={cn(
                  "h-10 rounded-full px-3.5 text-sm font-semibold ring-1 backdrop-blur-md",
                  filter === id
                    ? "bg-pine text-cream ring-pine"
                    : "bg-night-panel/80 text-cream ring-white/15",
                )}
              >
                {label}
              </button>
            ))}
            <span className="ml-auto flex gap-1.5">
              <button
                type="button"
                onClick={() => setSatellite((v) => !v)}
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-night-panel/80 px-3 text-sm font-semibold text-cream ring-1 ring-white/15 backdrop-blur-md"
                aria-pressed={satellite}
              >
                {satellite ? <Satellite className="size-4" /> : <MapIcon className="size-4" />}
                <span className="hidden sm:inline">{satellite ? "Satellite" : "Street"}</span>
              </button>
              <button
                type="button"
                onClick={nearMe}
                className="inline-flex size-10 items-center justify-center rounded-full bg-night-panel/80 text-cream ring-1 ring-white/15 backdrop-blur-md"
                aria-label="Near me"
              >
                <LocateFixed className="size-4" />
              </button>
            </span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setHud(true);
            setSheetOpen(true);
          }}
          className="absolute z-20 inline-flex size-11 items-center justify-center rounded-full bg-pine text-cream"
          style={{
            top: "max(0.75rem, env(safe-area-inset-top))",
            right: "0.75rem",
          }}
          aria-label="Show listings"
        >
          <ChevronUp className="size-4 rotate-180" />
        </button>
      )}

      {selected && !sheetOpen ? (
        <div
          className="absolute inset-x-3 z-20 max-w-md rounded-2xl bg-night-panel/95 text-cream shadow-[0_8px_40px_rgb(0_0_0_/_0.4)] ring-1 ring-white/10 backdrop-blur-md lg:left-3 lg:right-auto"
          style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <SelectedCard
            sale={selected}
            you={you}
            onClose={() => setSelectedId(null)}
            onAerial={() => viewAerial(selected)}
          />
        </div>
      ) : null}

      {sheetOpen ? (
        <div
          className="absolute inset-x-0 bottom-0 z-20 flex flex-col lg:inset-y-20 lg:left-3 lg:right-auto lg:w-[22.5rem]"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <button
            type="button"
            className="mx-auto mb-1 flex h-8 w-24 items-center justify-center rounded-full bg-night-panel/80 text-cream lg:hidden"
            onClick={() => setSheetOpen(false)}
            aria-expanded={sheetOpen}
          >
            <ChevronUp className="size-5 rotate-180" />
          </button>
          <div className="overflow-hidden rounded-t-2xl bg-night-panel/95 text-cream shadow-[0_-8px_40px_rgb(0_0_0_/_0.35)] ring-1 ring-white/10 backdrop-blur-md lg:rounded-2xl">
            {selected ? (
              <SelectedCard
                sale={selected}
                you={you}
                onClose={() => setSelectedId(null)}
                onAerial={() => viewAerial(selected)}
              />
            ) : (
              <div className="px-4 py-3">
                <p className="text-xs font-bold tracking-[0.14em] text-cream/55 uppercase">
                  {filtered.length} pins
                </p>
                <p className="font-display text-lg font-semibold">Live San Antonio sales</p>
              </div>
            )}
            <ul className="max-h-[28dvh] overflow-auto border-t border-white/10 lg:max-h-[28rem]">
              {nearby.map((sale) => (
                <li key={sale.id}>
                  <button
                    type="button"
                    onClick={() => viewAerial(sale)}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-left",
                      selectedId === sale.id ? "bg-white/10" : "hover:bg-white/5",
                    )}
                  >
                    <span
                      className="mt-1 size-2.5 shrink-0 rounded-full"
                      style={{ background: markerColor(sale.type, sale.boost) }}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{sale.title}</span>
                      <span className="mt-0.5 block truncate text-xs text-cream/60">
                        {kindLabel(sale.type)}
                        {you ? ` · ${haversineMi(you, sale).toFixed(1)} mi` : ""}
                        {sale.dates ? ` · ${sale.dates}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SelectedCard({
  sale,
  you,
  onClose,
  onAerial,
}: {
  sale: Sale;
  you: { lat: number; lon: number } | null;
  onClose: () => void;
  onAerial: () => void;
}) {
  const links = mapsLinks(sale);
  return (
    <div className="px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-[0.14em] text-pine uppercase">
            {kindLabel(sale.type)}
            {sale.status === "verified" ? " · Verified" : ""}
          </p>
          <h2 className="font-display text-lg font-semibold leading-snug">{sale.title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-white/10"
          aria-label="Close listing"
        >
          <X className="size-4" />
        </button>
      </div>
      <p className="mt-1 text-sm text-cream/75">{sale.address}</p>
      {sale.dates ? <p className="mt-1 text-xs text-cream/60">{sale.dates}</p> : null}
      {you ? (
        <p className="mt-1 text-xs font-medium text-cream/80">
          {haversineMi(you, sale).toFixed(1)} miles away
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onAerial}
          className="inline-flex h-10 items-center gap-1.5 rounded-full bg-pine px-3.5 text-sm font-semibold text-cream"
        >
          <Expand className="size-3.5" /> Aerial
        </button>
        <a
          href={links.apple}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white/10 px-3.5 text-sm font-semibold ring-1 ring-white/15"
        >
          <Navigation className="size-3.5" /> Apple
        </a>
        <a
          href={links.waze}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center rounded-full bg-white/10 px-3.5 text-sm font-semibold ring-1 ring-white/15"
        >
          Waze
        </a>
      </div>
    </div>
  );
}

export function zoneFromName(name?: string | null) {
  if (!name) return null;
  return HOT_ZONES.find((z) => z.name.toLowerCase() === name.toLowerCase()) ?? null;
}
