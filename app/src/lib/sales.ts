export type SaleKind = "garage" | "yard" | "estate" | "permit";

export type Sale = {
  id: string;
  title: string;
  address: string;
  lat: number;
  lon: number;
  type: SaleKind;
  hours: string;
  dates: string;
  date_from: string;
  date_to: string;
  details: string;
  source: string;
  url: string;
  status: string;
  categories: string[];
  boost: boolean;
  preferred: boolean;
  permit_number: string;
  submitted?: boolean;
};

export type CityFeed = {
  edition: string;
  city: string;
  date: string;
  last_refresh: string;
  total_locations: number;
  hot_zones: string[];
  public: Sale[];
  permits: Sale[];
};

export const SA_CENTER: [number, number] = [29.4241, -98.4936];

export const HOT_ZONES: { name: string; lat: number; lon: number; zoom: number }[] = [
  { name: "Potranco Run / Raceland", lat: 29.418, lon: -98.732, zoom: 13 },
  { name: "Shavano / 78230", lat: 29.548, lon: -98.561, zoom: 13 },
  { name: "Schertz / Universal City", lat: 29.57, lon: -98.278, zoom: 12 },
  { name: "South Central tools (Bailey)", lat: 29.391, lon: -98.495, zoom: 13 },
  { name: "Northwest / 78240", lat: 29.528, lon: -98.618, zoom: 13 },
];

const SUBMIT_KEY = "chicas-map-submissions";

export function allSales(feed: CityFeed): Sale[] {
  return [...feed.public, ...feed.permits];
}

export function kindLabel(kind: string): string {
  if (kind === "estate") return "Estate";
  if (kind === "permit") return "Permit";
  if (kind === "yard") return "Yard";
  return "Garage";
}

export function markerColor(kind: string, boost?: boolean): string {
  if (boost) return "#f4c430";
  if (kind === "estate") return "#7c3aed";
  if (kind === "permit") return "#2563eb";
  if (kind === "yard") return "#0f766e";
  return "#c513af";
}

export function haversineMi(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const R = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function mapsLinks(sale: Sale) {
  const addr = encodeURIComponent(sale.address || `${sale.lat},${sale.lon}`);
  return {
    apple: `https://maps.apple.com/?daddr=${addr}&ll=${sale.lat},${sale.lon}&t=k&z=19`,
    waze: `https://waze.com/ul?ll=${sale.lat},${sale.lon}&navigate=yes`,
  };
}

export function loadSubmissions(): Sale[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SUBMIT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Sale[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSubmission(sale: Sale) {
  const next = [sale, ...loadSubmissions().filter((s) => s.id !== sale.id)];
  localStorage.setItem(SUBMIT_KEY, JSON.stringify(next));
}

export function relativeRefresh(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "just now";
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 36) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export async function fetchFeed(): Promise<CityFeed> {
  const res = await fetch("/data/san-antonio.json");
  if (!res.ok) throw new Error("Could not load live sales");
  return (await res.json()) as CityFeed;
}
