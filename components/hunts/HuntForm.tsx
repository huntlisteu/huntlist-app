"use client";

import { useActionState, useRef, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";

import { createHunt, updateHunt } from "@/app/(app)/hunts/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CARD_CONDITIONS,
  CONDITION_LABELS,
  GAME_LABELS,
  GAMES,
  type CardCondition,
  type Game,
} from "@/lib/tcg";
import type { HuntFormState } from "@/lib/validation/hunt";

const MAX_CARDS = 20;

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

const CSV_PARSE_ERROR = "File non valido. Controlla il formato CSV.";
const CSV_LIMIT_WARNING =
  "Importate le prime 20 carte. Il limite massimo è 20.";

const CARDMARKET_LANGUAGES = [
  { code: "EN", label: "Inglese" },
  { code: "IT", label: "Italiano" },
  { code: "FR", label: "Francese" },
  { code: "DE", label: "Tedesco" },
  { code: "ES", label: "Spagnolo" },
  { code: "PT", label: "Portoghese" },
  { code: "JA", label: "Giapponese" },
  { code: "KO", label: "Coreano" },
  { code: "RU", label: "Russo" },
  { code: "ZH", label: "Cinese" },
] as const;

type ParsedCsvCard = {
  name: string;
  quantity: number;
  set_name: string;
  collector_number: string;
};

/** Estrae nome/quantita'/set/numero da un CSV `name,quantity,set,number`; ignora header, righe vuote, righe senza nome e colonne extra non riconosciute. */
function parseCsvCards(text: string): ParsedCsvCard[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) return [];

  const firstCell = lines[0]?.split(",")[0]?.trim().toLowerCase();
  const dataLines = firstCell === "name" ? lines.slice(1) : lines;

  const parsed: ParsedCsvCard[] = [];
  for (const line of dataLines) {
    const cells = line.split(",");
    const name = cells[0]?.trim() ?? "";
    if (name.length === 0) continue;

    const rawQuantity = cells[1]?.trim();
    const n = rawQuantity ? Number.parseInt(rawQuantity, 10) : NaN;
    const quantity = Number.isFinite(n) && n > 0 ? Math.min(99, n) : 1;

    const set_name = cells[2]?.trim() ?? "";
    const collector_number = cells[3]?.trim() ?? "";

    parsed.push({ name, quantity, set_name, collector_number });
  }

  return parsed;
}

