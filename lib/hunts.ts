import { cache } from "react";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import type { CardCondition, Game, HuntStatus } from "@/lib/tcg";

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
