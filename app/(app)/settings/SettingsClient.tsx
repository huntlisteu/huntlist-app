"use client";

import { useRef, useState } from "react";
import Image from "next/image";

import { createClient } from "@/lib/supabase/client";
import { GAMES, GAME_LABELS, type Game } from "@/lib/tcg";
import {
  sendPasswordResetEmail,
  updateAvatarUrl,
  updatePreferredGames,
  updateProfile,
} from "./actions";

// ── Country list ──────────────────────────────────────────────────────────────

const EUROPEAN_COUNTRIES: { code: string; label: string }[] = [
  { code: "AT", label: "Austria" },
  { code: "BE", label: "Belgio" },
  { code: "HR", label: "Croazia" },
  { code: "CY", label: "Cipro" },
  { code: "CZ", label: "Repubblica Ceca" },
  { code: "DK", label: "Danimarca" },
  { code: "EE", label: "Estonia" },
  { code: "FI", label: "Finlandia" },
  { code: "FR", label: "Francia" },
  { code: "DE", label: "Germania" },
  { code: "GR", label: "Grecia" },
  { code: "HU", label: "Ungheria" },
  { code: "IE", label: "Irlanda" },
  { code: "IT", label: "Italia" },
  { code: "LV", label: "Lettonia" },
  { code: "LT", label: "Lituania" },
  { code: "LU", label: "Lussemburgo" },
  { code: "MT", label: "Malta" },
  { code: "NL", label: "Paesi Bassi" },
  { code: "PL", label: "Polonia" },
  { code: "PT", label: "Portogallo" },
  { code: "RO", label: "Romania" },
  { code: "SK", label: "Slovacchia" },
  { code: "SI", label: "Slovenia" },
  { code: "ES", label: "Spagna" },
  { code: "SE", label: "Svezia" },
  { code: "GB", label: "Regno Unito" },
  { code: "CH", label: "Svizzera" },
  { code: "NO", label: "Norvegia" },
];

// ── TCG metadata ──────────────────────────────────────────────────────────────

const TCG_META: Record<Game, { emoji: string }> = {
  pokemon: { emoji: "🎴" },
  one_piece: { emoji: "⚓" },
  yugioh: { emoji: "⚔️" },
};

// ── Brand helpers ─────────────────────────────────────────────────────────────

const SECTION =
  "border-2 border-[#1A1A18] dark:border-[#3A3D38] rounded-[4px] " +
  "bg-[#F2EDE3] dark:bg-[#1A1C19] p-6 " +
  "shadow-[4px_4px_0px_#1A1A18] dark:shadow-[4px_4px_0px_#3A3D38]";

const LABEL =
  "block mb-1.5 font-sans text-xs font-bold uppercase tracking-wider " +
  "text-[#4A4A44] dark:text-[#B0AFA8]";

const INPUT =
  "w-full border-2 border-[#1A1A18] dark:border-[#3A3D38] rounded-[4px] " +
  "bg-transparent px-3 py-2 font-sans text-[#1A1A18] dark:text-[#F0EFE8] " +
  "placeholder:text-[#8A8A82] dark:placeholder:text-[#5A5A54] " +
  "focus:outline-none focus:ring-2 focus:ring-[#6DBE00] dark:focus:ring-[#9ADE00] focus:ring-offset-0";

const SELECT =
  "w-full border-2 border-[#1A1A18] dark:border-[#3A3D38] rounded-[4px] " +
  "bg-[#F2EDE3] dark:bg-[#1A1C19] px-3 py-2 font-sans text-[#1A1A18] dark:text-[#F0EFE8] " +
  "focus:outline-none focus:ring-2 focus:ring-[#6DBE00] dark:focus:ring-[#9ADE00] focus:ring-offset-0";

const BTN_PRIMARY =
  "inline-flex items-center justify-center border-2 border-[#1A1A18] dark:border-[#3A3D38] " +
  "rounded-[4px] bg-[#6DBE00] dark:bg-[#9ADE00] text-[#1A1A18] " +
  "shadow-[4px_4px_0px_#1A1A18] dark:shadow-[4px_4px_0px_#3A3D38] " +
  "px-5 py-2.5 font-sans font-bold transition-all " +
  "hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_#1A1A18] dark:hover:shadow-[2px_2px_0px_#3A3D38] " +
  "disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 " +
  "disabled:shadow-[4px_4px_0px_#1A1A18] dark:disabled:shadow-[4px_4px_0px_#3A3D38]";

