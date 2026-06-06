import type { Metadata } from "next";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Game } from "@/lib/tcg";
import { SettingsClient } from "./SettingsClient";

export const metadata: Metadata = {
  title: "Impostazioni · Huntlist",
};

type ProfileRow = {
  full_name: string | null;
  bio: string | null;
  country: string | null;
  preferred_games: string[];
  avatar_url: string | null;
};

export default async function SettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("full_name, bio, country, preferred_games, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const profile = data as ProfileRow | null;

  return (
    <SettingsClient
      userId={user.id}
      initialFullName={profile?.full_name ?? ""}
      initialBio={profile?.bio ?? ""}
      initialCountry={profile?.country ?? ""}
      initialGames={(profile?.preferred_games ?? []) as Game[]}
      initialAvatarUrl={profile?.avatar_url ?? null}
    />
  );
}
