"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { completeOnboarding } from "@/app/(app)/onboarding/actions";
import { createClient } from "@/lib/supabase/client";
import { GAMES, GAME_LABELS, type Game } from "@/lib/tcg";

// ── Types ─────────────────────────────────────────────────────────────────────

type Role = "user" | "shop" | "creator";
type Step = 1 | 2 | 3 | 4;

// ── Validation ────────────────────────────────────────────────────────────────

const USERNAME_RE = /^[a-zA-Z0-9_]+$/;

function validateUsername(v: string): string | null {
  if (v.length === 0) return null;
  if (v.length < 3) return "Minimo 3 caratteri";
  if (v.length > 20) return "Massimo 20 caratteri";
  if (!USERNAME_RE.test(v)) return "Solo lettere, numeri e underscore";
  return null;
}

function isValidUrl(v: string): boolean {
  if (!v.trim()) return true; // empty = valid (optional)
  try {
    const u = new URL(v.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
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

// ── TCG metadata ──────────────────────────────────────────────────────────────

const TCG_META: Record<Game, { emoji: string }> = {
  pokemon: { emoji: "🎴" },
  one_piece: { emoji: "⚓" },
  yugioh: { emoji: "⚔️" },
  magic: { emoji: "🧙" },
};

const ROLE_META: Record<Role, { emoji: string; label: string; description: string }> = {
  user: {
    emoji: "🃏",
    label: "Utente",
    description: "Compro e vendo carte tra collezionisti",
  },
  shop: {
    emoji: "🏪",
    label: "Negozio Fisico",
    description: "Ho un negozio fisico e voglio vendere su Huntlist",
  },
  creator: {
    emoji: "🎥",
    label: "Creator",
    description: "Sono un creator TCG e voglio un profilo verificato",
  },
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

function RoleCard({
  role,
  selected,
  onSelect,
}: {
  role: Role;
  selected: boolean;
  onSelect: () => void;
}) {
  const meta = ROLE_META[role];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={[
        "flex flex-col items-start gap-2 rounded-[4px] border-2 border-[#1A1A18] w-full p-4 font-sans text-left transition-all",
        selected
          ? "bg-[#6DBE00] dark:bg-[#9ADE00] shadow-[4px_4px_0px_#1A1A18] dark:shadow-[4px_4px_0px_#3A3D38]"
          : "bg-[#F2EDE3] dark:bg-[#1A1C19] dark:border-[#3A3D38] shadow-[4px_4px_0px_#1A1A18] dark:shadow-[4px_4px_0px_#3A3D38] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_#1A1A18] dark:hover:shadow-[2px_2px_0px_#3A3D38]",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl leading-none">{meta.emoji}</span>
        <span className={["font-bold text-sm", selected ? "text-[#1A1A18]" : "text-[#1A1A18] dark:text-[#F0EFE8]"].join(" ")}>
          {meta.label}
        </span>
        <span
          className={[
            "ml-auto h-4 w-4 rounded-full border-2 transition-colors",
            selected
              ? "border-[#1A1A18] bg-[#1A1A18]"
              : "border-[#1A1A18] dark:border-[#3A3D38] bg-transparent",
          ].join(" ")}
        />
      </div>
      <p className={["text-xs leading-snug", selected ? "text-[#1A1A18]/80" : "text-[#4A4A44] dark:text-[#B0AFA8]"].join(" ")}>
        {meta.description}
      </p>
    </button>
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

  // Navigation
  const [step, setStep] = useState<Step>(1);

  // Step 1 — Role
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // Step 2 — Username + TCG
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameServerError, setUsernameServerError] = useState<string | null>(null);
  const [selectedGames, setSelectedGames] = useState<Set<Game>>(new Set());

  // Step 3 — Shop data
  const [shopName, setShopName] = useState("");
  const [shopAddress, setShopAddress] = useState("");

  // Step 3 — Creator data
  const [instagramUrl, setInstagramUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [xUrl, setXUrl] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);

  // Step 4 — Avatar
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Submit
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Computed ────────────────────────────────────────────────────────────────

  const totalSteps = selectedRole === "user" ? 3 : 4;

  // Map raw step to visual step number.
  const displayStep =
    step === 4 ? (selectedRole === "user" ? 3 : 4) : step;

  const isStep2Valid =
    username.length >= 3 &&
    username.length <= 20 &&
    !usernameError &&
    !usernameServerError &&
    selectedGames.size > 0;

  const isStep3Valid =
    selectedRole === "shop"
      ? shopName.trim().length > 0 && shopAddress.trim().length > 0
      : selectedRole === "creator"
        ? !!(instagramUrl.trim() || tiktokUrl.trim() || xUrl.trim())
        : true;

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleUsernameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setUsername(v);
    setUsernameError(validateUsername(v));
    setUsernameServerError(null);
  }

  function toggleGame(game: Game) {
    setSelectedGames((prev) => {
      const next = new Set(prev);
      if (next.has(game)) next.delete(game);
      else next.add(game);
      return next;
    });
  }

  function handleStep2Continue() {
    if (!selectedRole) return;
    // For user: skip step 3 (go straight to step 4)
    setStep(selectedRole === "user" ? 4 : 3);
  }

  function validateUrlFields(): boolean {
    const urls = [instagramUrl, tiktokUrl, xUrl].filter(Boolean);
    for (const u of urls) {
      if (!isValidUrl(u)) {
        setUrlError("Inserisci un URL valido (es. https://...)");
        return false;
      }
    }
    setUrlError(null);
    return true;
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

    const fd = new FormData();
    fd.append("username", username);
    for (const game of selectedGames) fd.append("preferred_games", game);
    fd.append("role", selectedRole ?? "user");
    if (avatarUrl) fd.append("avatar_url", avatarUrl);
    if (selectedRole === "shop") {
      fd.append("shop_name", shopName.trim());
      fd.append("shop_address", shopAddress.trim());
    }
    if (selectedRole === "creator") {
      if (instagramUrl.trim()) fd.append("instagram_url", instagramUrl.trim());
      if (tiktokUrl.trim()) fd.append("tiktok_url", tiktokUrl.trim());
      if (xUrl.trim()) fd.append("x_url", xUrl.trim());
    }

    const result = await completeOnboarding(fd);
    setIsSubmitting(false);

    if ("error" in result) {
      if (result.error.toLowerCase().includes("username")) {
        setUsernameServerError(result.error);
        setStep(2);
        return;
      }
      setSubmitError(result.error);
      return;
    }

    router.push("/market");
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className={CARD}>
      <StepIndicator current={displayStep} total={totalSteps} />

      {/* ── STEP 1: Ruolo ── */}
      {step === 1 && (
        <div>
          <h1 className="mb-1 font-heading text-2xl text-[#1A1A18] dark:text-[#F0EFE8]">
            Come userai Huntlist?
          </h1>
          <p className="mb-6 font-sans text-sm text-[#4A4A44] dark:text-[#B0AFA8]">
            Scegli il tuo ruolo per personalizzare l&apos;esperienza.
          </p>

          <div className="mb-6 flex flex-col gap-3">
            {(["user", "shop", "creator"] as Role[]).map((role) => (
              <RoleCard
                key={role}
                role={role}
                selected={selectedRole === role}
                onSelect={() => setSelectedRole(role)}
              />
            ))}
          </div>

          <button
            className={BTN_PRIMARY + " w-full"}
            disabled={!selectedRole}
            onClick={() => setStep(2)}
          >
            Continua →
          </button>
        </div>
      )}

      {/* ── STEP 2: Username + TCG ── */}
      {step === 2 && (
        <div>
          <h1 className="mb-1 font-heading text-2xl text-[#1A1A18] dark:text-[#F0EFE8]">
            Crea il tuo profilo
          </h1>
          <p className="mb-6 font-sans text-sm text-[#4A4A44] dark:text-[#B0AFA8]">
            Scegli un username e i giochi che collezioni.
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
              <span className="text-[#B84A1C] dark:text-[#FF6B2C]">(almeno 1)</span>
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
            disabled={!isStep2Valid}
            onClick={handleStep2Continue}
          >
            Continua →
          </button>
        </div>
      )}

      {/* ── STEP 3: Dati aggiuntivi (shop / creator) ── */}
      {step === 3 && selectedRole === "shop" && (
        <div>
          <h1 className="mb-1 font-heading text-2xl text-[#1A1A18] dark:text-[#F0EFE8]">
            Il tuo negozio
          </h1>
          <p className="mb-6 font-sans text-sm text-[#4A4A44] dark:text-[#B0AFA8]">
            Inserisci i dati del tuo negozio fisico.
          </p>

          <div className="mb-4 space-y-3">
            <div>
              <label
                htmlFor="shop-name"
                className="mb-1.5 block font-sans text-xs font-bold uppercase tracking-wider text-[#4A4A44] dark:text-[#B0AFA8]"
              >
                Nome negozio <span className="text-[#B84A1C] dark:text-[#FF6B2C]">*</span>
              </label>
              <input
                id="shop-name"
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="Card Shop Milano"
                maxLength={100}
                className={INPUT_BASE}
              />
            </div>
            <div>
              <label
                htmlFor="shop-address"
                className="mb-1.5 block font-sans text-xs font-bold uppercase tracking-wider text-[#4A4A44] dark:text-[#B0AFA8]"
              >
                Indirizzo <span className="text-[#B84A1C] dark:text-[#FF6B2C]">*</span>
              </label>
              <input
                id="shop-address"
                type="text"
                value={shopAddress}
                onChange={(e) => setShopAddress(e.target.value)}
                placeholder="Via Roma 1, Milano"
                maxLength={200}
                className={INPUT_BASE}
              />
            </div>
          </div>

          <p className="mb-5 font-sans text-xs text-[#8A8A82] dark:text-[#5A5A54]">
            La tua richiesta verrà valutata il prima possibile.
          </p>

          <button
            className={BTN_PRIMARY + " w-full"}
            disabled={!isStep3Valid}
            onClick={() => setStep(4)}
          >
            Continua →
          </button>
        </div>
      )}

      {step === 3 && selectedRole === "creator" && (
        <div>
          <h1 className="mb-1 font-heading text-2xl text-[#1A1A18] dark:text-[#F0EFE8]">
            I tuoi canali
          </h1>
          <p className="mb-6 font-sans text-sm text-[#4A4A44] dark:text-[#B0AFA8]">
            Inserisci almeno un link ai tuoi social.
          </p>

          <div className="mb-4 space-y-3">
            <div>
              <label
                htmlFor="instagram-url"
                className="mb-1.5 block font-sans text-xs font-bold uppercase tracking-wider text-[#4A4A44] dark:text-[#B0AFA8]"
              >
                Instagram
              </label>
              <input
                id="instagram-url"
                type="url"
                value={instagramUrl}
                onChange={(e) => { setInstagramUrl(e.target.value); setUrlError(null); }}
                placeholder="https://instagram.com/..."
                className={INPUT_BASE}
              />
            </div>
            <div>
              <label
                htmlFor="tiktok-url"
                className="mb-1.5 block font-sans text-xs font-bold uppercase tracking-wider text-[#4A4A44] dark:text-[#B0AFA8]"
              >
                TikTok
              </label>
              <input
                id="tiktok-url"
                type="url"
                value={tiktokUrl}
                onChange={(e) => { setTiktokUrl(e.target.value); setUrlError(null); }}
                placeholder="https://tiktok.com/@..."
                className={INPUT_BASE}
              />
            </div>
            <div>
              <label
                htmlFor="x-url"
                className="mb-1.5 block font-sans text-xs font-bold uppercase tracking-wider text-[#4A4A44] dark:text-[#B0AFA8]"
              >
                X / Twitter
              </label>
              <input
                id="x-url"
                type="url"
                value={xUrl}
                onChange={(e) => { setXUrl(e.target.value); setUrlError(null); }}
                placeholder="https://x.com/..."
                className={INPUT_BASE}
              />
            </div>
          </div>

          {urlError && (
            <p className="mb-3 font-sans text-xs text-[#B84A1C] dark:text-[#FF6B2C]" role="alert">
              {urlError}
            </p>
          )}

          <p className="mb-5 font-sans text-xs text-[#8A8A82] dark:text-[#5A5A54]">
            La tua richiesta verrà valutata il prima possibile.
          </p>

          <button
            className={BTN_PRIMARY + " w-full"}
            disabled={!isStep3Valid}
            onClick={() => {
              if (validateUrlFields()) setStep(4);
            }}
          >
            Continua →
          </button>
        </div>
      )}

      {/* ── STEP 4: Avatar ── */}
      {step === 4 && (
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
            onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
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
            <p className="mb-3 font-sans text-xs text-[#B84A1C] dark:text-[#FF6B2C]" role="alert">
              {avatarError}
            </p>
          )}

          {submitError && (
            <p className="mb-3 font-sans text-sm font-medium text-[#B84A1C] dark:text-[#FF6B2C]" role="alert">
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
