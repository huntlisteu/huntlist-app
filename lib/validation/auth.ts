import { z } from "zod";

import { GAMES } from "@/lib/tcg";

/**
 * Schemi Zod condivisi per i flussi di autenticazione.
 * Usati sia lato client (per i type) sia lato server (validazione nelle
 * Server Actions). REGOLA: ogni Server Action valida l'input con questi schemi.
 */

export const emailSchema = z
  .string({ message: "Email obbligatoria" })
  .trim()
  .toLowerCase()
  .email("Inserisci un'email valida");

// Supabase limita la password a 72 byte; minimo 8 caratteri per sicurezza.
export const passwordSchema = z
  .string({ message: "Password obbligatoria" })
  .min(8, "La password deve avere almeno 8 caratteri")
  .max(72, "La password non puo' superare i 72 caratteri");

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const magicLinkSchema = z.object({
  email: emailSchema,
});

// Username: 3-30 caratteri, minuscole/numeri/underscore. Normalizzato a lowercase.
export const usernameSchema = z.object({
  username: z
    .string({ message: "Username obbligatorio" })
    .trim()
    .toLowerCase()
    .min(3, "Lo username deve avere almeno 3 caratteri")
    .max(30, "Lo username non puo' superare i 30 caratteri")
    .regex(
      /^[a-z0-9_]+$/,
      "Solo lettere minuscole, numeri e underscore (niente spazi)",
    ),
});

// Schema per il flusso onboarding.
export const completeOnboardingSchema = z.object({
  username: z
    .string({ message: "Username obbligatorio" })
    .trim()
    .min(3, "Lo username deve avere almeno 3 caratteri")
    .max(20, "Lo username non può superare i 20 caratteri")
    .regex(/^[a-zA-Z0-9_]+$/, "Solo lettere, numeri e underscore"),
  preferred_games: z
    .array(z.enum([...GAMES] as [string, ...string[]]))
    .min(1, "Seleziona almeno un gioco"),
  full_name: z
    .string()
    .trim()
    .max(100, "Il nome non può superare i 100 caratteri")
    .optional(),
  avatar_url: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type MagicLinkInput = z.infer<typeof magicLinkSchema>;
export type UsernameInput = z.infer<typeof usernameSchema>;
export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;

/** Stato condiviso restituito dalle Server Actions di auth a `useActionState`. */
export type AuthFormState = {
  error?: string;
  message?: string;
};