function downloadCsvTemplate() {
  const csvContent =
    "name,quantity,set,number\nCharizard,1,Base Set,4/102\nPikachu,2,Base Set,58/102\n";
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "huntlist-template.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

type CardDraft = {
  name: string;
  set_name: string;
  collector_number: string;
  language: string;
  quantity: number;
  desired_condition: CardCondition | "";
};

function emptyCard(): CardDraft {
  return {
    name: "",
    set_name: "",
    collector_number: "",
    language: "",
    quantity: 1,
    desired_condition: "",
  };
}

const initialState: HuntFormState = {};

type HuntFormProps = {
  mode: "create" | "edit";
  huntId?: string;
  defaultHunt?: { title: string; description: string; game: Game | "" };
  defaultCards?: CardDraft[];
};

export function HuntForm({
  mode,
  huntId,
  defaultHunt,
  defaultCards,
}: HuntFormProps) {
  const action = mode === "create" ? createHunt : updateHunt;
  const [state, formAction] = useActionState(action, initialState);

  const [cards, setCards] = useState<CardDraft[]>(
    defaultCards && defaultCards.length > 0 ? defaultCards : [emptyCard()],
  );

  const csvInputRef = useRef<HTMLInputElement>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvWarning, setCsvWarning] = useState<string | null>(null);
  const [showBulkBanner, setShowBulkBanner] = useState(false);
  const [bulkLanguage, setBulkLanguage] = useState("");
  const [bulkCondition, setBulkCondition] = useState<CardCondition | "any" | "">(
    "",
  );

  async function handleCsvFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;

    setCsvError(null);
    setCsvWarning(null);

    try {
      const text = await file.text();
      const parsed = parseCsvCards(text);

      if (parsed.length === 0) {
        setCsvError(CSV_PARSE_ERROR);
        return;
      }

      const filledExisting = cards.filter((c) => c.name.trim().length > 0);
      const availableSlots = Math.max(0, MAX_CARDS - filledExisting.length);
      const toImport = parsed.slice(0, availableSlots);

      if (parsed.length > toImport.length) {
        setCsvWarning(CSV_LIMIT_WARNING);
      }

      if (toImport.length === 0) return;

      const importedCards: CardDraft[] = toImport.map((p) => ({
        name: p.name,
        set_name: p.set_name,
        collector_number: p.collector_number,
        language: "",
        quantity: p.quantity,
        desired_condition: "",
      }));

      setCards([...filledExisting, ...importedCards]);
      setShowBulkBanner(true);
    } catch {
      setCsvError(CSV_PARSE_ERROR);
    }
  }

  function applyToAllCards() {
    if (bulkLanguage === "" && bulkCondition === "") return;

    setCards((prev) =>
      prev.map((c) => ({
        ...c,
        language: bulkLanguage !== "" ? bulkLanguage : c.language,
        desired_condition:
          bulkCondition === ""
            ? c.desired_condition
            : bulkCondition === "any"
              ? ""
              : bulkCondition,
      })),
    );
  }

  function updateCard<K extends keyof CardDraft>(
    index: number,
    key: K,
    value: CardDraft[K],
  ) {
    setCards((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [key]: value } : c)),
    );
  }

  function addCard() {
    setCards((prev) =>
      prev.length < MAX_CARDS ? [...prev, emptyCard()] : prev,
    );
  }

  function removeCard(index: number) {
    setCards((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== index) : prev,
    );
  }

  // Snapshot serializzato delle carte per la Server Action (campo hidden).
  const cardsPayload = cards.map((c) => ({
    name: c.name,
    set_name: c.set_name,
    collector_number: c.collector_number,
    language: c.language,
    quantity: c.quantity,
    desired_condition: c.desired_condition === "" ? null : c.desired_condition,
  }));

  const cancelHref =
    mode === "edit" && huntId ? `/hunts/${huntId}` : "/dashboard";

  return (
    <form action={formAction} className="space-y-8">
      {mode === "edit" && huntId ? (
        <input type="hidden" name="id" value={huntId} />
      ) : null}
      <input type="hidden" name="cards" value={JSON.stringify(cardsPayload)} />

      {/* Import CSV */}
      <div className="space-y-3 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => csvInputRef.current?.click()}
          >
            Carica da CSV
          </Button>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleCsvFileChange}
          />
          <button
            type="button"
            onClick={downloadCsvTemplate}
            className="text-sm font-medium text-accent underline-offset-4 hover:underline"
          >
            Scarica template
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          Formato:{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
            nome,quantità
          </code>{" "}
          — una carta per riga. La quantità è opzionale (default: 1).
        </p>
        {csvError ? (
          <p className="text-sm font-medium text-destructive" role="alert">
            {csvError}
          </p>
        ) : null}
        {csvWarning ? (
          <p className="text-sm font-medium text-accent" role="status">
            {csvWarning}
          </p>
        ) : null}
      </div>

      {/* Dati Hunt */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Titolo</Label>
          <Input
            id="title"
            name="title"
            type="text"
            defaultValue={defaultHunt?.title ?? ""}
            placeholder="Es. Cerco Charizard base set EU"
            minLength={3}
            maxLength={120}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="game">Gioco</Label>
          <select
            id="game"
            name="game"
            defaultValue={defaultHunt?.game ?? ""}
            required
            className={selectClass}
          >
            <option value="" disabled>
              Scegli un gioco
            </option>
            {GAMES.map((g) => (
              <option key={g} value={g}>
                {GAME_LABELS[g]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descrizione (opzionale)</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={defaultHunt?.description ?? ""}
            placeholder="Aggiungi dettagli: lingua, edizione, condizioni minime, budget indicativo…"
            maxLength={2000}
            rows={4}
          />
        </div>
      </div>

      {/* Carte */}
      <div className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-heading text-lg font-semibold">Carte cercate</h2>
            <p className="text-sm text-muted-foreground">
              Da 1 a {MAX_CARDS} carte. Un&apos;offerta dovra' coprirle tutte.
            </p>
          </div>
          <span className="text-sm text-muted-foreground">
            {cards.length}/{MAX_CARDS}
          </span>
        </div>

        {showBulkBanner ? (
          <div className="space-y-3 rounded-lg border-2 border-[#1A1A18] bg-card p-4 dark:border-[#3A3D38]">
            <p className="font-heading text-sm font-semibold">
              Imposta tutte le carte
            </p>
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="bulk-language">Lingua</Label>
                <select
                  id="bulk-language"
                  value={bulkLanguage}
                  onChange={(e) => setBulkLanguage(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Non modificare</option>
                  {CARDMARKET_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.label}>
                      {l.label} ({l.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bulk-condition">Condizione</Label>
                <select
                  id="bulk-condition"
                  value={bulkCondition}
                  onChange={(e) =>
                    setBulkCondition(e.target.value as CardCondition | "any" | "")
                  }
                  className={selectClass}
                >
                  <option value="">Non modificare</option>
                  <option value="any">Qualsiasi</option>
                  {CARD_CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {CONDITION_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={applyToAllCards}
                disabled={bulkLanguage === "" && bulkCondition === ""}
              >
                Applica a tutte
              </Button>
            </div>
          </div>
        ) : null}

        <div className="space-y-4">
          {cards.map((card, index) => (
            <div
              key={index}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Carta {index + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCard(index)}
                  disabled={cards.length <= 1}
                  aria-label={`Rimuovi carta ${index + 1}`}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor={`card-name-${index}`}>Nome carta</Label>
                  <Input
                    id={`card-name-${index}`}
                    type="text"
                    value={card.name}
                    onChange={(e) => updateCard(index, "name", e.target.value)}
                    placeholder="Es. Charizard"
                    maxLength={200}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`card-set-${index}`}>Set (opzionale)</Label>
                  <Input
                    id={`card-set-${index}`}
                    type="text"
                    value={card.set_name}
                    onChange={(e) =>
                      updateCard(index, "set_name", e.target.value)
                    }
                    placeholder="Es. Base Set"
                    maxLength={120}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`card-number-${index}`}>
                    Numero (opzionale)
                  </Label>
                  <Input
                    id={`card-number-${index}`}
                    type="text"
                    value={card.collector_number}
                    onChange={(e) =>
                      updateCard(index, "collector_number", e.target.value)
                    }
                    placeholder="Es. 4/102"
                    maxLength={40}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`card-language-${index}`}>
                    Lingua (opzionale)
                  </Label>
                  <Input
                    id={`card-language-${index}`}
                    type="text"
                    value={card.language}
                    onChange={(e) =>
                      updateCard(index, "language", e.target.value)
                    }
                    placeholder="Es. Italiano"
                    maxLength={40}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`card-quantity-${index}`}>Quantita'</Label>
                  <Input
                    id={`card-quantity-${index}`}
                    type="number"
                    value={card.quantity}
                    onChange={(e) => {
                      const n = Number.parseInt(e.target.value, 10);
                      updateCard(
                        index,
                        "quantity",
                        Number.isNaN(n) ? 1 : Math.min(99, Math.max(1, n)),
                      );
                    }}
                    min={1}
                    max={99}
                    required
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor={`card-condition-${index}`}>
                    Condizione desiderata (opzionale)
                  </Label>
                  <select
                    id={`card-condition-${index}`}
                    value={card.desired_condition}
                    onChange={(e) =>
                      updateCard(
                        index,
                        "desired_condition",
                        e.target.value as CardCondition | "",
                      )
                    }
                    className={cn(selectClass)}
                  >
                    <option value="">Qualsiasi</option>
                    {CARD_CONDITIONS.map((c) => (
                      <option key={c} value={c}>
                        {CONDITION_LABELS[c]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={addCard}
          disabled={cards.length >= MAX_CARDS}
        >
          + Aggiungi carta
        </Button>
      </div>

      {state.error && (
        <p className="text-sm font-medium text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <SubmitButton pendingLabel="Salvataggio…">
          {mode === "create" ? "Pubblica Hunt" : "Salva modifiche"}
        </SubmitButton>
        <Button asChild variant="ghost">
          <Link href={cancelHref}>Annulla</Link>
        </Button>
      </div>
    </form>
  );
}
