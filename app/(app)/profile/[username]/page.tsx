import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { GAME_LABELS, type Game } from "@/lib/tcg";
import { ProfileAvatar } from "./ProfileAvatar";

export const dynamic = "force-dynamic";

// ── Country names ─────────────────────────────────────────────────────────────

const COUNTRY_NAMES: Record<string, string> = {
  AT: "Austria", BE: "Belgio", HR: "Croazia", CY: "Cipro",
  CZ: "Repubblica Ceca", DK: "Danimarca", EE: "Estonia",
  FI: "Finlandia", FR: "Francia", DE: "Germania", GR: "Grecia",
  HU: "Ungheria", IE: "Irlanda", IT: "Italia", LV: "Lettonia",
  LT: "Lituania", LU: "Lussemburgo", MT: "Malta", NL: "Paesi Bassi",
  PL: "Polonia", PT: "Portogallo", RO: "Romania", SK: "Slovacchia",
  SI: "Slovenia", ES: "Spagna", SE: "Svezia", GB: "Regno Unito",
  CH: "Svizzera", NO: "Norvegia",
};

// ── Types ─────────────────────────────────────────────────────────────────────

type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  country: string | null;
  preferred_games: string[];
  is_early_user: boolean | null;
  shop_verified: boolean | null;
  shop_name: string | null;
  shop_address: string | null;
  creator_verified: boolean | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  x_url: string | null;
};

type RawProfileHunt = {
  id: string;
  title: string;
  game: string;
  created_at: string;
  hunt_cards: { id: string }[];
};

