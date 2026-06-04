import { z } from "zod";

import { CARD_CONDITIONS, GAMES } from "@/lib/tcg";

/**
 * Schemi Zod per Hunt e relative carte. Usati nelle Server Actions (server) e
 * per i type nei form (client). Il vincolo "offerta totale" non riguarda qui:
 * una Hunt e' semplicemente una lista di carte cercate (1..20).
 */

/** Testo opzionale: normalizza stringa vuota/spazi -> null, poi valida lunghezza. */
const nullableText = (max: number, label: string) =>
  z.preprocess(
    (v) => {
      if (typeof v !== "string") return null;
      const t = v.trim();
      return t.length > 0 ? t : null;
    },
    z
      .string()
      .max(max, `${label}: massimo ${max} caratteri`)
      .nullable(),
  );

const requiredText = (min: number, max: number, label: string) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z
      .string({ message: `${label} obbligatorio` })
      .min(min, `${label}: minimo ${min} caratteri`)
      .max(max, `${label}: massimo ${max} caratteri`),
  );

export const huntCardSchema = z.object({
  name: requiredText(1, 200, "Nome carta"),
  set_name: nullableText(120, "Set"),
  collector_number: nullableText(40, "Numero"),
  language: nullableText(40, "Lingua"),
  quantity: z.coerce
    .number({ message: "Quantita' non valida" })
    .int("La quantita' deve essere un intero")
    .min(1, "Minimo 1")
    .max(99, "Massimo 99"),
  desired_condition: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.enum(CARD_CONDITIONS).nullable(),
  ),
});

export type HuntCardInput = z.infer<typeof huntCardSchema>;

export const createHuntSchema = z.object({
  title: requiredText(3, 120, "Titolo"),
  description: nullableText(2000, "Descrizione"),
  game: z.enum(GAMES, { message: "Scegli un gioco" }),
  cards: z
    .array(huntCardSchema)
    .min(1, "Aggiungi almeno una carta")
    .max(20, "Puoi inserire al massimo 20 carte"),
});

export type CreateHuntInput = z.infer<typeof createHuntSchema>;

export const updateHuntSchema = createHuntSchema.extend({
  id: z.string().uuid("Hunt non valida"),
});

export type UpdateHuntInput = z.infer<typeof updateHuntSchema>;

export const closeHuntSchema = z.object({
  id: z.string().uuid("Hunt non valida"),
});

/** Stato restituito dalle Server Actions delle Hunt a `useActionState`. */
export type HuntFormState = {
  error?: string;
};
