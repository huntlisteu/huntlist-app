"use client";

import { useActionState, useState } from "react";
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
