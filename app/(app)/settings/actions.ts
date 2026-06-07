"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getOrigin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { GAMES } from "@/lib/tcg";

export type SettingsResult = { success: true } | { error: string };

const EUROPEAN_COUNTRY_CODES = new Set([
  "AT", "BE", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE",
  "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL",
  "PT", "RO", "SK", "SI", "ES", "SE", "GB", "CH", "NO",
]);

const updateProfileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .max(100, "Il nome non può superare i 100 caratteri")
    .nullable(),
  bio: z
    .string()
    .trim()
    .max(160, "La bio non può superare i 160 caratteri")
    .nullable(),
  country: z
    .string()
    .nullable()
    .refine(
      (v) => v === null || EUROPEAN_COUNTRY_CODES.has(v),
      "Paese non valido",
    ),
});

const updatePreferredGamesSchema = z.object({
  preferred_games: z
    .array(z.enum([...GAMES] as [string, ...string[]]))
    .min(1, "Seleziona almeno un gioco"),
});

export async function updateProfile(formData: FormData): Promise<SettingsResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Non autenticato." };

  const parsed = updateProfileSchema.safeParse({
    full_name: (formData.get("full_name") as string | null)?.trim() || null,
    bio: (formData.get("bio") as string | null)?.trim() || null,
    country: (formData.get("country") as string | null) || null,
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      bio: parsed.data.bio,
      country: parsed.data.country,
    })
    .eq("id", user.id);

  if (updateError) return { error: "Impossibile salvare le modifiche. Riprova." };

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateAvatarUrl(avatarUrl: string): Promise<SettingsResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Non autenticato." };

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id);

  if (updateError) return { error: "Impossibile salvare l'avatar. Riprova." };

  revalidatePath("/settings");
  revalidatePath("/feed");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updatePreferredGames(
  formData: FormData,
): Promise<SettingsResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Non autenticato." };

  const parsed = updatePreferredGamesSchema.safeParse({
    preferred_games: formData.getAll("preferred_games"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ preferred_games: parsed.data.preferred_games })
    .eq("id", user.id);

  if (updateError) return { error: "Impossibile salvare le modifiche. Riprova." };

  revalidatePath("/settings");
  return { success: true };
}

// ── updateBadgeInfo ───────────────────────────────────────────────────────────

const optionalUrl = z.preprocess(
  (v) => (typeof v === "string" && !v.trim() ? undefined : v),
  z.string().url("Inserisci un URL valido (es. https://...)").optional(),
);

const updateShopSchema = z.object({
  shop_name: z.string().trim().min(1, "Nome negozio obbligatorio").max(100),
  shop_address: z.string().trim().min(1, "Indirizzo obbligatorio").max(200),
});

const updateCreatorSchema = z
  .object({
    instagram_url: optionalUrl,
    tiktok_url: optionalUrl,
    x_url: optionalUrl,
  })
  .refine(
    (d) => !!(d.instagram_url || d.tiktok_url || d.x_url),
    { message: "Inserisci almeno un link social", path: ["instagram_url"] },
  );

export async function updateBadgeInfo(
  formData: FormData,
): Promise<SettingsResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Non autenticato." };

  const { data: profileData } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = (profileData as { role: string } | null)?.role;

  if (role === "shop") {
    const parsed = updateShopSchema.safeParse({
      shop_name: formData.get("shop_name"),
      shop_address: formData.get("shop_address"),
    });
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    const { error: updateError } = await supabase
      .from("profiles")
      .update(parsed.data)
      .eq("id", user.id);
    if (updateError) return { error: "Impossibile salvare. Riprova." };
  } else if (role === "creator") {
    const parsed = updateCreatorSchema.safeParse({
      instagram_url: formData.get("instagram_url"),
      tiktok_url: formData.get("tiktok_url"),
      x_url: formData.get("x_url"),
    });
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        instagram_url: parsed.data.instagram_url ?? null,
        tiktok_url: parsed.data.tiktok_url ?? null,
        x_url: parsed.data.x_url ?? null,
      })
      .eq("id", user.id);
    if (updateError) return { error: "Impossibile salvare. Riprova." };
  } else {
    return { error: "Ruolo non supportato." };
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function sendPasswordResetEmail(): Promise<SettingsResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Non autenticato." };

  if (!user.email) return { error: "Nessuna email associata a questo account." };

  const origin = await getOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo: `${origin}/auth/callback?next=/update-password`,
  });

  if (error) return { error: "Impossibile inviare l'email. Riprova." };
  return { success: true };
}
