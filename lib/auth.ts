import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Game } from "@/lib/tcg";

/**
 * Profilo pubblico (sottoinsieme usato dall'app). Allineato a `public.profiles`.
 */
export type Profile = {
  id: string;
  username: string | null;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  country: string | null;
  full_name: string | null;
  preferred_games: Game[];
  onboarding_completed: boolean;
};

/**
 * Utente autenticato lato server. REGOLA DI SICUREZZA #1: usa SEMPRE
 * `supabase.auth.getUser()` (che ricontatta il server di Auth e valida il JWT),
 * MAI la sola sessione letta dal cookie. `cache` deduplica le chiamate nello
 * stesso render/request.
 */
export const getUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** Come getUser ma redirige a /login se non autenticato. Da usare nelle rotte protette. */
export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

/** Profilo dell'utente corrente, o null se non autenticato / non trovato. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, country, full_name, preferred_games, onboarding_completed")
    .eq("id", user.id)
    .single<Profile>();

  return data;
});

/**
 * Origin assoluto della richiesta corrente, per costruire i redirect di auth
 * (conferma email, magic link). Fallback su NEXT_PUBLIC_SITE_URL e poi localhost.
 */
export async function getOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;

  const host = h.get("host");
  if (host) {
    const protocol = host.startsWith("localhost") ? "http" : "https";
    return `${protocol}://${host}`;
  }

  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
