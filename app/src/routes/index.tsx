import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, MapPinned, Route as RouteIcon, Layers, Share2, HeartHandshake, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import {
  allSales,
  fetchFeed,
  HOT_ZONES,
  kindLabel,
  relativeRefresh,
  type CityFeed,
} from "@/lib/sales";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [feed, setFeed] = useState<CityFeed | null>(null);

  useEffect(() => {
    fetchFeed().then(setFeed).catch(() => setFeed(null));
  }, []);

  const listings = feed ? allSales(feed) : [];
  const live = feed?.public.length ?? 0;
  const permits = feed?.permits.length ?? 0;

  return (
    <div className="min-h-dvh bg-bg">
      <SiteHeader />
      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-8 sm:py-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-pine-mid uppercase">
              Meet Chica — your neighborhood map scout
            </p>
            <h1 className="mt-3 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl">
              Find what’s happening.
              <span className="block text-pine">Share it with the pack.</span>
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
              Chica’s Map brings San Antonio neighbors useful local information in one place — sales, events, community resources, and the details that help you plan your day.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link to="/map" className="inline-flex h-12 items-center gap-2 rounded-full bg-pine px-5 text-sm font-semibold text-cream">
                <MapPinned className="size-4" strokeWidth={1.75} />
                Open the map
              </Link>
              <Link to="/submit" className="inline-flex h-12 items-center gap-2 rounded-full bg-paper px-5 text-sm font-semibold text-ink ring-1 ring-line">
                <HeartHandshake className="size-4" />
                Share with the pack
              </Link>
              <button
                type="button"
                onClick={() => navigator.share?.({ title: "Chica’s Map", text: "Check out Chica’s Map — San Antonio community intel.", url: window.location.href })}
                className="inline-flex h-12 items-center gap-2 rounded-full bg-paper px-5 text-sm font-semibold text-ink ring-1 ring-line hover:ring-pine"
              >
                <Share2 className="size-4" />
                Share Chica
              </button>
            </div>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
              Chica listens. Got a correction, a better source, or a community event we should know about? Send it. Your time matters, and every useful tip makes the map stronger.
            </p>
            <dl className="mt-8 grid max-w-md grid-cols-3 gap-3">
              <Stat n={feed ? String(live) : "—"} label="Posted sales" />
              <Stat n={feed ? String(permits) : "—"} label="City permits" />
              <Stat n={feed ? relativeRefresh(feed.last_refresh) : "—"} label="Updated" />
            </dl>
          </div>

          <figure className="relative overflow-hidden rounded-[28px] bg-pine-soft ring-1 ring-line">
            <img src="/images/chica-hero.jpg" alt="Chica, the San Antonio Chihuahua mascot of Chica’s Map" width={1200} height={1500} className="aspect-[4/5] w-full object-cover object-[center_20%] sm:aspect-[5/6]" />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-night/80 to-transparent px-5 pb-4 pt-16 text-sm font-medium text-cream">
              San Antonio · Neighbors helping neighbors
            </figcaption>
          </figure>
        </section>

        <section className="border-y border-line bg-paper">
          <div className="mx-auto max-w-6xl px-4 py-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold tracking-[0.16em] text-pine-mid uppercase">Community pulse</p>
                <h2 className="mt-1 font-display text-2xl font-bold">Where the pack is active</h2>
              </div>
              <Link to="/map" className="hidden text-sm font-semibold text-pine-mid sm:inline">See it on the map</Link>
            </div>
            <ul className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {HOT_ZONES.map((z) => (
                <li key={z.name}>
                  <Link to="/map" search={{ zone: z.name }} className="flex h-full flex-col rounded-2xl bg-bg px-4 py-4 ring-1 ring-line transition-colors hover:ring-pine">
                    <span className="font-display text-sm font-semibold text-ink">{z.name}</span>
                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-pine-mid">Open map <ArrowRight className="size-3.5" /></span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-2 lg:items-center">
          <figure className="overflow-hidden rounded-[24px] ring-1 ring-line">
            <img src="/images/chica-sale.jpg" alt="Chica beside community finds" width={1600} height={1200} className="aspect-[5/4] w-full object-cover" />
          </figure>
          <div className="grid gap-4">
            <Feature icon={MapPinned} title="Find useful local information" body="Sales, events, resources, and community locations brought together so you can spend less time searching and more time living in San Antonio." />
            <Feature icon={RouteIcon} title="Plan your day" body="Use nearby locations, distance sorting, and one-tap directions to make a practical route." />
            <Feature icon={Layers} title="See the neighborhood" body="Map layers help you understand what is around you — not just a single destination." />
            <Feature icon={Share2} title="Share what you know" body="A good pin should travel. Pass along useful information, give credit, and help another neighbor save a trip." />
          </div>
        </section>

        <section className="border-t border-line bg-paper">
          <div className="mx-auto max-w-6xl px-4 py-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold tracking-[0.16em] text-pine-mid uppercase">Pack principle</p>
                <h2 className="mt-1 font-display text-2xl font-bold">Loyalty. Duty. Respect. Service. Honor. Integrity. Courage.</h2>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">Those Army values are useful in any neighborhood: keep your word, respect people's time, serve where you can, be honest about what you know, and have the courage to make the community better.</p>
              </div>
              <Link to="/submit" className="inline-flex h-11 items-center gap-2 rounded-full bg-pine px-5 text-sm font-semibold text-cream">
                <MessageCircle className="size-4" />
                Send Chica a tip
              </Link>
            </div>
          </div>
        </section>

        <section className="border-t border-line bg-paper">
          <div className="mx-auto max-w-6xl px-4 py-10">
            <h2 className="font-display text-2xl font-bold">Latest posted sales</h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {listings.filter((s) => s.type !== "permit").slice(0, 6).map((s) => (
                <li key={s.id}>
                  <Link to="/map" search={{ sale: s.id }} className="block h-full rounded-2xl bg-bg p-5 ring-1 ring-line transition-colors hover:ring-pine">
                    <p className="text-xs font-bold tracking-[0.12em] text-pine-mid uppercase">{kindLabel(s.type)}</p>
                    <p className="mt-1 font-display text-base font-semibold text-ink">{s.title}</p>
                    <p className="mt-1 text-sm text-muted">{s.address}</p>
                    {s.dates ? <p className="mt-2 text-xs text-muted">{s.dates}</p> : null}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-4">
              <Link to="/list" className="text-sm font-semibold text-pine-mid">Browse all sales</Link>
              <Link to="/submit" className="text-sm font-semibold text-pine-mid">Add something useful</Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return <div className="rounded-2xl bg-paper px-3 py-3 ring-1 ring-line"><dt className="text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</dt><dd className="mt-1 font-display text-lg font-bold tabular-nums text-ink">{n}</dd></div>;
}

function Feature({ icon: Icon, title, body }: { icon: typeof MapPinned; title: string; body: string }) {
  return <div className="flex gap-3 rounded-2xl bg-paper p-4 ring-1 ring-line"><span className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-pine-soft text-pine-deep"><Icon className="size-4" strokeWidth={1.75} /></span><div><h3 className="font-display text-base font-semibold">{title}</h3><p className="mt-1 text-sm leading-relaxed text-muted">{body}</p></div></div>;
}
