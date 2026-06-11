"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  closeHuntSchema,
  createHuntSchema,
  updateHuntSchema,
  type HuntCardInput,
  type HuntFormState,
} from "@/lib/validation/hunt";
import { acceptOfferSchema } from "@/lib/validation/offer";

/** Legge i campi comuni del form (title/description/game/cards-JSON). */
function readHuntForm(formData: FormData) {
  let cards: unknown = [];
  try {
    cards = JSON.parse((formData.get("cards") as string | null) ?? "[]");
  } catch {
    cards = null; // forza un errore di validazione leggibile
  }
  return {
    title: formData.get("title"),
    description: formData.get("description"),
    game: formData.get("game"),
    cards,
  };
}

function toCardRows(huntId: string, cards: HuntCardInput[]) {
  return cards.map((c) => ({
    hunt_id: huntId,
    name: c.name,
    set_name: c.set_name,
    collector_number: c.collector_number,
    language: c.language,
    quantity: c.quantity,
    desired_condition: c.desired_condition,
  }));
}

/** Crea una nuova Hunt con le sue carte. Owner = utente corrente. */
export async function createHunt(
  _prev: HuntFormState,
  formData: FormData,
): Promise<HuntFormState> {
  const user = await requireUser();

  const parsed = createHuntSchema.safeParse(readHuntForm(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { title, description, game, cards } = parsed.data;

  const supabase = await createClient();
  const { data: huntId, error } = await supabase.rpc("create_hunt", {
    p_title: title,
    p_description: description ?? null,
    p_game: game,
  });
  if (error) {
    console.error("createHunt error:", error);
    return { error: "Impossibile creare la Hunt. Riprova." };
  }

  const cardResults = await Promise.all(
    cards.map((card) =>
      supabase.rpc("create_hunt_card", {
        p_hunt_id: huntId as string,
        p_name: card.name,
        p_set_name: card.set_name ?? null,
        p_collector_number: card.collector_number ?? null,
        p_desired_condition: card.desired_condition ?? null,
        p_language: card.language ?? null,
        p_quantity: card.quantity,
      }),
    ),
  );

  const cardsError = cardResults.find((r) => r.error)?.error ?? null;
  if (cardsError) {
    console.error("createHunt cardsError:", cardsError);
    await supabase.from("hunts").delete().eq("id", huntId);
    return { error: "Impossibile salvare le carte. Riprova." };
  }

  revalidatePath("/market");
  revalidatePath("/dashboard");
  redirect(`/hunts/${huntId}`);
}

/** Aggiorna una Hunt (solo proprietario, solo se ancora 'open'). */
export async function updateHunt(
  _prev: HuntFormState,
  formData: FormData,
): Promise<HuntFormState> {
  const user = await requireUser();

  const parsed = updateHuntSchema.safeParse({
    id: formData.get("id"),
    ...readHuntForm(formData),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { id, title, description, game, cards } = parsed.data;

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("hunts")
    .select("buyer_id, status")
    .eq("id", id)
    .maybeSingle<{ buyer_id: string; status: string }>();

  if (!existing) {
    return { error: "Hunt non trovata." };
  }
  if (existing.buyer_id !== user.id) {
    return { error: "Non sei il proprietario di questa Hunt." };
  }
  if (existing.status !== "open") {
    return { error: "Puoi modificare solo le Hunt ancora aperte." };
  }

  const { error: updateError } = await supabase
    .from("hunts")
    .update({ title, description, game })
    .eq("id", id);

  if (updateError) {
    return { error: "Impossibile aggiornare la Hunt. Riprova." };
  }

  // Rimpiazza l'intero set di carte (solo il proprietario, RLS permettendo).
  const { error: deleteError } = await supabase
    .from("hunt_cards")
    .delete()
    .eq("hunt_id", id);

  if (deleteError) {
    return { error: "Impossibile aggiornare le carte. Riprova." };
  }

  const { error: insertError } = await supabase
    .from("hunt_cards")
    .insert(toCardRows(id, cards));

  if (insertError) {
    return { error: "Impossibile salvare le carte. Riprova." };
  }

  revalidatePath(`/hunts/${id}`);
  revalidatePath("/market");
  revalidatePath("/dashboard");
  redirect(`/hunts/${id}`);
}

// ---------------------------------------------------------------------------
// acceptOffer
// ---------------------------------------------------------------------------

/**
 * Accetta un'offerta chiamando la RPC transazionale `accept_offer`.
 * La RPC aggiorna atomicamente: offer → accepted, hunt → matched,
 * altre offerte pending → rejected. Solo il proprietario della Hunt può farlo.
 */
export async function acceptOffer(formData: FormData): Promise<void> {
  const user = await requireUser();

  const parsed = acceptOfferSchema.safeParse({
    offer_id: formData.get("offer_id"),
  });
  if (!parsed.success) redirect("/dashboard");

  const { offer_id } = parsed.data;
  const supabase = await createClient();

  // Autorizzazione: recupera hunt_id e verifica che l'utente sia il buyer.
  const { data: offer } = await supabase
    .from("offers")
    .select("hunt_id, status")
    .eq("id", offer_id)
    .maybeSingle<{ hunt_id: string; status: string }>();

  if (!offer || offer.status !== "pending") redirect("/dashboard");

  const { data: hunt } = await supabase
    .from("hunts")
    .select("buyer_id")
    .eq("id", offer.hunt_id)
    .maybeSingle<{ buyer_id: string }>();

  if (!hunt || hunt.buyer_id !== user.id) redirect("/dashboard");

  const { error } = await supabase.rpc("accept_offer", {
    p_offer_id: offer_id,
  });

  if (error) {
    console.error("acceptOffer rpc error:", error);
  }

  revalidatePath(`/hunts/${offer.hunt_id}`);
  redirect(`/hunts/${offer.hunt_id}`);
}

// ---------------------------------------------------------------------------
// closeHunt
// ---------------------------------------------------------------------------

/** Chiude una Hunt (open -> closed). Solo il proprietario. */
export async function closeHunt(formData: FormData): Promise<void> {
  const user = await requireUser();

  const parsed = closeHuntSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) {
    redirect("/dashboard");
  }
  const { id } = parsed.data;

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("hunts")
    .select("buyer_id, status")
    .eq("id", id)
    .maybeSingle<{ buyer_id: string; status: string }>();

  if (existing && existing.buyer_id === user.id && existing.status === "open") {
    await supabase.from("hunts").update({ status: "closed" }).eq("id", id);
    revalidatePath(`/hunts/${id}`);
    revalidatePath("/market");
    revalidatePath("/dashboard");
  }

  redirect(`/hunts/${id}`);
}
