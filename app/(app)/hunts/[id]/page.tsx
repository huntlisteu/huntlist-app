import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { closeHunt } from "@/app/(app)/hunts/actions";
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
  CONDITION_LABELS,
  GAME_LABELS,
  HUNT_STATUS_LABELS,
  type HuntStatus,
} from "@/lib/tcg";

export const metadata: Metadata = {
  title: "Hunt · Huntlist",
};

const STATUS_VARIANT: Record<
  HuntStatus,
  "secondary" | "muted" | "accent"
> = {
  open: "secondary",
  closed: "muted",
  matched: "accent",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default async function HuntDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [data, user] = await Promise.all([getHuntWithCards(id), getUser()]);
  if (!data) {
    notFound();
  }
  const { hunt, cards } = data;

  const isOwner = user?.id === hunt.buyer_id;
  const canEdit = isOwner && hunt.status === "open";

  return (
    <div className="mx-auto max-w-3xl space-y-8">
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
                      card.collector_number ? `#${card.collector_number}` : null,
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
    </div>
  );
}
