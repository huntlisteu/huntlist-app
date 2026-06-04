"use server";

import { redirect } from "next/navigation";

import { getOrigin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  loginSchema,
  magicLinkSchema,
  type AuthFormState,
} from "@/lib/validation/auth";

/** Login con email + password. In caso di successo redirige alla dashboard. */
export async function loginWithPassword(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: "Email o password non corretti." };
  }

  redirect("/dashboard");
}

/** Login senza password: invia un magic link all'email (utente gia' esistente). */
export async function loginWithMagicLink(
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
      shouldCreateUser: false,
    },
  });
  if (error) {
    return { error: "Impossibile inviare il link. Riprova tra poco." };
  }

  return {
    message:
      "Ti abbiamo inviato un magic link. Controlla la posta e apri il link per accedere.",
  };
}
