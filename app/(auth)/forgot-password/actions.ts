"use server";

import { getOrigin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { magicLinkSchema, type AuthFormState } from "@/lib/validation/auth";

/**
 * Invia l'email di reset password. Restituisce sempre un messaggio di successo
 * per non rivelare se l'email è registrata (security best practice).
 */
export async function sendPasswordReset(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = magicLinkSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const origin = await getOrigin();
  const supabase = await createClient();

  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/callback?next=/update-password`,
  });

  return {
    message:
      "Ti abbiamo inviato un'email con il link per reimpostare la password. Controlla la posta.",
  };
}
