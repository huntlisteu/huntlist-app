import { cache } from "react";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import type { OfferStatus } from "@/lib/tcg";

export type OfferRow = {
  id: string;
  hunt_id: string;
  seller_id: string;
  price_cents: number;
  shipping_cents: number;
  currency: string;
  message: string | null;
  status: OfferStatus;
  created_at: string;
  updated_at: string;
};

export type OfferWithSeller = OfferRow & {
  seller_username: string | null;
  seller_display_name: string;
};

const uuidSchema = z.string().uuid();

const OFFER_COLUMNS =
  "id, hunt_id, seller_id, price_cents, shipping_cents, currency, message, status, created_at, updated_at";

type RawOffer = OfferRow & {
  profiles: { username: string | null; display_name: string } | null;
};

/**
 * Tutte le offerte di una hunt, con il profilo del venditore.
 * Accessibili all'acquirente (RLS) e ai venditori per la loro offerta.
 * Ordinate per data creazione discendente.
 */
export const getOffersForHunt = cache(
  async (huntId: string): Promise<OfferWithSeller[]> => {
    if (!uuidSchema.safeParse(huntId).success) return [];

    const supabase = await createClient();
    const { data } = await supabase
      .from("offers")
      .select(`${OFFER_COLUMNS}, profiles!seller_id(username, display_name)`)
      .eq("hunt_id", huntId)
      .order("created_at", { ascending: false })
      .returns<RawOffer[]>();

    return (data ?? []).map((row) => ({
      ...row,
      seller_username: row.profiles?.username ?? null,
      seller_display_name: row.profiles?.display_name ?? "Venditore",
    }));
  },
);

/**
 * Offerta attiva (pending / accepted) dell'utente corrente per una hunt.
 * Restituisce null se non ne esiste una o se è stata ritirata/rifiutata.
 */
export const getMyOfferForHunt = cache(
  async (huntId: string, userId: string): Promise<OfferRow | null> => {
    if (!uuidSchema.safeParse(huntId).success) return null;
    if (!uuidSchema.safeParse(userId).success) return null;

    const supabase = await createClient();
    const { data } = await supabase
      .from("offers")
      .select(OFFER_COLUMNS)
      .eq("hunt_id", huntId)
      .eq("seller_id", userId)
      .in("status", ["pending", "accepted"])
      .maybeSingle<OfferRow>();

    return data;
  },
);
