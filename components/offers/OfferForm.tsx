"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import { createOffer } from "@/app/(app)/offers/actions";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { HuntCardRow } from "@/lib/hunts";
import { CARD_CONDITIONS, CONDITION_LABELS, type CardCondition } from "@/lib/tcg";
import type { OfferFormState } from "@/lib/validation/offer";
import { cn } from "@/lib/utils";

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

type ItemDraft = {
  hunt_card_id: string;
  card_name: string;
  condition: CardCondition | "";
  note: string;
};

const initialState: OfferFormState = {};

interface OfferFormProps {
  huntId: string;
  cards: HuntCardRow[];
}

export function OfferForm({ huntId, cards }: OfferFormProps) {
  const [state, formAction] = useActionState(createOffer, initialState);

  const [items, setItems] = useState<ItemDraft[]>(
    cards.map((c) => ({
      hunt_card_id: c.id,
      card_name: c.name,
      condition: "",
      note: "",
    })),
  );

  function updateItem<K extends keyof ItemDraft>(
    index: number,
    key: K,
    value: ItemDraft[K],
  ) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    );
  }

  // Serializzato come JSON nel campo nascosto; la SA lo deserializza.
  const itemsPayload = items.map((item) => ({
    hunt_card_id: item.hunt_card_id,
    card_name: item.card_name,
    condition: item.condition === "" ? null : item.condition,
    note: item.note.trim() || null,
  }));

  return (
    <form action={formAction} className="space-y-10">
      <input type="hidden" name="hunt_id" value={huntId} />
      <input type="hidden" name="items" value={JSON.stringify(itemsPayload)} />

      {/* ── Prezzo ── */}
      <section className="space-y-4">
        <div>
          <h2 className="font-heading text-lg font-semibold">Prezzo offerta</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Un prezzo unico per l&apos;intero bundle. Inserisci l&apos;importo
            in euro (es.{" "}
            <span className="font-mono text-foreground">12.50</span>).
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="price">
              Prezzo carte (€){" "}
              <span className="text-destructive" aria-hidden="true">
                *
              </span>
            </Label>
            <Input
              id="price"
              name="price"
              type="text"
              inputMode="decimal"
              placeholder="Es. 25.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shipping">Spedizione (€)</Label>
            <Input
              id="shipping"
              name="shipping"
              type="text"
              inputMode="decimal"
              placeholder="Es. 5.50 — lascia vuoto se inclusa"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">
            Messaggio per l&apos;acquirente (opzionale)
          </Label>
          <Textarea
            id="message"
            name="message"
            placeholder="Presentati, specifica tempi di spedizione, metodi di pagamento…"
            maxLength={1000}
            rows={3}
          />
        </div>
      </section>

      {/* ── Conferma carta per carta ── */}
      <section className="space-y-4">
        <div>
          <h2 className="font-heading text-lg font-semibold">
            Conferma carte
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Per ogni carta indica la condizione esatta che puoi fornire.
            Questo snapshot diventa immutabile una volta inviata l&apos;offerta.
          </p>
        </div>

        <div className="space-y-3">
          {items.map((item, index) => {
            const card = cards[index];
            const details = [
              card.set_name,
              card.collector_number ? `#${card.collector_number}` : null,
              card.language,
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <div
                key={item.hunt_card_id}
                className="rounded-lg border border-border bg-card p-4"
              >
                {/* Info carta (read-only) */}
                <div className="mb-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{card.name}</p>
                    <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">
                      ×{card.quantity}
                    </span>
                  </div>
                  {details && (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {details}
                    </p>
                  )}
                  {card.desired_condition && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Condizione richiesta:{" "}
                      <span className="font-medium text-foreground">
                        {CONDITION_LABELS[card.desired_condition]}
                      </span>
                    </p>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor={`cond-${index}`}>
                      Condizione fornita{" "}
                      <span className="text-destructive" aria-hidden="true">
                        *
                      </span>
                    </Label>
                    <select
                      id={`cond-${index}`}
                      value={item.condition}
                      onChange={(e) =>
                        updateItem(
                          index,
                          "condition",
                          e.target.value as CardCondition | "",
                        )
                      }
                      className={cn(selectClass)}
                    >
                      <option value="" disabled>
                        Seleziona condizione
                      </option>
                      {CARD_CONDITIONS.map((c) => (
                        <option key={c} value={c}>
                          {CONDITION_LABELS[c]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor={`note-${index}`}>
                      Nota (opzionale)
                    </Label>
                    <Input
                      id={`note-${index}`}
                      type="text"
                      value={item.note}
                      onChange={(e) =>
                        updateItem(index, "note", e.target.value)
                      }
                      placeholder="Es. Prima edizione, lingua specifica…"
                      maxLength={500}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {state.error && (
        <p className="text-sm font-medium text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <SubmitButton pendingLabel="Invio in corso…">
          Invia offerta
        </SubmitButton>
        <Button asChild variant="ghost">
          <Link href={`/hunts/${huntId}`}>Annulla</Link>
        </Button>
      </div>
    </form>
  );
}
