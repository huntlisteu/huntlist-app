import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { acceptOffer, closeHunt } from "@/app/(app)/hunts/actions";
import { withdrawOffer } from "@/app/(app)/offers/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getUser } from "@/lib/auth";
import { getHuntWithCards } from "@/lib/hunts";
import {
  getMyOfferForHunt,
  getOffersForHunt,
  type OfferRow,
  type OfferWithSeller,
} from "@/lib/offers";
import {
  CONDITION_LABELS,
  GAME_LABELS,
  HUNT_STATUS_LABELS,
  OFFER_STATUS_LABELS,
  type HuntStatus,
  type OfferStatus,
} from "@/lib/tcg";

export const metadata: Metadata = {
  title: "Hunt · Huntlist",
};

const STATUS_VARIANT: Record<HuntStatus, "secondary" | "muted" | "accent"> = {
  open: "secondary",
  closed: "muted",
  matched: "accent",
};

const OFFER_STATUS_VARIANT: Record<
  OfferStatus,
  "secondary" | "muted" | "accent" | "destructive"
> = {
  pending: "secondary",
  accepted: "accent",
  rejected: "muted",
  withdrawn: "muted",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
  });
}

export default async function HuntDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [data, user] = await Promise.all([getHuntWithCards(id), getUser()]);
  if (!data) notFound();
  const { hunt, cards } = data;

  const isOwner = user?.id === hunt.buyer_id;
  const canEdit = isOwner && hunt.status === "open";

  // Le offerte sono visibili solo al proprietario (RLS).
  const offers: OfferWithSeller[] = isOwner ? await getOffersForHunt(id) : [];

  // Offerta attiva del venditore (non-owner loggato) su questa Hunt.
  const myOffer: OfferRow | null =
    !isOwner && user ? await getMyOfferForHunt(id, user.id) : null;
  const pendingOffers = offers.filter((o) => o.status === "pending");

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* ── Header ── */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{GAME_LABELS[hunt.game]}</Badge>
          <Badge variant={STATUS_VARIANT[hunt.status]}>
            {HUNT_STATUS_LABELS[hunt.status]}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Pubblicata il {formatDate(hunt.created_at)}
          </span>
        </div>

        <h1 className="font-heading text-3xl font-semibold sm:text-4xl">
          {hunt.title}
        </h1>

        {hunt.description ? (
          <p className="whitespace-pre-wrap text-muted-foreground">
            {hunt.description}
          </p>
        ) : null}
      </div>

      {/* ── Azioni proprietario ── */}
      {isOwner && (
        <div className="flex flex-wrap items-center gap-3">
          {canEdit && (
            <Button asChild variant="outline">
              <Link href={`/hunts/${hunt.id}/edit`}>Modifica</Link>
            </Button>
          )}
          {hunt.status === "open" && (
            <form action={closeHunt}>
              <input type="hidden" name="id" value={hunt.id} />
              <Button type="submit" variant="ghost">
                Chiudi Hunt
              </Button>
            </form>
          )}
        </div>
      )}

      {/* ── Banner venditore ── */}
      {!isOwner && (
        <div className="rounded-lg border border-border bg-card p-4">
          {!user ? (
            /* Non autenticato */
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                Accedi per rispondere a questa Hunt.
              </p>
              <Button asChild variant="outline">
                <Link href="/login">Accedi</Link>
              </Button>
            </div>
          ) : myOffer ? (
            /* Offerta esistente */
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="font-medium">La tua offerta</p>
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <Badge variant={OFFER_STATUS_VARIANT[myOffer.status]}>
                    {OFFER_STATUS_LABELS[myOffer.status]}
                  </Badge>
                  <span>
                    Totale:{" "}
                    <span className="font-medium text-foreground">
                      {formatCents(myOffer.price_cents + myOffer.shipping_cents)}
                    </span>
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/offers/${myOffer.id}`}>Vai alla chat</Link>
                </Button>
                {myOffer.status === "pending" && (
                  <form action={withdrawOffer}>
                    <input type="hidden" name="offer_id" value={myOffer.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      Ritira offerta
                    </Button>
                  </form>
                )}
              </div>
            </div>
          ) : hunt.status === "open" ? (
            /* Nessuna offerta, Hunt aperta */
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">Hai le carte?</p>
                <p className="text-sm text-muted-foreground">
                  Fai un&apos;offerta per l&apos;intero bundle in un&apos;unica
                  spedizione.
                </p>
              </div>
              <Button asChild>
                <Link href={`/hunts/${hunt.id}/offer`}>
                  Fai un&apos;offerta
                </Link>
              </Button>
            </div>
          ) : null}
        </div>
      )}

      {/* ── Carte cercate ── */}
      <Card>
        <CardHeader>
          <CardTitle>
            Carte cercate{" "}
            <span className="text-muted-foreground">({cards.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {cards.map((card) => (
              <li
                key={card.id}
                className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="font-medium">{card.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {[
                      card.set_name,
                      card.collector_number
                        ? `#${card.collector_number}`
                        : null,
                      card.language,
                      card.desired_condition
                        ? CONDITION_LABELS[card.desired_condition]
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Nessun dettaglio aggiuntivo"}
                  </p>
                </div>
                <Badge variant="muted" className="shrink-0">
                  ×{card.quantity}
                </Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* ── Offerte ricevute (solo proprietario) ── */}
      {isOwner && (
        <section className="space-y-4">
          <div>
            <h2 className="font-heading text-xl font-semibold">
              Offerte ricevute{" "}
              <span className="text-muted-foreground">({offers.length})</span>
            </h2>
            {pendingOffers.length > 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                {pendingOffers.length}{" "}
                {pendingOffers.length === 1
                  ? "offerta in attesa"
                  : "offerte in attesa"}{" "}
                — accettandone una, le altre vengono rifiutate automaticamente.
              </p>
            )}
          </div>

          {offers.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border py-10 text-center">
              <p className="text-sm text-muted-foreground">
                Nessuna offerta ancora. Il feed è pubblico:{" "}
                <Link href="/feed" className="underline underline-offset-4">
                  condividi la tua Hunt
                </Link>
                .
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {offers.map((offer) => (
                <li
                  key={offer.id}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    {/* Info venditore + prezzo */}
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">
                          {offer.seller_username
                            ? `@${offer.seller_username}`
                            : offer.seller_display_name}
                        </span>
                        <Badge variant={OFFER_STATUS_VARIANT[offer.status]}>
                          {OFFER_STATUS_LABELS[offer.status]}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span>
                          Carte:{" "}
                          <span className="font-medium text-foreground">
                            {formatCents(offer.price_cents)}
                          </span>
                        </span>
                        {offer.shipping_cents > 0 && (
                          <span>
                            Spedizione:{" "}
                            <span className="font-medium text-foreground">
                              {formatCents(offer.shipping_cents)}
                            </span>
                          </span>
                        )}
                        <span>
                          Totale:{" "}
                          <span className="font-semibold text-foreground">
                            {formatCents(
                              offer.price_cents + offer.shipping_cents,
                            )}
                          </span>
                        </span>
                      </div>
                      {offer.message && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          &ldquo;{offer.message}&rdquo;
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatDate(offer.created_at)}
                      </p>
                    </div>

                    {/* Azioni */}
                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/offers/${offer.id}`}>
                          Vai alla chat
                        </Link>
                      </Button>
                      {offer.status === "pending" &&
                        hunt.status === "open" && (
                          <form action={acceptOffer}>
                            <input
                              type="hidden"
                              name="offer_id"
                              value={offer.id}
                            />
                            <Button type="submit" size="sm">
                              Accetta
                            </Button>
                          </form>
                        )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