const BTN_GHOST =
  "inline-flex items-center justify-center border-2 border-[#1A1A18] dark:border-[#3A3D38] " +
  "rounded-[4px] bg-transparent text-[#1A1A18] dark:text-[#F0EFE8] " +
  "shadow-[4px_4px_0px_#1A1A18] dark:shadow-[4px_4px_0px_#3A3D38] " +
  "px-5 py-2.5 font-sans font-bold transition-all " +
  "hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_#1A1A18] dark:hover:shadow-[2px_2px_0px_#3A3D38] " +
  "disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 " +
  "disabled:shadow-[4px_4px_0px_#1A1A18] dark:disabled:shadow-[4px_4px_0px_#3A3D38]";

// ── Helpers ───────────────────────────────────────────────────────────────────

function splitFullName(fullName: string): [string, string] {
  const trimmed = fullName.trim();
  if (!trimmed) return ["", ""];
  const idx = trimmed.indexOf(" ");
  if (idx === -1) return [trimmed, ""];
  return [trimmed.slice(0, idx), trimmed.slice(idx + 1)];
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface SettingsClientProps {
  userId: string;
  initialFullName: string;
  initialBio: string;
  initialCountry: string;
  initialGames: Game[];
  initialAvatarUrl: string | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SettingsClient({
  userId,
  initialFullName,
  initialBio,
  initialCountry,
  initialGames,
  initialAvatarUrl,
}: SettingsClientProps) {
  const [initialFirst, initialLast] = splitFullName(initialFullName);

  // ── Avatar ──
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState(false);

  // ── Profile ──
  const [firstName, setFirstName] = useState(initialFirst);
  const [lastName, setLastName] = useState(initialLast);
  const [bio, setBio] = useState(initialBio);
  const [country, setCountry] = useState(initialCountry);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // ── Games ──
  const [selectedGames, setSelectedGames] = useState<Set<Game>>(
    new Set(initialGames),
  );
  const [gamesSaving, setGamesSaving] = useState(false);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const [gamesSuccess, setGamesSuccess] = useState(false);

  // ── Password ──
  const [passwordSending, setPasswordSending] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // ── Avatar handlers ────────────────────────────────────────────────────────

  async function handleAvatarFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setAvatarError("Seleziona un file immagine (JPG, PNG, WebP…)");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("Immagine troppo grande (max 2 MB)");
      return;
    }

    setAvatarError(null);
    setAvatarSuccess(false);
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarUploading(true);

    const ext = file.name.split(".").pop() ?? "png";
    const path = `${userId}/avatar.${ext}`;
    const supabase = createClient();

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setAvatarError(`Upload fallito: ${uploadError.message}`);
      setAvatarPreview(null);
      setAvatarUploading(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const result = await updateAvatarUrl(data.publicUrl);
    setAvatarUploading(false);

    if ("error" in result) {
      setAvatarError(result.error);
    } else {
      setAvatarUrl(data.publicUrl);
      setAvatarSuccess(true);
    }
  }

  // ── Profile handlers ───────────────────────────────────────────────────────

  async function handleSaveProfile() {
    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(false);

    const fullName = [firstName.trim(), lastName.trim()]
      .filter(Boolean)
      .join(" ");
    const fd = new FormData();
    fd.append("full_name", fullName);
    fd.append("bio", bio);
    if (country) fd.append("country", country);

    const result = await updateProfile(fd);
    setProfileSaving(false);

    if ("error" in result) {
      setProfileError(result.error);
    } else {
      setProfileSuccess(true);
    }
  }

  // ── Games handlers ─────────────────────────────────────────────────────────

  function toggleGame(game: Game) {
    setSelectedGames((prev) => {
      const next = new Set(prev);
      if (next.has(game)) next.delete(game);
      else next.add(game);
      return next;
    });
    setGamesSuccess(false);
  }

  async function handleSaveGames() {
    setGamesSaving(true);
    setGamesError(null);
    setGamesSuccess(false);

    const fd = new FormData();
    for (const game of selectedGames) fd.append("preferred_games", game);

    const result = await updatePreferredGames(fd);
    setGamesSaving(false);

    if ("error" in result) {
      setGamesError(result.error);
    } else {
      setGamesSuccess(true);
    }
  }

  // ── Password handler ───────────────────────────────────────────────────────

  async function handlePasswordReset() {
    setPasswordSending(true);
    setPasswordError(null);
    setPasswordSuccess(false);

    const result = await sendPasswordResetEmail();
    setPasswordSending(false);

    if ("error" in result) {
      setPasswordError(result.error);
    } else {
      setPasswordSuccess(true);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const displayAvatar = avatarPreview ?? avatarUrl;

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <h1 className="font-heading text-3xl text-[#1A1A18] dark:text-[#F0EFE8]">
        Impostazioni
      </h1>

      {/* ── Avatar ─────────────────────────────────────────────────────── */}
      <section className={SECTION}>
        <h2 className="mb-4 font-heading text-lg text-[#1A1A18] dark:text-[#F0EFE8]">
          Avatar
        </h2>

        <div className="flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarUploading}
            aria-label="Cambia avatar"
            className="group relative disabled:opacity-60"
          >
            {displayAvatar ? (
              <span className="relative flex h-24 w-24 overflow-hidden rounded-full border-2 border-[#1A1A18] shadow-[8px_8px_0px_#1A1A18]">
                <Image
                  src={displayAvatar}
                  alt="Il tuo avatar"
                  fill
                  className="object-cover transition-opacity group-hover:opacity-75"
                  unoptimized
                />
              </span>
            ) : (
              <span className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-[#1A1A18] shadow-[8px_8px_0px_#1A1A18] bg-[#B84A1C] dark:bg-[#FF6B2C] transition-opacity group-hover:opacity-75">
                <span className="font-sans text-3xl font-bold text-white select-none">
                  ?
                </span>
              </span>
            )}
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
              <svg
                className="h-7 w-7 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                />
              </svg>
            </span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleAvatarFileChange}
          />

          {avatarUploading && (
            <p className="font-sans text-sm text-[#4A4A44] dark:text-[#B0AFA8]">
              Caricamento…
            </p>
          )}
          {avatarError && (
            <p
              className="font-sans text-sm text-[#B84A1C] dark:text-[#FF6B2C]"
              role="alert"
            >
              {avatarError}
            </p>
          )}
          {avatarSuccess && (
            <p className="font-sans text-sm text-[#2D5A3D] dark:text-[#5DCAA5]">
              Avatar aggiornato.
            </p>
          )}

          <p className="font-sans text-xs text-[#8A8A82] dark:text-[#5A5A54]">
            Clicca sull&apos;avatar per cambiarlo · JPG, PNG, WebP · max 2 MB
          </p>
        </div>
      </section>

      {/* ── Informazioni personali ─────────────────────────────────────── */}
      <section className={SECTION}>
        <h2 className="mb-4 font-heading text-lg text-[#1A1A18] dark:text-[#F0EFE8]">
          Informazioni personali
        </h2>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="first-name" className={LABEL}>
                Nome
              </label>
              <input
                id="first-name"
                type="text"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  setProfileSuccess(false);
                }}
                placeholder="Marco"
                maxLength={50}
                className={INPUT}
              />
            </div>
            <div>
              <label htmlFor="last-name" className={LABEL}>
                Cognome
              </label>
              <input
                id="last-name"
                type="text"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  setProfileSuccess(false);
                }}
                placeholder="Rossi"
                maxLength={50}
                className={INPUT}
              />
            </div>
          </div>

          <div>
            <label htmlFor="bio" className={LABEL}>
              Bio
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => {
                setBio(e.target.value.slice(0, 160));
                setProfileSuccess(false);
              }}
              placeholder="Colleziono da quando avevo 8 anni…"
              rows={3}
              className={INPUT + " resize-none"}
            />
            <p
              className={[
                "mt-1 text-right font-sans text-xs",
                bio.length >= 160
                  ? "text-[#B84A1C] dark:text-[#FF6B2C]"
                  : "text-[#8A8A82] dark:text-[#5A5A54]",
              ].join(" ")}
            >
              {bio.length}/160
            </p>
          </div>

          <div>
            <label htmlFor="country" className={LABEL}>
              Paese
            </label>
            <select
              id="country"
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                setProfileSuccess(false);
              }}
              className={SELECT}
            >
              <option value="">— Seleziona —</option>
              {EUROPEAN_COUNTRIES.map(({ code, label }) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={profileSaving}
            className={BTN_PRIMARY}
          >
            {profileSaving ? "Salvataggio…" : "Salva modifiche"}
          </button>
          {profileError && (
            <p
              className="font-sans text-sm text-[#B84A1C] dark:text-[#FF6B2C]"
              role="alert"
            >
              {profileError}
            </p>
          )}
          {profileSuccess && !profileError && (
            <p className="font-sans text-sm text-[#2D5A3D] dark:text-[#5DCAA5]">
              Salvato.
            </p>
          )}
        </div>
      </section>

      {/* ── TCG preferiti ─────────────────────────────────────────────── */}
      <section className={SECTION}>
        <h2 className="mb-4 font-heading text-lg text-[#1A1A18] dark:text-[#F0EFE8]">
          TCG preferiti
        </h2>

        <div className="mb-5 grid grid-cols-3 gap-3">
          {GAMES.map((game) => {
            const selected = selectedGames.has(game);
            return (
              <button
                key={game}
                type="button"
                onClick={() => toggleGame(game)}
                aria-pressed={selected}
                className={[
                  "flex flex-col items-center gap-2 rounded-[4px] border-2 border-[#1A1A18] dark:border-[#3A3D38] p-4 font-sans transition-all",
                  selected
                    ? "bg-[#6DBE00] dark:bg-[#9ADE00] shadow-[2px_2px_0px_#1A1A18] dark:shadow-[2px_2px_0px_#3A3D38] translate-x-0.5 translate-y-0.5"
                    : "bg-[#EAE2D4] dark:bg-[#3A3D38] shadow-[4px_4px_0px_#1A1A18] dark:shadow-[4px_4px_0px_#3A3D38] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_#1A1A18] dark:hover:shadow-[2px_2px_0px_#3A3D38]",
                ].join(" ")}
              >
                <span className="text-2xl leading-none">
                  {TCG_META[game].emoji}
                </span>
                <span className="text-center text-xs font-bold leading-tight text-[#1A1A18]">
                  {GAME_LABELS[game]}
                </span>
                <span
                  className={[
                    "h-4 w-4 rounded-full border-2 border-[#1A1A18] transition-colors",
                    selected ? "bg-[#1A1A18]" : "bg-transparent",
                  ].join(" ")}
                />
              </button>
            );
          })}
        </div>

        {selectedGames.size === 0 && (
          <p className="mb-3 font-sans text-xs text-[#B84A1C] dark:text-[#FF6B2C]">
            Seleziona almeno un gioco.
          </p>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleSaveGames}
            disabled={gamesSaving || selectedGames.size === 0}
            className={BTN_PRIMARY}
          >
            {gamesSaving ? "Salvataggio…" : "Salva"}
          </button>
          {gamesError && (
            <p
              className="font-sans text-sm text-[#B84A1C] dark:text-[#FF6B2C]"
              role="alert"
            >
              {gamesError}
            </p>
          )}
          {gamesSuccess && !gamesError && (
            <p className="font-sans text-sm text-[#2D5A3D] dark:text-[#5DCAA5]">
              Salvato.
            </p>
          )}
        </div>
      </section>

      {/* ── Password ──────────────────────────────────────────────────── */}
      <section className={SECTION}>
        <h2 className="mb-1 font-heading text-lg text-[#1A1A18] dark:text-[#F0EFE8]">
          Password
        </h2>
        <p className="mb-4 font-sans text-sm text-[#4A4A44] dark:text-[#B0AFA8]">
          Riceverai un&apos;email con il link per impostare una nuova password.
        </p>

        {passwordSuccess ? (
          <p className="font-sans text-sm font-medium text-[#2D5A3D] dark:text-[#5DCAA5]">
            Ti abbiamo inviato un&apos;email con il link per cambiare la password.
          </p>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handlePasswordReset}
              disabled={passwordSending}
              className={BTN_GHOST}
            >
              {passwordSending ? "Invio in corso…" : "Cambia password"}
            </button>
            {passwordError && (
              <p
                className="font-sans text-sm text-[#B84A1C] dark:text-[#FF6B2C]"
                role="alert"
              >
                {passwordError}
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
