"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { completeOnboarding } from "@/app/(app)/onboarding/actions";
import { createClient } from "@/lib/supabase/client";
import { GAMES, GAME_LABELS, type Game } from "@/lib/tcg";

// ── Validation ───────────────────────────────────────────────────────────────

const USERNAME_RE = /^[a-zA-Z0-9_]+$/;

function validateUsername(v: string): string | null {
  if (v.length === 0) return null;
  if (v.length < 3) return "Minimo 3 caratteri";
  if (v.length > 20) return "Massimo 20 caratteri";
  if (!USERNAME_RE.test(v)) return "Solo lettere, numeri e underscore";
  return null;
}

// ── Brand constants ───────────────────────────────────────────────────────────

const CARD =
  "w-full max-w-md border-2 border-[#1A1A18] dark:border-[#3A3D38] " +
  "shadow-[4px_4px_0px_#1A1A18] dark:shadow-[4px_4px_0px_#3A3D38] " +
  "rounded-[4px] bg-[#F2EDE3] dark:bg-[#1A1C19] p-8";

const INPUT_BASE =
  "w-full border-2 border-[#1A1A18] dark:border-[#3A3D38] rounded-[4px] " +
  "bg-transparent px-3 py-2 font-sans text-[#1A1A18] dark:text-[#F0EFE8] " +
  "placeholder:text-[#8A8A82] dark:placeholder:text-[#5A5A54] " +
  "focus:outline-none focus:ring-2 focus:ring-[#6DBE00] dark:focus:ring-[#9ADE00] focus:ring-offset-0";

const BTN_PRIMARY =
  "inline-flex items-center justify-center border-2 border-[#1A1A18] dark:border-[#3A3D38] " +
  "rounded-[4px] bg-[#6DBE00] dark:bg-[#9ADE00] text-[#1A1A18] " +
  "shadow-[4px_4px_0px_#1A1A18] dark:shadow-[4px_4px_0px_#3A3D38] " +
  "px-6 py-3 font-sans font-bold transition-all " +
  "hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_#1A1A18] dark:hover:shadow-[2px_2px_0px_#3A3D38] " +
  "disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 " +
  "disabled:shadow-[4px_4px_0px_#1A1A18] dark:disabled:shadow-[4px_4px_0px_#3A3D38]";

const BTN_GHOST =
  "inline-flex items-center justify-center border-2 border-[#1A1A18] dark:border-[#3A3D38] " +
  "rounded-[4px] bg-transparent text-[#1A1A18] dark:text-[#F0EFE8] " +
  "shadow-[4px_4px_0px_#1A1A18] dark:shadow-[4px_4px_0px_#3A3D38] " +
  "px-6 py-3 font-sans font-bold transition-all " +
  "hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_#1A1A18] dark:hover:shadow-[2px_2px_0px_#3A3D38] " +
  "disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 " +
  "disabled:shadow-[4px_4px_0px_#1A1A18] dark:disabled:shadow-[4px_4px_0px_#3A3D38]";

// ── TCG metadata ─────────────────────────────────────────────────────────────

const TCG_META: Record<Game, { emoji: string }> = {
  pokemon: { emoji: "🎴" },
  one_piece: { emoji: "⚓" },
  yugioh: { emoji: "⚔️" },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="mb-6 flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={[
            "h-2 flex-1 rounded-[2px] border border-[#1A1A18] dark:border-[#3A3D38] transition-colors",
            i < current
              ? "bg-[#6DBE00] dark:bg-[#9ADE00]"
              : "bg-[#EAE2D4] dark:bg-[#3A3D38]",
          ].join(" ")}
        />
      ))}
      <span className="ml-1 whitespace-nowrap font-sans text-xs text-[#4A4A44] dark:text-[#B0AFA8]">
        {current} di {total}
      </span>
    </div>
  );
}

function GameCard({
  game,
  selected,
  onToggle,
}: {
  game: Game;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={[
        "flex flex-col items-center gap-2 rounded-[4px] border-2 border-[#1A1A18]",
        "p-4 font-sans transition-all",
        selected
          ? "bg-[#6DBE00] dark:bg-[#9ADE00] shadow-[4px_4px_0px_#1A1A18] dark:shadow-[4px_4px_0px_#3A3D38]"
          : "bg-[#F2EDE3] dark:bg-[#1A1C19] dark:border-[#3A3D38] shadow-[4px_4px_0px_#1A1A18] dark:shadow-[4px_4px_0px_#3A3D38] " +
            "hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_#1A1A18] dark:hover:shadow-[2px_2px_0px_#3A3D38]",
      ].join(" ")}
    >
      <span className="text-2xl leading-none">{TCG_META[game].emoji}</span>
      <span className={["text-center text-xs font-bold leading-tight", selected ? "text-[#1A1A18]" : "text-[#1A1A18] dark:text-[#F0EFE8]"].join(" ")}>
        {GAME_LABELS[game]}
      </span>
      <span
        className={[
          "h-4 w-4 rounded-full transition-colors",
          selected ? "bg-[#1A1A18]" : "border-2 border-[#1A1A18] dark:border-[#3A3D38] bg-transparent",
        ].join(" ")}
      />
    </button>
  );
}

