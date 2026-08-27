import { Link, useRouterState } from "@tanstack/react-router";
import { MapPinned, Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

const INTEL_HREF = "https://justonejewelry.github.io/Chicas-Map/intel/";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/map", label: "Map" },
  { to: "/list", label: "Sales" },
  { to: "/submit", label: "List a sale" },
] as const;

export function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  return (
    <header
      className={cn(
        "z-40 border-b",
        overlay
          ? "absolute inset-x-0 top-0 border-white/10 bg-night/70 text-cream backdrop-blur-md"
          : "sticky top-0 border-line bg-bg/90 text-ink backdrop-blur-md",
      )}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <Link to="/" className="flex min-w-0 items-center gap-2.5">
          <img
            src="/images/chica-logo.png"
            alt=""
            width={36}
            height={36}
            className="size-9 rounded-full object-cover ring-1 ring-pine/40"
          />
          <span className="font-display text-[15px] font-bold tracking-tight">
            Chicas Map
          </span>
        </Link>
        <nav className="hidden items-center gap-1 sm:flex" aria-label="Primary">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                pathname === l.to
                  ? overlay
                    ? "bg-white/15 text-cream"
                    : "bg-pine-soft text-pine-deep"
                  : overlay
                    ? "text-cream/75 hover:bg-white/10 hover:text-cream"
                    : "text-muted hover:bg-pine-soft hover:text-ink",
              )}
            >
              {l.label}
            </Link>
          ))}
          <a
            href={INTEL_HREF}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              overlay
                ? "text-cream/75 hover:bg-white/10 hover:text-cream"
                : "text-muted hover:bg-pine-soft hover:text-ink",
            )}
          >
            Intel
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/map"
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-pine px-3.5 text-sm font-semibold text-cream"
          >
            <MapPinned className="size-4" strokeWidth={1.75} />
            Open map
          </Link>
          <button
            type="button"
            className={cn(
              "inline-flex size-10 items-center justify-center rounded-full sm:hidden",
              overlay ? "bg-white/10" : "bg-paper ring-1 ring-line",
            )}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open ? (
        <nav className="flex flex-col gap-1 border-t border-line px-4 py-3 sm:hidden" aria-label="Mobile">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium"
            >
              {l.label}
            </Link>
          ))}
          <a href={INTEL_HREF} className="rounded-lg px-3 py-2.5 text-sm font-medium" onClick={() => setOpen(false)}>
            Intel
          </a>
        </nav>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line px-4 py-8 text-sm text-muted">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p>Chicas Map · San Antonio garage sale intelligence. Veteran-built.</p>
        <p>
          <a href={INTEL_HREF} className="font-semibold text-pine-mid">
            Sale Intel
          </a>
          {" · "}
          Listings from public posts and city permits. Verify on site.
        </p>
      </div>
    </footer>
  );
}
