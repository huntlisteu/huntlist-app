import { z } from "zod";

import { CARD_CONDITIONS } from "@/lib/tcg";

/**
 * Converte una stringa euro ("12.50", "12,50", "12") a centesimi interi.
 * Ritorna -1 su input invalido così le validazioni min() producono messaggi
 * leggibili invece di stack trace.
 */
function eurosToCents(v: unknown): number {
  const s = String(v ?? "").trim().replace(",", ".");
  const n = parseFloat(s);
  if (isNaN(n) || n < 0) return -1;
  return Math.round(n * 100);
}

function shippingToCents(v: unknown): number {
  const s = String(v ?? "").trim();
  if (!s) return 0;
  return eurosToCents(v);
}

const nullableText = (max: number, label: string) =>
  z.preprocess(
    (v) => {
      if (typeof v !== "string") return null;
      const t = v.trim();
      return t.length > 0 ? t : null;
    },
    z.string().max(max, `${label}: massimo ${max} caratteri`).nullable(),
  );

/**
 * Snapshot read-only di una carta nell'offerta. Obbligatoria la condizione;
 * la nota è opzionale. hunt_card_id + card_name sono forniti dal client
 * (pre-popolati dalla hunt) e rivalidati server-side con uuid.
 */
export const offerItemSchema = z.object({
  hunt_card_id: z.string().uuid("ID carta non valido"),
  card_name: z
    .string()
    .min(1, "Nome carta non può essere vuoto")
    .max(200, "Nome carta: massimo 200 caratteri"),
  condition: z.enum(CARD_CONDITIONS, {
    message: "Seleziona una condizione per ogni carta",
  }),
  note: nullableText(500, "Nota"),
});

export type OfferItemInput = z.infer<typeof offerItemSchema>;

/**
 * Input già pre-processato dalla Server Action (euro → centesimi, JSON items).
 * La SA legge i campi raw dal FormData e trasforma prima di passare qui.
 */
export const createOfferSchema = z.object({
  hunt_id: z.string().uuid("Hunt non valida"),
  price_cents: z
    .number()
    .int()
    .min(1, "Il prezzo deve essere maggiore di zero"),
  shipping_cents: z
    .number()
    .int()
    .min(0, "La spedizione deve essere un valore positivo"),
  message: nullableText(1000, "Messaggio"),
  items: z
    .array(offerItemSchema)
    .min(1, "Devi confermare la condizione per ogni carta"),
});

export type CreateOfferInput = z.infer<typeof createOfferSchema>;

export const withdrawOfferSchema = z.object({
  offer_id: z.string().uuid("Offerta non valida"),
});

export const acceptOfferSchema = z.object({
  offer_id: z.string().uuid("Offerta non valida"),
});

/** Stato restituito dalle Server Actions offerta a `useActionState`. */
export type OfferFormState = { error?: string };
