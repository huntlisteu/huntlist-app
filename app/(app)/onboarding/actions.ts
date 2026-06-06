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

  const rawFullName = (formData.get("full_name") as string | null)?.trim();

  const parsed = completeOnboardingSchema.safeParse({
    username: formData.get("username"),
    preferred_games: formData.getAll("preferred_games"),
    full_name: rawFullName || undefined,
    avatar_url: formData.get("avatar_url") ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { username, preferred_games, full_name, avatar_url } = parsed.data;

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

  const updatePayload: {
    username: string;
    preferred_games: string[];
    onboarding_completed: boolean;
    full_name: string | null;
    avatar_url?: string;
  } = {
    username,
    preferred_games,
    onboarding_completed: true,
    full_name: full_name ?? null,
  };

  if (avatar_url) {
    updatePayload.avatar_url = avatar_url;
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

  revalidatePath("/feed");
  revalidatePath("/dashboard");

  return { success: true };
}