type ProfileHunt = {
  id: string;
  title: string;
  game: Game;
  created_at: string;
  card_count: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function AvatarFallback({ username }: { username: string }) {
  return (
    <span className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-[#1A1A18] dark:border-[#3A3D38] shadow-[4px_4px_0px_#1A1A18] dark:shadow-[4px_4px_0px_#3A3D38] bg-[#B84A1C] dark:bg-[#FF6B2C] select-none">
      <span className="font-sans text-3xl font-bold text-white">
        {username.charAt(0).toUpperCase()}
      </span>
    </span>
  );
}

function GamePill({ game }: { game: Game }) {
  return (
    <span className="inline-flex items-center rounded-[4px] border-2 border-[#1A1A18] dark:border-[#3A3D38] bg-[#EAE2D4] dark:bg-[#3A3D38] px-2 py-0.5 font-sans text-xs font-bold text-[#1A1A18] dark:text-[#F0EFE8]">
      {GAME_LABELS[game] ?? game}
    </span>
  );
}

function BadgePill({
  label,
  color,
}: {
  label: string;
  color: "chartreuse" | "ember" | "creator";
}) {
  const bg =
    color === "chartreuse"
      ? "bg-[#6DBE00] dark:bg-[#9ADE00] text-[#1A1A18]"
      : color === "ember"
        ? "bg-[#B84A1C] dark:bg-[#FF6B2C] text-white"
        : "bg-[#6B21A8] text-white";
  return (
    <span
      className={`inline-flex items-center rounded-[4px] border-2 border-[#1A1A18] px-2 py-0.5 font-sans text-xs font-bold ${bg}`}
    >
      {label}
    </span>
  );
}

function HuntCard({
  hunt,
  showOfferButton,
}: {
  hunt: ProfileHunt;
  showOfferButton: boolean;
}) {
  const cardLabel =
    hunt.card_count === 1
      ? "1 carta"
      : `${hunt.card_count} carte`;

  return (
    <div className="flex flex-col gap-3 rounded-[4px] border-2 border-[#1A1A18] dark:border-[#3A3D38] bg-[#F2EDE3] dark:bg-[#1A1C19] p-4 shadow-[4px_4px_0px_#1A1A18] dark:shadow-[4px_4px_0px_#3A3D38]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <GamePill game={hunt.game} />
            <span className="font-sans text-xs text-[#8A8A82] dark:text-[#5A5A54]">
              {cardLabel}
            </span>
          </div>
          <h3 className="font-heading text-base text-[#1A1A18] dark:text-[#F0EFE8] leading-snug">
            {hunt.title}
          </h3>
        </div>
        <span className="shrink-0 font-sans text-xs text-[#8A8A82] dark:text-[#5A5A54] whitespace-nowrap">
          {formatDate(hunt.created_at)}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Link
          href={`/hunts/${hunt.id}`}
          className="inline-flex items-center rounded-[4px] border-2 border-[#1A1A18] dark:border-[#3A3D38] bg-transparent px-3 py-1.5 font-sans text-xs font-bold text-[#1A1A18] dark:text-[#F0EFE8] shadow-[2px_2px_0px_#1A1A18] dark:shadow-[2px_2px_0px_#3A3D38] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
        >
          Vedi Hunt
        </Link>
        {showOfferButton && (
          <Link
            href={`/hunts/${hunt.id}/offer`}
            className="inline-flex items-center rounded-[4px] border-2 border-[#1A1A18] dark:border-[#3A3D38] bg-[#6DBE00] dark:bg-[#9ADE00] px-3 py-1.5 font-sans text-xs font-bold text-[#1A1A18] shadow-[2px_2px_0px_#1A1A18] dark:shadow-[2px_2px_0px_#3A3D38] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
          >
            Fai un&apos;offerta
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username} · Huntlist` };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  const [user, profileResult] = await Promise.all([
    getUser(),
    supabase
      .from("profiles")
      .select(
        "id, username, display_name, avatar_url, bio, country, preferred_games, " +
        "is_early_user, shop_verified, shop_name, shop_address, " +
        "creator_verified, instagram_url, tiktok_url, x_url",
      )
      .eq("username", username)
      .maybeSingle(),
  ]);

  if (!profileResult.data) notFound();

  const profile = profileResult.data as unknown as ProfileRow;
  const isOwnProfile = user?.id === profile.id;
  const isLoggedIn = !!user;

  const { data: huntsRaw } = await supabase
    .from("hunts")
    .select("id, title, game, created_at, hunt_cards!hunt_id(id)")
    .eq("buyer_id", profile.id)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .returns<RawProfileHunt[]>();

  const hunts: ProfileHunt[] = (huntsRaw ?? []).map((h) => ({
    id: h.id,
    title: h.title,
    game: h.game as Game,
    created_at: h.created_at,
    card_count: Array.isArray(h.hunt_cards) ? h.hunt_cards.length : 0,
  }));

  const showOfferButton = isLoggedIn && !isOwnProfile;

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-start sm:text-left">
        {/* Avatar */}
        <div className="shrink-0">
          {profile.avatar_url ? (
            <ProfileAvatar src={profile.avatar_url} username={profile.username} />
          ) : (
            <AvatarFallback username={profile.username} />
          )}
        </div>

        {/* Info */}
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center">
            <h1 className="font-heading text-3xl text-[#1A1A18] dark:text-[#F0EFE8]">
              @{profile.username}
            </h1>
            {isOwnProfile && (
              <Link
                href="/settings"
                className="inline-flex items-center rounded-[4px] border-2 border-[#1A1A18] dark:border-[#3A3D38] px-3 py-1 font-sans text-xs font-bold text-[#1A1A18] dark:text-[#F0EFE8] shadow-[2px_2px_0px_#1A1A18] dark:shadow-[2px_2px_0px_#3A3D38] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all"
              >
                Modifica profilo
              </Link>
            )}
          </div>

          {/* Badges */}
          {(profile.is_early_user || profile.shop_verified || profile.creator_verified) && (
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              {profile.is_early_user && (
                <BadgePill label="Early User" color="chartreuse" />
              )}
              {profile.shop_verified && (
                <BadgePill label="Negozio Verificato" color="ember" />
              )}
              {profile.creator_verified && (
                <BadgePill label="Creator" color="creator" />
              )}
            </div>
          )}

          {profile.bio && (
            <p className="font-sans text-sm text-[#4A4A44] dark:text-[#B0AFA8]">
              {profile.bio}
            </p>
          )}

          {profile.country && COUNTRY_NAMES[profile.country] && (
            <p className="font-sans text-xs text-[#8A8A82] dark:text-[#5A5A54]">
              📍 {COUNTRY_NAMES[profile.country]}
            </p>
          )}

          {/* Shop info — solo se verificato */}
          {profile.shop_verified && profile.shop_name && (
            <div className="font-sans text-xs text-[#4A4A44] dark:text-[#B0AFA8] space-y-0.5">
              <p className="font-bold text-[#1A1A18] dark:text-[#F0EFE8]">
                🏪 {profile.shop_name}
              </p>
              {profile.shop_address && (
                <p>{profile.shop_address}</p>
              )}
            </div>
          )}

          {/* Social links — solo se creator verificato */}
          {profile.creator_verified && (
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              {profile.instagram_url && (
                <a
                  href={profile.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-sans text-xs font-bold text-[#B84A1C] dark:text-[#FF6B2C] underline underline-offset-2"
                >
                  Instagram
                </a>
              )}
              {profile.tiktok_url && (
                <a
                  href={profile.tiktok_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-sans text-xs font-bold text-[#B84A1C] dark:text-[#FF6B2C] underline underline-offset-2"
                >
                  TikTok
                </a>
              )}
              {profile.x_url && (
                <a
                  href={profile.x_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-sans text-xs font-bold text-[#B84A1C] dark:text-[#FF6B2C] underline underline-offset-2"
                >
                  X / Twitter
                </a>
              )}
            </div>
          )}

          {profile.preferred_games.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              {profile.preferred_games.map((game) => (
                <GamePill key={game} game={game as Game} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Hunt aperte ──────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 font-heading text-xl text-[#1A1A18] dark:text-[#F0EFE8]">
          Hunt aperte{" "}
          <span className="font-sans text-base font-normal text-[#8A8A82] dark:text-[#5A5A54]">
            ({hunts.length})
          </span>
        </h2>

        {hunts.length === 0 ? (
          <p className="font-sans text-sm text-[#8A8A82] dark:text-[#5A5A54]">
            Nessuna Hunt aperta al momento.
          </p>
        ) : (
          <ul className="space-y-3">
            {hunts.map((hunt) => (
              <li key={hunt.id}>
                <HuntCard hunt={hunt} showOfferButton={showOfferButton} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
