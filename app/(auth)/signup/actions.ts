"use server";

import { redirect } from "next/navigation";

import { getOrigin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  magicLinkSchema,
  signupSchema,
  type AuthFormState,
} from "@/lib/validation/auth";

/** Registrazione con email + password. Richiede conferma email (se attiva). */
export async function signUpWithPassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const origin = await getOrigin();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/callback?next=/dashboard`,
    },
  });

  if (error) {
    return { error: "Registrazione non riuscita. Riprova." };
  }

  // Supabase restituisce un utente con `identities` vuoto se l'email esiste gia'.
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return {
      error: "Esiste gia' un account con questa email. Prova ad accedere.",
    };
  }

  // Se la conferma email e' disattivata, la sessione e' gia' attiva: vai avanti.
  if (data.session) {
    redirect("/dashboard");
  }

  return {
    message:
      "Ti abbiamo inviato un'email di conferma. Apri il link per attivare l'account.",
  };
}

/** Registrazione senza password: magic link che crea l'utente se non esiste. */
export async function signUpWithMagicLink(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = magicLinkSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const origin = await getOrigin();
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${origin}/callback?next=/dashboard`,
      shouldCreateUser: true,
    },
  });
  if (error) {
    return { error: "Impossibile inviare il link. Riprova tra poco." };
  }

  return {
    message:
      "Ti abbiamo inviato un link di accesso. Controlla la posta per continuare.",
  };
}
