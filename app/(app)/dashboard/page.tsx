import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getProfile, requireUser } from "@/lib/auth";
import { getMyHunts, type DashboardHunt } from "@/lib/hunts";
import { getMyOffers, type DashboardOffer } from "@/lib/offers";
import {
  GAME_LABELS,
  HUNT_STATUS_LABELS,
  OFFER_STATUS_LABELS,
  type HuntStatus,
  type OfferStatus,
} from "@/lib/tcg";

export const metadata: Metadata = {
  title: "Dashboard · Huntlist",
};

// ---------------------------------------------------------------------------
// Costanti UI
// ---------------------------------------------------------------------------

const HUNT_STATUS_VARIANT: Record<
  HuntStatus,
  "secondary" | "muted" | "accent"
> = {
  open: "secondary",
  closed: "muted",
  matched: "accent",
};

const OFFER_STATUS_VARIANT: Record<
  OfferStatus,
  "secondary" | "muted" | "accent"
> = {
  pending: "secondary",
  accepted: "accent",
  rejected: "muted",
  withdrawn: "muted",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function parsePage(v: string | string[] | undefined): number {
  const n = parseInt(String(v ?? "1"), 10);
  return isNaN(n) || n < 1 ? 1 : n;
}

/**
 * Costruisce un href /dashboard preservando la pagina dell'altra sezione.
 */
function pageHref(
  section: "hunts" | "offers",
  page: number,
  hp: number,
  op: number,
): string {
  const h = section === "hunts" ? page : hp;
  const o = section === "offers" ? page : op;
  const params = new URLSearchParams();
  if (h > 1) params.set("huntsPage", String(h));
  if (o > 1) params.set("offersPage", String(o));
  const qs = params.toString();
  return `/dashboard${qs ? `?${qs}` : ""}`;
}

// ---------------------------------------------------------------------------
// Sotto-componenti (server, inline)
// ---------------------------------------------------------------------------

function HuntRow({ hunt }: { hunt: DashboardHunt }) {
  return (
    <li className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/hunts/${hunt.id}`}
              className="font-medium hover:underline underline-offset-4"
            >
              {hunt.title}
            </Link>
            <Badge variant="outline" className="text-xs">
              {GAME_LABELS[hunt.game]}
            </Badge>
            <Badge variant={HUNT_STATUS_VARIANT[hunt.status]} className="text-xs">
              {HUNT_STATUS_LABELS[hunt.status]}
            </Badge>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
            <span>
              {hunt.card_count}{" "}
              {hunt.card_count === 1 ? "carta" : "carte"}
            </span>
            <span>
              {hunt.offer_count}{" "}
              {hunt.offer_count === 1 ? "offerta ricevuta" : "offerte ricevute"}
            </span>
            <span>{formatDate(hunt.created_at)}</span>
          </div>
        </div>

        {hunt.status === "open" && (
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href={`/hunts/${hunt.id}/edit`}>Modifica</Link>
          </Button>
        )}
      </div>
    </li>
  );
}

function OfferRow({ offer }: { offer: DashboardOffer }) {
  const total = offer.price_cents + offer.shipping_cents;
  return (
    <li className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/hunts/${offer.hunt_id}`}
              className="font-medium hover:underline underline-offset-4"
            >
              {offer.hunt_title}
            </Link>
            <Badge
              variant={OFFER_STATUS_VARIANT[offer.status]}
              className="text-xs"
            >
              {OFFER_STATUS_LABELS[offer.status]}
            </Badge>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
            <span>
              Totale:{" "}
              <span className="font-medium text-foreground">
                {formatCents(total)}
              </span>
            </span>
            <span>{formatDate(offer.created_at)}</span>
          </div>
        </div>

        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link href={`/offers/${offer.id}`}>Chat</Link>
        </Button>
      </div>
    </li>
  );
}

function Pagination({
  page,
  hasMore,
  prevHref,
  nextHref,
}: {
  page: number;
  hasMore: boolean;
  prevHref: string;
  nextHref: string;
}) {
  if (page === 1 && !hasMore) return null;
  return (
    <div className="flex items-center justify-between pt-1">
      {page > 1 ? (
        <Button asChild variant="ghost" size="sm">
          <Link href={prevHref}>← Precedente</Link>
        </Button>
      ) : (
        <span />
      )}
      {hasMore ? (
        <Button asChild variant="ghost" size="sm">
          <Link href={nextHref}>Successiva →</Link>
        </Button>
      ) : (
        <span />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pagina
// ---------------------------------------------------------------------------

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const profile = await getProfile();

  if (!profile || !profile.username) {
    redirect("/onboarding");
  }

  const sp = await searchParams;
  const hp = parsePage(sp.huntsPage);
  const op = parsePage(sp.offersPage);

  const [{ hunts, hasMore: hasMoreHunts }, { offers, hasMore: hasMoreOffers }] =
    await Promise.all([
      getMyHunts(user.id, hp),
      getMyOffers(user.id, op),
    ]);

  return (
    <div className="space-y-10">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-accent">
            Dashboard
          </p>
          <h1 className="mt-1 font-heading text-3xl font-semibold sm:text-4xl">
            Ciao, {profile.display_name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            @{profile.username}
          </p>
        </div>

        <Button asChild size="sm">
          <Link href="/hunts/new">+ Nuova Hunt</Link>
        </Button>
      </div>

      {/* ── Le mie Hunt ── */}
      <section className="space-y-4">
        <h2 className="font-heading text-xl font-semibold">Le mie Hunt</h2>

        {hunts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-12 text-center">
            <p className="text-sm text-muted-foreground">
              Non hai ancora pubblicato nessuna Hunt.
            </p>
            <Button asChild size="sm" className="mt-4">
              <Link href="/hunts/new">Pubblica la prima Hunt</Link>
            </Button>
          </div>
        ) : (
          <>
            <ul className="space-y-3">
              {hunts.map((hunt) => (
                <HuntRow key={hunt.id} hunt={hunt} />
              ))}
            </ul>
            <Pagination
              page={hp}
              hasMore={hasMoreHunts}
              prevHref={pageHref("hunts", hp - 1, hp, op)}
              nextHref={pageHref("hunts", hp + 1, hp, op)}
            />
          </>
        )}
      </section>

      {/* ── Le mie offerte ── */}
      <section className="space-y-4">
        <h2 className="font-heading text-xl font-semibold">Le mie offerte</h2>

        {offers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-12 text-center">
            <p className="text-sm text-muted-foreground">
              Non hai ancora fatto nessuna offerta.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link href="/feed">Sfoglia le Hunt aperte</Link>
            </Button>
          </div>
        ) : (
          <>
            <ul className="space-y-3">
              {offers.map((offer) => (
                <OfferRow key={offer.id} offer={offer} />
              ))}
            </ul>
            <Pagination
              page={op}
              hasMore={hasMoreOffers}
              prevHref={pageHref("offers", op - 1, hp, op)}
              nextHref={pageHref("offers", op + 1, hp, op)}
            />
          </>
        )}
      </section>
    </div>
  );
}
