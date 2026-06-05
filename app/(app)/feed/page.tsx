import type { Metadata } from "next";
import Link from "next/link";

import { HuntFeedCard } from "@/components/hunts/HuntFeedCard";
import { Button } from "@/components/ui/button";
import { getFeedHunts } from "@/lib/hunts";
import { GAMES, GAME_LABELS, type Game } from "@/lib/tcg";

export const metadata: Metadata = {
  title: "Feed Hunt · Huntlist",
  description:
    "Scopri le mancaliste aperte su Huntlist e rispondi con un'offerta.",
};

// Nessuna cache per il feed: vogliamo sempre dati freschi.
export const dynamic = "force-dynamic";

/** Costruisce l'URL del feed mantenendo solo i parametri valorizzati. */
function buildUrl(params: { game?: Game; cursor?: string }): string {
  const sp = new URLSearchParams();
  if (params.game) sp.set("game", params.game);
  if (params.cursor) sp.set("cursor", params.cursor);
  const qs = sp.toString();
  return `/feed${qs ? `?${qs}` : ""}`;
}

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  // Normalizza i valori (possono essere array se il param è ripetuto).
  const rawGame = Array.isArray(sp.game) ? sp.game[0] : sp.game;
  const rawCursor = Array.isArray(sp.cursor) ? sp.cursor[0] : sp.cursor;

  // Valida il game contro i valori noti; scarta valori sconosciuti.
  const game: Game | undefined =
    rawGame && GAMES.includes(rawGame as Game) ? (rawGame as Game) : undefined;
  const cursor: string | undefined =
    typeof rawCursor === "string" ? rawCursor : undefined;

  const { hunts, nextCursor } = await getFeedHunts({ game, cursor });

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-accent">
          Feed pubblico
        </p>
        <h1 className="mt-1 font-heading text-3xl font-semibold sm:text-4xl">
          Hunt aperte
        </h1>
        <p className="mt-2 text-muted-foreground">
          Mancaliste in cerca di un venditore. Rispondi con un&apos;offerta che
          copre l&apos;intera lista in un&apos;unica spedizione.
        </p>
      </div>

      {/* ── Filtro gioco ── */}
      <div className="flex flex-wrap gap-2">
        <Button asChild variant={!game ? "default" : "outline"} size="sm">
          <Link href={buildUrl({})}>Tutti</Link>
        </Button>
        {GAMES.map((g) => (
          <Button
            key={g}
            asChild
            variant={game === g ? "default" : "outline"}
            size="sm"
          >
            <Link href={buildUrl({ game: g })}>{GAME_LABELS[g]}</Link>
          </Button>
        ))}
      </div>

      {/* ── Contenuto ── */}
      {hunts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-20 text-center">
          <p className="font-heading text-lg text-muted-foreground">
            Nessuna Hunt aperta
            {game ? ` per ${GAME_LABELS[game]}` : ""}.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Sii il primo a pubblicare una mancalista.
          </p>
          <Button asChild className="mt-6" size="sm">
            <Link href="/hunts/new">Pubblica una Hunt</Link>
          </Button>
        </div>
      ) : (
        <>
          <ul
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            aria-label="Lista Hunt aperte"
          >
            {hunts.map((hunt) => (
              <li key={hunt.id}>
                <HuntFeedCard hunt={hunt} />
              </li>
            ))}
          </ul>

          {/* ── Paginazione cursor-based ── */}
          <div className="flex items-center justify-between">
            {/* Torna alla prima pagina se siamo a un cursore */}
            {cursor ? (
              <Button asChild variant="ghost" size="sm">
                <Link href={buildUrl({ game })}>← Torna all&apos;inizio</Link>
              </Button>
            ) : (
              <span />
            )}

            {nextCursor ? (
              <Button asChild variant="outline">
                <Link href={buildUrl({ game, cursor: nextCursor })}>
                  Altre Hunt →
                </Link>
              </Button>
            ) : (
              <span />
            )}
          </div>
        </>
      )}
    </div>
  );
}
