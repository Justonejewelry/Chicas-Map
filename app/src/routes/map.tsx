import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/map")({
  component: MapBounce,
});

/** Live hunt map is Leaflet at webapp/map/index.html. Do not render SaleMap here. */
function MapBounce() {
  if (typeof window !== "undefined") {
    const next = "/Chicas-Map/map/" + (window.location.search || "") + (window.location.hash || "");
    window.location.replace(next);
  }
  return null;
}
