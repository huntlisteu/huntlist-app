import { cache } from "react";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import type { CardCondition, OfferStatus } from "@/lib/tcg";

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

/** Vista completa dell'offerta con profili di entrambi i partecipanti. */
export type OfferDetail = OfferRow & {
  seller_username: string | null;
  seller_display_name: string;
  hunt_title: string;
  hunt_status: string;
  buyer_id: string;
  buyer_username: string | null;
  buyer_display_name: string;
};

export type OfferItemRow = {
  id: string;
  offer_id: string;
  hunt_card_id: string | null;
  card_name: string;
  condition: CardCondition;
  note: string | null;
  created_at: string;
};

export type MessageRow = {
  id: string;
  offer_id: string;
  sender_id: string;
  body: string;
  created_at: string;
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

// ---------------------------------------------------------------------------
// Dettaglio offerta (per la pagina chat)
// ---------------------------------------------------------------------------

type RawOfferDetail = OfferRow & {
  seller: { username: string | null; display_name: string } | null;
  hunts: {
    id: string;
    title: string;
    status: string;
    buyer_id: string;
    buyer: { username: string | null; display_name: string } | null;
  } | null;
};

/**
 * Offerta con profili del venditore e dell'acquirente (via hunt).
 * Restituisce null se l'offerta non esiste o l'utente non è partecipante (RLS).
 */
export const getOfferDetail = cache(
  async (offerId: string): Promise<OfferDetail | null> => {
    if (!uuidSchema.safeParse(offerId).success) return null;

    const supabase = await createClient();
    const { data } = await supabase
      .from("offers")
      .select(
        `${OFFER_COLUMNS},
         seller:profiles!seller_id(username, display_name),
         hunts!hunt_id(id, title, status, buyer_id, buyer:profiles!buyer_id(username, display_name))`,
      )
      .eq("id", offerId)
      .maybeSingle<RawOfferDetail>();

    if (!data || !data.hunts) return null;

    return {
      ...data,
      seller_username: data.seller?.username ?? null,
      seller_display_name: data.seller?.display_name ?? "Venditore",
      hunt_title: data.hunts.title,
      hunt_status: data.hunts.status,
      buyer_id: data.hunts.buyer_id,
      buyer_username: data.hunts.buyer?.username ?? null,
      buyer_display_name: data.hunts.buyer?.display_name ?? "Acquirente",
    };
  },
);

/** Snapshot carte dell'offerta, ordinate per data di creazione. */
export const getOfferItems = cache(
  async (offerId: string): Promise<OfferItemRow[]> => {
    if (!uuidSchema.safeParse(offerId).success) return [];

    const supabase = await createClient();
    const { data } = await supabase
      .from("offer_items")
      .select(
        "id, offer_id, hunt_card_id, card_name, condition, note, created_at",
      )
      .eq("offer_id", offerId)
      .order("created_at", { ascending: true })
      .returns<OfferItemRow[]>();

    return data ?? [];
  },
);

/** Ultimi 100 messaggi del thread, ordine cronologico ascendente. */
export const getMessages = cache(
  async (offerId: string): Promise<MessageRow[]> => {
    if (!uuidSchema.safeParse(offerId).success) return [];

    const supabase = await createClient();
    const { data } = await supabase
      .from("messages")
      .select("id, offer_id, sender_id, body, created_at")
      .eq("offer_id", offerId)
      .order("created_at", { ascending: true })
      .limit(100)
      .returns<MessageRow[]>();

    return data ?? [];
  },
);

// ---------------------------------------------------------------------------
// Offerta corrente del venditore
// ---------------------------------------------------------------------------

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
