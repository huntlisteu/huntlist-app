import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ChatThread } from "@/components/offers/ChatThread";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import {
  getMessages,
  getOfferDetail,
  getOfferItems,
} from "@/lib/offers";
import {
  CONDITION_LABELS,
  OFFER_STATUS_LABELS,
  type OfferStatus,
} from "@/lib/tcg";

export const metadata: Metadata = {
  title: "Chat · Huntlist",
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

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default async function OfferChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  // Fetch in parallelo: dettaglio offerta, snapshot carte, messaggi iniziali.
  const [offer, items, messages] = await Promise.all([
    getOfferDetail(id),
    getOfferItems(id),
    getMessages(id),
  ]);

  // null = offerta inesistente o l'utente non è partecipante (RLS).
  if (!offer) notFound();

  // Verifica esplicita partecipazione (difesa in profondità oltre la RLS).
  const isParticipant =
    user.id === offer.seller_id || user.id === offer.buyer_id;
  if (!isParticipant) notFound();

  // Chat aperta se l'offerta è attiva (pending/accepted) e la hunt non è
  // stata chiusa manualmente (closed). hunt_status = "matched" è permesso:
  // acquirente e venditore devono coordinarsi sulla spedizione.
  const isOpen =
    (offer.status === "pending" || offer.status === "accepted") &&
    offer.hunt_status !== "closed";

  const buyer = {
    id: offer.buyer_id,
    username: offer.buyer_username,
    displayName: offer.buyer_display_name,
  };
  const seller = {
    id: offer.seller_id,
    username: offer.seller_username,
    displayName: offer.seller_display_name,
  };

  const totalCents = offer.price_cents + offer.shipping_cents;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* ── Breadcrumb / titolo ── */}
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-accent">
          Chat offerta
        </p>
        <h1 className="mt-1 font-heading text-2xl font-semibold sm:text-3xl">
          <Link
            href={`/hunts/${offer.hunt_id}`}
            className="hover:underline underline-offset-4"
          >
            {offer.hunt_title}
          </Link>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Offerta del {formatDate(offer.created_at)}
        </p>
      </div>

      {/* ── Dettagli offerta ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">Riepilogo offerta</CardTitle>
            <Badge variant={OFFER_STATUS_VARIANT[offer.status]}>
              {OFFER_STATUS_LABELS[offer.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Partecipanti */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span className="text-muted-foreground">
              Venditore:{" "}
              <span className="font-medium text-foreground">
                {offer.seller_username
                  ? `@${offer.seller_username}`
                  : offer.seller_display_name}
              </span>
            </span>
            <span className="text-muted-foreground">
              Acquirente:{" "}
              <span className="font-medium text-foreground">
                {offer.buyer_username
                  ? `@${offer.buyer_username}`
                  : offer.buyer_display_name}
              </span>
            </span>
          </div>

          {/* Prezzi */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span className="text-muted-foreground">
              Carte:{" "}
              <span className="font-medium text-foreground">
                {formatCents(offer.price_cents)}
              </span>
            </span>
            {offer.shipping_cents > 0 && (
              <span className="text-muted-foreground">
                Spedizione:{" "}
                <span className="font-medium text-foreground">
                  {formatCents(offer.shipping_cents)}
                </span>
              </span>
            )}
            <span className="text-muted-foreground">
              Totale:{" "}
              <span className="font-semibold text-foreground">
                {formatCents(totalCents)}
              </span>
            </span>
          </div>

          {/* Messaggio del venditore */}
          {offer.message && (
            <p className="rounded-md bg-muted px-3 py-2 text-sm italic text-muted-foreground">
              &ldquo;{offer.message}&rdquo;
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Snapshot carte confermate ── */}
      {items.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Carte confermate{" "}
              <span className="text-muted-foreground">({items.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{item.card_name}</p>
                    {item.note && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.note}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {CONDITION_LABELS[item.condition]}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* ── Chat realtime ── */}
      <section className="space-y-3">
        <h2 className="font-heading text-xl font-semibold">Chat</h2>
        <ChatThread
          offerId={id}
          currentUserId={user.id}
          initialMessages={messages}
          buyer={buyer}
          seller={seller}
          isOpen={isOpen}
        />
      </section>
    </div>
  );
}
