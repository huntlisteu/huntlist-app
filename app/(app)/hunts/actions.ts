"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  closeHuntSchema,
  createHuntSchema,
  updateHuntSchema,
  type HuntCardInput,
  type HuntFormState,
} from "@/lib/validation/hunt";

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
  const cookieStore = await cookies();
  console.log("cookies:", cookieStore.getAll().map((c) => c.name));
  const { data: { session } } = await supabase.auth.getSession();
  console.log("session:", session?.user?.id);
  const { data: { user: supaUser }, error: userError } = await supabase.auth.getUser();
  console.log("getUser result:", supaUser?.id, "error:", userError);
  console.log("user in createHunt:", user?.id);
  const { data: huntId, error } = await supabase.rpc("create_hunt", {
    p_title: title,
    p_description: description ?? null,
    p_game: game,
  });
  if (error) {
    console.error("createHunt error:", error);
    return { error: "Impossibile creare la Hunt. Riprova." };
  }

  const { error: cardsError } = await supabase
    .from("hunt_cards")
    .insert(toCardRows(huntId as string, cards));

  if (cardsError) {
    console.error("createHunt cardsError:", cardsError);
    await supabase.from("hunts").delete().eq("id", huntId);
    return { error: "Impossibile salvare le carte. Riprova." };
  }

  revalidatePath("/feed");
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
  revalidatePath("/feed");
  revalidatePath("/dashboard");
  redirect(`/hunts/${id}`);
}

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
    revalidatePath("/feed");
    revalidatePath("/dashboard");
  }

  redirect(`/hunts/${id}`);
}
