import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { withdrawOffer } from "@/app/(app)/offers/actions";
import { OfferForm } from "@/components/offers/OfferForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getHuntWithCards } from "@/lib/hunts";
import { getMyOfferForHunt } from "@/lib/offers";
import { GAME_LABELS, OFFER_STATUS_LABELS } from "@/lib/tcg";

export const metadata: Metadata = {
  title: "Fai un'offerta · Huntlist",
};

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
  });
}

export default async function OfferPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const data = await getHuntWithCards(id);
  if (!data) notFound();
  const { hunt, cards } = data;

  // Non puoi offrire sulla tua Hunt.
  if (hunt.buyer_id === user.id) redirect(`/hunts/${id}`);

  // Hunt deve essere aperta.
  if (hunt.status !== "open") redirect(`/hunts/${id}`);

  // Controlla offerta attiva esistente.
  const myOffer = await getMyOfferForHunt(id, user.id);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* ── Header ── */}
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-accent">
          Nuova offerta
        </p>
        <h1 className="mt-1 font-heading text-3xl font-semibold sm:text-4xl">
          {hunt.title}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="outline">{GAME_LABELS[hunt.game]}</Badge>
          <span className="text-sm text-muted-foreground">
            {cards.length} {cards.length === 1 ? "carta" : "carte"} richieste
          </span>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          L&apos;offerta deve coprire{" "}
          <span className="font-medium text-foreground">tutte le carte</span>{" "}
          in un&apos;unica spedizione a prezzo unico.
        </p>
      </div>

      {myOffer ? (
        /* ── Offerta già esistente ── */
        <div className="space-y-4 rounded-lg border border-border bg-card p-6">
          <div>
            <p className="font-heading text-lg font-semibold">
              Hai già un&apos;offerta su questa Hunt
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
              <Badge
                variant={
                  myOffer.status === "accepted"
                    ? "accent"
                    : myOffer.status === "pending"
                      ? "secondary"
                      : "muted"
                }
              >
                {OFFER_STATUS_LABELS[myOffer.status]}
              </Badge>
              <span className="text-muted-foreground">
                Carte:{" "}
                <span className="font-medium text-foreground">
                  {formatCents(myOffer.price_cents)}
                </span>
              </span>
              {myOffer.shipping_cents > 0 && (
                <span className="text-muted-foreground">
                  Spedizione:{" "}
                  <span className="font-medium text-foreground">
                    {formatCents(myOffer.shipping_cents)}
                  </span>
                </span>
              )}
              <span className="text-muted-foreground">
                Totale:{" "}
                <span className="font-medium text-foreground">
                  {formatCents(myOffer.price_cents + myOffer.shipping_cents)}
                </span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
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
      ) : (
        /* ── Form nuova offerta ── */
        <OfferForm huntId={id} cards={cards} />
      )}
    </div>
  );
}
