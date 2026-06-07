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
  role: string | null;
  shop_name: string | null;
  shop_address: string | null;
  shop_verified: boolean | null;
  shop_pending: boolean | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  x_url: string | null;
  creator_verified: boolean | null;
  creator_pending: boolean | null;
};

export default async function SettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select(
      "full_name, bio, country, preferred_games, avatar_url, role, " +
      "shop_name, shop_address, shop_verified, shop_pending, " +
      "instagram_url, tiktok_url, x_url, creator_verified, creator_pending",
    )
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
      role={(profile?.role ?? "user") as "user" | "shop" | "creator"}
      initialShopName={profile?.shop_name ?? ""}
      initialShopAddress={profile?.shop_address ?? ""}
      shopVerified={profile?.shop_verified ?? false}
      shopPending={profile?.shop_pending ?? false}
      initialInstagramUrl={profile?.instagram_url ?? ""}
      initialTiktokUrl={profile?.tiktok_url ?? ""}
      initialXUrl={profile?.x_url ?? ""}
      creatorVerified={profile?.creator_verified ?? false}
      creatorPending={profile?.creator_pending ?? false}
    />
  );
}
