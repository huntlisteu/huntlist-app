import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { FeedHunt } from "@/lib/hunts";
import { GAME_LABELS } from "@/lib/tcg";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface HuntFeedCardProps {
  hunt: FeedHunt;
}

export function HuntFeedCard({ hunt }: HuntFeedCardProps) {
  const handle = hunt.buyer_username
    ? `@${hunt.buyer_username}`
    : hunt.buyer_display_name;

  const cardLabel =
    hunt.card_count === 1 ? "1 carta cercata" : `${hunt.card_count} carte cercate`;

  return (
    <Link href={`/hunts/${hunt.id}`} className="group block h-full">
      <Card className="flex h-full flex-col transition-colors duration-150 group-hover:border-primary">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline" className="text-xs">
              {GAME_LABELS[hunt.game]}
            </Badge>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatDate(hunt.created_at)}
            </span>
          </div>
          <CardTitle className="mt-2 line-clamp-2 text-base leading-snug">
            {hunt.title}
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 pb-3">
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            {/* Icona carte: semplice cerchio con numero */}
            <span
              aria-hidden="true"
              className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground"
            >
              {hunt.card_count}
            </span>
            {cardLabel}
          </p>
        </CardContent>

        <CardFooter className="pt-0">
          <p className="truncate text-xs text-muted-foreground">{handle}</p>
        </CardFooter>
      </Card>
    </Link>
  );
}
