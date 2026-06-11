/**
 * Costanti di dominio TCG, allineate agli enum Postgres in 0001_init.sql.
 * Fonte unica per liste (form/select) ed etichette in italiano (UI).
 */

export const GAMES = ["pokemon", "one_piece", "yugioh", "magic"] as const;
export type Game = (typeof GAMES)[number];

export const GAME_LABELS: Record<Game, string> = {
  pokemon: "Pokémon",
  one_piece: "One Piece",
  yugioh: "Yu-Gi-Oh!",
  magic: "Magic: The Gathering",
};

export const TCG_META: Record<Game, { emoji: string }> = {
  pokemon: { emoji: "🎴" },
  one_piece: { emoji: "⚓" },
  yugioh: { emoji: "⚔️" },
  magic: { emoji: "🧙" },
};

export const CARD_CONDITIONS = [
  "mint",
  "near_mint",
  "excellent",
  "good",
  "light_played",
  "played",
  "poor",
] as const;
export type CardCondition = (typeof CARD_CONDITIONS)[number];

export const CONDITION_LABELS: Record<CardCondition, string> = {
  mint: "Mint",
  near_mint: "Near Mint",
  excellent: "Excellent",
  good: "Good",
  light_played: "Light Played",
  played: "Played",
  poor: "Poor",
};

export const HUNT_STATUSES = ["open", "closed", "matched"] as const;
export type HuntStatus = (typeof HUNT_STATUSES)[number];

export const HUNT_STATUS_LABELS: Record<HuntStatus, string> = {
  open: "Aperta",
  closed: "Chiusa",
  matched: "Conclusa",
};

export const OFFER_STATUSES = [
  "pending",
  "accepted",
  "rejected",
  "withdrawn",
] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  pending: "In attesa",
  accepted: "Accettata",
  rejected: "Rifiutata",
  withdrawn: "Ritirata",
};