// ── Main wizard ───────────────────────────────────────────────────────────────

export function OnboardingWizard({ userId }: { userId: string }) {
  const router = useRouter();

  // Step 1
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameServerError, setUsernameServerError] = useState<string | null>(null);
  const [selectedGames, setSelectedGames] = useState<Set<Game>>(new Set());

  // Step 2
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Step 3
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Submit
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isStep1Valid =
    username.length >= 3 &&
    username.length <= 20 &&
    !usernameError &&
    !usernameServerError &&
    selectedGames.size > 0;

  function handleUsernameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setUsername(v);
    setUsernameError(validateUsername(v));
    setUsernameServerError(null); // clear server error on any edit
  }

  function toggleGame(game: Game) {
    setSelectedGames((prev) => {
      const next = new Set(prev);
      if (next.has(game)) next.delete(game);
      else next.add(game);
      return next;
    });
  }

  function processFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setAvatarError("Seleziona un file immagine (JPG, PNG, WebP…)");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("Immagine troppo grande (max 2 MB)");
      return;
    }
    setAvatarError(null);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleComplete(skipAvatar: boolean) {
    setSubmitError(null);
    setIsSubmitting(true);

    let avatarUrl: string | undefined;

    if (!skipAvatar && avatarFile) {
      const ext = avatarFile.name.split(".").pop() ?? "png";
      const path = `${userId}/avatar.${ext}`;
      const supabase = createClient();

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, { upsert: true });

      if (uploadError) {
        setAvatarError(
          `Errore durante l'upload: ${uploadError.message}. Puoi riprovare o saltare.`,
        );
        setIsSubmitting(false);
        return;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      avatarUrl = data.publicUrl;
    }

    const fullName = [firstName.trim(), lastName.trim()]
      .filter(Boolean)
      .join(" ");

    const fd = new FormData();
    fd.append("username", username);
    for (const game of selectedGames) fd.append("preferred_games", game);
    if (fullName) fd.append("full_name", fullName);
    if (avatarUrl) fd.append("avatar_url", avatarUrl);

    const result = await completeOnboarding(fd);
    setIsSubmitting(false);

    if ("error" in result) {
      // Username conflict: surface it back on Step 1.
      if (result.error.toLowerCase().includes("username")) {
        setUsernameServerError(result.error);
        setStep(1);
        return;
      }
      setSubmitError(result.error);
      return;
    }

    router.push("/feed");
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className={CARD}>
      <StepIndicator current={step} total={3} />

      {/* ── STEP 1: Username + TCG ── */}
      {step === 1 && (
        <div>
          <h1 className="mb-1 font-heading text-2xl text-[#1A1A18] dark:text-[#F0EFE8]">
            Crea il tuo profilo
          </h1>
          <p className="mb-6 font-sans text-sm text-[#4A4A44] dark:text-[#B0AFA8]">
            Scegli un username e i giochi che collezionate.
          </p>

          {/* Username */}
          <div className="mb-5">
            <label className="mb-1.5 block font-sans text-xs font-bold uppercase tracking-wider text-[#4A4A44] dark:text-[#B0AFA8]">
              Username
            </label>
            <div className="flex">
              <span
                className={[
                  "inline-flex items-center border-2 border-r-0 border-[#1A1A18] dark:border-[#3A3D38]",
                  "rounded-l-[4px] px-3 py-2 font-sans text-sm",
                  "bg-[#EAE2D4] dark:bg-[#3A3D38] text-[#4A4A44] dark:text-[#B0AFA8] select-none",
                ].join(" ")}
              >
                @
              </span>
              <input
                type="text"
                value={username}
                onChange={handleUsernameChange}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="ash_ketchum"
                maxLength={20}
                className={[
                  INPUT_BASE,
                  "rounded-l-none",
                  usernameError || usernameServerError
                    ? "border-[#B84A1C] dark:border-[#FF6B2C]"
                    : "",
                ].join(" ")}
              />
            </div>
            {usernameError || usernameServerError ? (
              <p
                className="mt-1 font-sans text-xs text-[#B84A1C] dark:text-[#FF6B2C]"
                role="alert"
              >
                {usernameError ?? usernameServerError}
              </p>
            ) : (
              <p className="mt-1 font-sans text-xs text-[#4A4A44] dark:text-[#B0AFA8]">
                3-20 caratteri: lettere, numeri e underscore.
              </p>
            )}
          </div>

          {/* TCG multi-select */}
          <div className="mb-6">
            <label className="mb-1.5 block font-sans text-xs font-bold uppercase tracking-wider text-[#4A4A44] dark:text-[#B0AFA8]">
              Giochi preferiti{" "}
              <span className="text-[#B84A1C] dark:text-[#FF6B2C]">
                (almeno 1)
              </span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {GAMES.map((game) => (
                <GameCard
                  key={game}
                  game={game}
                  selected={selectedGames.has(game)}
                  onToggle={() => toggleGame(game)}
                />
              ))}
            </div>
          </div>

          <button
            className={BTN_PRIMARY + " w-full"}
            disabled={!isStep1Valid}
            onClick={() => setStep(2)}
          >
            Continua →
          </button>
        </div>
      )}

      {/* ── STEP 2: Nome e Cognome ── */}
      {step === 2 && (
        <div>
          <h1 className="mb-1 font-heading text-2xl text-[#1A1A18] dark:text-[#F0EFE8]">
            Come ti chiami?
          </h1>
          <p className="mb-1 font-sans text-sm text-[#4A4A44] dark:text-[#B0AFA8]">
            Facoltativo — visibile solo nel tuo profilo, non pubblicamente.
          </p>
          <p className="mb-6 font-sans text-xs text-[#8A8A82] dark:text-[#5A5A54]">
            Puoi saltare questo passaggio.
          </p>

          <div className="mb-4 space-y-3">
            <div>
              <label
                htmlFor="first-name"
                className="mb-1.5 block font-sans text-xs font-bold uppercase tracking-wider text-[#4A4A44] dark:text-[#B0AFA8]"
              >
                Nome
              </label>
              <input
                id="first-name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Marco"
                maxLength={50}
                className={INPUT_BASE}
              />
            </div>
            <div>
              <label
                htmlFor="last-name"
                className="mb-1.5 block font-sans text-xs font-bold uppercase tracking-wider text-[#4A4A44] dark:text-[#B0AFA8]"
              >
                Cognome
              </label>
              <input
                id="last-name"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Rossi"
                maxLength={50}
                className={INPUT_BASE}
              />
            </div>
          </div>

          <button
            className={BTN_PRIMARY + " w-full"}
            onClick={() => setStep(3)}
          >
            Continua →
          </button>
        </div>
      )}

      {/* ── STEP 3: Avatar ── */}
      {step === 3 && (
        <div>
          <h1 className="mb-1 font-heading text-2xl text-[#1A1A18] dark:text-[#F0EFE8]">
            Aggiungi una foto
          </h1>
          <p className="mb-6 font-sans text-sm text-[#4A4A44] dark:text-[#B0AFA8]">
            Opzionale — aiuta gli altri a riconoscerti. Max 2 MB.
          </p>

          {/* Drop zone */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) =>
              e.key === "Enter" && fileInputRef.current?.click()
            }
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            className={[
              "mb-4 flex flex-col items-center justify-center gap-3 rounded-[4px] border-2 border-dashed",
              "cursor-pointer p-8 transition-colors",
              isDragging
                ? "border-[#6DBE00] dark:border-[#9ADE00] bg-[#EEF7CC] dark:bg-[#1A3A10]"
                : "border-[#1A1A18] dark:border-[#3A3D38] hover:border-[#6DBE00] dark:hover:border-[#9ADE00]",
            ].join(" ")}
          >
            {avatarPreview ? (
              <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-[#1A1A18] dark:border-[#3A3D38]">
                <Image
                  src={avatarPreview}
                  alt="Anteprima avatar"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-[#8A8A82] dark:border-[#5A5A54]">
                <svg
                  className="h-7 w-7 text-[#8A8A82] dark:text-[#5A5A54]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z"
                  />
                </svg>
              </div>
            )}
            <span className="font-sans text-sm text-[#4A4A44] dark:text-[#B0AFA8]">
              {avatarPreview
                ? "Clicca o trascina per cambiare"
                : "Clicca o trascina un'immagine qui"}
            </span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) processFile(file);
            }}
          />

          {avatarError && (
            <p
              className="mb-3 font-sans text-xs text-[#B84A1C] dark:text-[#FF6B2C]"
              role="alert"
            >
              {avatarError}
            </p>
          )}

          {submitError && (
            <p
              className="mb-3 font-sans text-sm font-medium text-[#B84A1C] dark:text-[#FF6B2C]"
              role="alert"
            >
              {submitError}
            </p>
          )}

          <div className="flex gap-3">
            <button
              className={BTN_GHOST + " flex-1"}
              disabled={isSubmitting}
              onClick={() => handleComplete(true)}
            >
              Salta
            </button>
            <button
              className={BTN_PRIMARY + " flex-1"}
              disabled={isSubmitting}
              onClick={() => handleComplete(false)}
            >
              {isSubmitting ? "Caricamento…" : "Completa →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
