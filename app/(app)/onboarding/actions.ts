"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { completeOnboardingSchema } from "@/lib/validation/auth";

export type OnboardingResult = { success: true } | { error: string };

export async function completeOnboarding(
  formData: FormData,
): Promise<OnboardingResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Non autenticato. Effettua il login e riprova." };
  }

  const parsed = completeOnboardingSchema.safeParse({
    username: formData.get("username"),
    preferred_games: formData.getAll("preferred_games"),
    full_name: formData.get("full_name"),
    avatar_url: formData.get("avatar_url"),
    role: formData.get("role"),
    shop_name: formData.get("shop_name"),
    shop_address: formData.get("shop_address"),
    instagram_url: formData.get("instagram_url"),
    tiktok_url: formData.get("tiktok_url"),
    x_url: formData.get("x_url"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const {
    username,
    preferred_games,
    full_name,
    avatar_url,
    role,
    shop_name,
    shop_address,
    instagram_url,
    tiktok_url,
    x_url,
  } = parsed.data;

  // Controlla unicità username (esclude l'utente corrente).
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .neq("id", user.id)
    .maybeSingle();

  if (existing) {
    return { error: "Username non disponibile. Scegline un altro." };
  }

  // Costruisce il payload base.
  const updatePayload: Record<string, unknown> = {
    username,
    preferred_games,
    onboarding_completed: true,
    full_name: full_name ?? null,
    is_early_user: true,
    role,
  };

  if (avatar_url) {
    updatePayload.avatar_url = avatar_url;
  }

  // Campi condizionali per ruolo.
  if (role === "shop") {
    updatePayload.shop_name = shop_name ?? null;
    updatePayload.shop_address = shop_address ?? null;
    updatePayload.shop_pending = true;
  }

  if (role === "creator") {
    updatePayload.instagram_url = instagram_url ?? null;
    updatePayload.tiktok_url = tiktok_url ?? null;
    updatePayload.x_url = x_url ?? null;
    updatePayload.creator_pending = true;
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", user.id);

  if (updateError) {
    if (updateError.code === "23505") {
      return { error: "Username non disponibile. Scegline un altro." };
    }
    return { error: "Impossibile completare l'onboarding. Riprova." };
  }

  revalidatePath("/market");
  revalidatePath("/dashboard");

  return { success: true };
}
