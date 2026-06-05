import { cache } from "react";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { GAMES, type CardCondition, type Game, type HuntStatus } from "@/lib/tcg";

export type HuntRow = {
  id: string;
  buyer_id: string;
  title: string;
  description: string | null;
  game: Game;
  status: HuntStatus;
  created_at: string;
  updated_at: string;
};

export type HuntCardRow = {
  id: string;
  hunt_id: string;
  name: string;
  set_name: string | null;
  collector_number: string | null;
  desired_condition: CardCondition | null;
  language: string | null;
  quantity: number;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Feed pubblico
// ---------------------------------------------------------------------------

export const FEED_PAGE_SIZE = 12;

export type FeedHunt = {
  id: string;
  title: string;
  game: Game;
  created_at: string;
  card_count: number;
  buyer_username: string | null;
  buyer_display_name: string;
};

export type FeedPage = {
  hunts: FeedHunt[];
  /** ISO timestamp dell'ultima Hunt della pagina; null se non ci sono altre pagine. */
  nextCursor: string | null;
};

type RawFeedHunt = {
  id: string;
  title: string;
  game: Game;
  created_at: string;
  profiles: { username: string | null; display_name: string } | null;
  hunt_cards: { id: string }[];
};

/**
 * Restituisce una pagina di Hunt aperte, ordinate per data di creazione
 * discendente. Accessibile anche a utenti non autenticati (RLS permette
 * la lettura delle Hunt open a tutti).
 *
 * @param opts.game    - Filtra per gioco (opzionale).
 * @param opts.cursor  - ISO timestamp esclusivo (lt) per la paginazione cursor-based.
 */
export async function getFeedHunts(opts?: {
  game?: Game;
  cursor?: string;
}): Promise<FeedPage> {
  const supabase = await createClient();

  // Valida il game in ingresso per non passare valori arbitrari alla query.
  const game =
    opts?.game && GAMES.includes(opts.game) ? opts.game : undefined;

  let query = supabase
    .from("hunts")
    .select(
      "id, title, game, created_at, profiles!buyer_id(username, display_name), hunt_cards!hunt_id(id)",
    )
    .eq("status", "open")
    .order("created_at", { ascending: false })
    // Fetch PAGE_SIZE + 1 per sapere se esiste una pagina successiva.
    .limit(FEED_PAGE_SIZE + 1);

  if (game) {
    query = query.eq("game", game);
  }
  if (opts?.cursor) {
    query = query.lt("created_at", opts.cursor);
  }

  const { data } = await query.returns<RawFeedHunt[]>();
  const rows = data ?? [];

  const hasMore = rows.length > FEED_PAGE_SIZE;
  const items = hasMore ? rows.slice(0, FEED_PAGE_SIZE) : rows;

  const hunts: FeedHunt[] = items.map((row) => ({
    id: row.id,
    title: row.title,
    game: row.game,
    created_at: row.created_at,
    card_count: Array.isArray(row.hunt_cards) ? row.hunt_cards.length : 0,
    buyer_username: row.profiles?.username ?? null,
    buyer_display_name: row.profiles?.display_name ?? "Utente",
  }));

  return {
    hunts,
    nextCursor: hasMore ? items[items.length - 1].created_at : null,
  };
}

// ---------------------------------------------------------------------------
// Dashboard acquirente
// ---------------------------------------------------------------------------

const DASHBOARD_PAGE_SIZE = 10;

export type DashboardHunt = {
  id: string;
  title: string;
  game: Game;
  status: HuntStatus;
  created_at: string;
  card_count: number;
  offer_count: number;
};

type RawMyHunt = {
  id: string;
  title: string;
  game: Game;
  status: HuntStatus;
  created_at: string;
  hunt_cards: { id: string }[];
  offers: { id: string }[];
};

/**
 * Hunts pubblicate dall'utente, ordinate per data discendente.
 * Restituisce la pagina richiesta (1-indexed) e un flag hasMore.
 */
export async function getMyHunts(
  userId: string,
  page: number = 1,
): Promise<{ hunts: DashboardHunt[]; hasMore: boolean }> {
  const supabase = await createClient();
  const offset = (page - 1) * DASHBOARD_PAGE_SIZE;

  const { data } = await supabase
    .from("hunts")
    .select(
      "id, title, game, status, created_at, hunt_cards!hunt_id(id), offers!hunt_id(id)",
    )
    .eq("buyer_id", userId)
    .order("created_at", { ascending: false })
    // range è inclusivo; fetchiamo PAGE_SIZE + 1 per rilevare hasMore.
    .range(offset, offset + DASHBOARD_PAGE_SIZE)
    .returns<RawMyHunt[]>();

  const rows = data ?? [];
  const hasMore = rows.length > DASHBOARD_PAGE_SIZE;
  const items = hasMore ? rows.slice(0, DASHBOARD_PAGE_SIZE) : rows;

  return {
    hunts: items.map((row) => ({
      id: row.id,
      title: row.title,
      game: row.game,
      status: row.status,
      created_at: row.created_at,
      card_count: Array.isArray(row.hunt_cards) ? row.hunt_cards.length : 0,
      offer_count: Array.isArray(row.offers) ? row.offers.length : 0,
    })),
    hasMore,
  };
}

// ---------------------------------------------------------------------------
// Hunt di dettaglio
// ---------------------------------------------------------------------------

const uuidSchema = z.string().uuid();

const HUNT_COLUMNS =
  "id, buyer_id, title, description, game, status, created_at, updated_at";
const HUNT_CARD_COLUMNS =
  "id, hunt_id, name, set_name, collector_number, desired_condition, language, quantity, created_at";

/**
 * Hunt + carte, rispettando la RLS (la visibilita' la decide can_view_hunt:
 * open per tutti, oppure proprietario/venditore-con-offerta). Restituisce null
 * se l'id non e' un uuid valido o la Hunt non e' visibile/inesistente.
 */
export const getHuntWithCards = cache(
  async (
    id: string,
  ): Promise<{ hunt: HuntRow; cards: HuntCardRow[] } | null> => {
    if (!uuidSchema.safeParse(id).success) return null;

    const supabase = await createClient();

    const { data: hunt } = await supabase
      .from("hunts")
      .select(HUNT_COLUMNS)
      .eq("id", id)
      .maybeSingle<HuntRow>();

    if (!hunt) return null;

    const { data: cards } = await supabase
      .from("hunt_cards")
      .select(HUNT_CARD_COLUMNS)
      .eq("hunt_id", id)
      .order("created_at", { ascending: true })
      .returns<HuntCardRow[]>();

    return { hunt, cards: cards ?? [] };
  },
);
