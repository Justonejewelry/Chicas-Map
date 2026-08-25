import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, MapPinned, Route as RouteIcon, Layers } from "lucide-react";
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
    fetchFeed()
      .then(setFeed)
      .catch(() => setFeed(null));
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
              Meet Chica — the nose behind the map
            </p>
            <h1 className="mt-3 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl">
              Find the sale.
              <span className="block text-pine">Plan the hunt.</span>
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
              Verified garage, yard, and estate sales across San Antonio — with the
              tools to find nearby deals and build a smarter Saturday route.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                to="/map"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-pine px-5 text-sm font-semibold text-cream"
              >
                <MapPinned className="size-4" strokeWidth={1.75} />
                Open the map
              </Link>
              <Link
                to="/submit"
                className="inline-flex h-12 items-center rounded-full bg-paper px-5 text-sm font-semibold text-ink ring-1 ring-line"
              >
                List a sale — free
              </Link>
            </div>
            <dl className="mt-8 grid grid-cols-3 gap-3 max-w-md">
              <Stat n={feed ? String(live) : "—"} label="Posted sales" />
              <Stat n={feed ? String(permits) : "—"} label="City permits" />
              <Stat
                n={feed ? relativeRefresh(feed.last_refresh) : "—"}
                label="Updated"
              />
            </dl>
          </div>

          <figure className="relative overflow-hidden rounded-[28px] bg-pine-soft ring-1 ring-line">
            <img
              src="/images/chica-hero.jpg"
              alt="Chica, a black dog in a magenta superhero cape, the mascot of Chicas Map"
              width={1200}
              height={1500}
              className="aspect-[4/5] w-full object-cover object-[center_20%] sm:aspect-[5/6]"
            />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-night/80 to-transparent px-5 pb-4 pt-16 text-sm font-medium text-cream">
              San Antonio · Live sale intelligence
            </figcaption>
          </figure>
        </section>

        <section className="border-y border-line bg-paper">
          <div className="mx-auto max-w-6xl px-4 py-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold tracking-[0.16em] text-pine-mid uppercase">
                  Hot zones
                </p>
                <h2 className="mt-1 font-display text-2xl font-bold">
                  Where the hunt is thick this weekend
                </h2>
              </div>
              <Link to="/map" className="hidden text-sm font-semibold text-pine-mid sm:inline">
                See them on the map
              </Link>
            </div>
            <ul className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {HOT_ZONES.map((z) => (
                <li key={z.name}>
                  <Link
                    to="/map"
                    search={{ zone: z.name }}
                    className="flex h-full flex-col rounded-2xl bg-bg px-4 py-4 ring-1 ring-line transition-colors hover:ring-pine"
                  >
                    <span className="font-display text-sm font-semibold text-ink">{z.name}</span>
                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-pine-mid">
                      Open satellite <ArrowRight className="size-3.5" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-2 lg:items-center">
          <figure className="overflow-hidden rounded-[24px] ring-1 ring-line">
            <img
              src="/images/chica-sale.jpg"
              alt="Chica sitting beside a pile of yard-sale finds"
              width={1600}
              height={1200}
              className="aspect-[5/4] w-full object-cover"
            />
          </figure>
          <div className="grid gap-4">
            <Feature
              icon={MapPinned}
              title="Find the best sales"
              body="See verified garage, yard, estate, and permit leads on one live map, with the details you need before you drive."
            />
            <Feature
              icon={RouteIcon}
              title="Build your route"
              body="Use Near Me, distance sorting, and one-tap Google, Apple, or Waze directions."
            />
            <Feature
              icon={Layers}
              title="Satellite first on phones"
              body="The map opens full screen on mobile in aerial photo view so you can read driveways, parking, and the actual house."
            />
          </div>
        </section>

        <section className="border-t border-line bg-paper">
          <div className="mx-auto max-w-6xl px-4 py-10">
            <h2 className="font-display text-2xl font-bold">Latest posted sales</h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {listings
                .filter((s) => s.type !== "permit")
                .slice(0, 6)
                .map((s) => (
                  <li key={s.id}>
                    <Link
                      to="/map"
                      search={{ sale: s.id }}
                      className="block h-full rounded-2xl bg-bg p-5 ring-1 ring-line transition-colors hover:ring-pine"
                    >
                      <p className="text-xs font-bold tracking-[0.12em] text-pine-mid uppercase">
                        {kindLabel(s.type)}
                      </p>
                      <p className="mt-1 font-display text-base font-semibold text-ink">{s.title}</p>
                      <p className="mt-1 text-sm text-muted">{s.address}</p>
                      {s.dates ? <p className="mt-2 text-xs text-muted">{s.dates}</p> : null}
                    </Link>
                  </li>
                ))}
            </ul>
            <div className="mt-6">
              <Link to="/list" className="text-sm font-semibold text-pine-mid">
                Browse all sales
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div className="rounded-2xl bg-paper px-3 py-3 ring-1 ring-line">
      <dt className="text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</dt>
      <dd className="mt-1 font-display text-lg font-bold tabular-nums text-ink">{n}</dd>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof MapPinned;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl bg-paper p-4 ring-1 ring-line">
      <span className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-pine-soft text-pine-deep">
        <Icon className="size-4" strokeWidth={1.75} />
      </span>
      <div>
        <h3 className="font-display text-base font-semibold">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
      </div>
    </div>
  );
}
