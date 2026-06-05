"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { sendNewOfferEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  createOfferSchema,
  sendMessageSchema,
  withdrawOfferSchema,
  type OfferFormState,
  type SendMessageState,
} from "@/lib/validation/offer";

// ---------------------------------------------------------------------------
// Helpers di parsing FormData → valori tipizzati per Zod
// ---------------------------------------------------------------------------

function eurosToCents(v: FormDataEntryValue | null): number {
  const s = String(v ?? "").trim().replace(",", ".");
  const n = parseFloat(s);
  if (isNaN(n) || n < 0) return -1;
  return Math.round(n * 100);
}

function shippingToCents(v: FormDataEntryValue | null): number {
  const s = String(v ?? "").trim();
  if (!s) return 0;
  return eurosToCents(v);
}

function parseItems(v: FormDataEntryValue | null): unknown {
  try {
    return JSON.parse(String(v ?? "[]"));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// createOffer
// ---------------------------------------------------------------------------

/**
 * Crea un'offerta + snapshot offer_items. Il venditore non può essere il
 * proprietario della Hunt, e la Hunt deve essere 'open'.
 * Compensazione: se l'insert degli items fallisce, l'offerta viene ritirata.
 */
export async function createOffer(
  _prev: OfferFormState,
  formData: FormData,
): Promise<OfferFormState> {
  const user = await requireUser();

  const parsed = createOfferSchema.safeParse({
    hunt_id: formData.get("hunt_id"),
    price_cents: eurosToCents(formData.get("price")),
    shipping_cents: shippingToCents(formData.get("shipping")),
    message: formData.get("message"),
    items: parseItems(formData.get("items")),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { hunt_id, price_cents, shipping_cents, message, items } = parsed.data;

  const supabase = await createClient();

  // Autorizzazione: hunt deve esistere, essere open, e l'utente non deve
  // essere il proprietario. La RLS fa lo stesso controllo ma preferiamo un
  // messaggio di errore leggibile invece di un generico "row not found".
  const { data: hunt } = await supabase
    .from("hunts")
    .select("buyer_id, status, title")
    .eq("id", hunt_id)
    .maybeSingle<{ buyer_id: string; status: string; title: string }>();

  if (!hunt) {
    return { error: "Hunt non trovata." };
  }
  if (hunt.buyer_id === user.id) {
    return { error: "Non puoi fare un'offerta su una tua Hunt." };
  }
  if (hunt.status !== "open") {
    return { error: "Questa Hunt non è più aperta." };
  }

  // Insert offerta.
  const { data: offer, error: offerError } = await supabase
    .from("offers")
    .insert({ hunt_id, seller_id: user.id, price_cents, shipping_cents, message })
    .select("id")
    .single<{ id: string }>();

  if (offerError || !offer) {
    console.error("createOffer error:", offerError);
    // 23505 = unique_violation: un'offerta attiva per questo venditore esiste già.
    if (offerError?.code === "23505") {
      return { error: "Hai già un'offerta attiva su questa Hunt." };
    }
    return { error: "Impossibile creare l'offerta. Riprova." };
  }

  // Insert snapshot carta per carta.
  const itemRows = items.map((item) => ({
    offer_id: offer.id,
    hunt_card_id: item.hunt_card_id,
    card_name: item.card_name,
    condition: item.condition,
    note: item.note,
  }));

  const { error: itemsError } = await supabase
    .from("offer_items")
    .insert(itemRows);

  if (itemsError) {
    console.error("createOffer items error:", itemsError);
    // Compensazione: ritira l'offerta orfana (nessun delete grant sulle offers).
    await supabase
      .from("offers")
      .update({ status: "withdrawn" })
      .eq("id", offer.id);
    return { error: "Impossibile salvare le carte. Riprova." };
  }

  // ── Email di notifica all'acquirente ─────────────────────────────────────
  // Fire-and-forget: attende il completamento ma non blocca il flusso in caso
  // di errore (es. Resend non configurato, email non trovata).
  try {
    const adminClient = createAdminClient();
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const offerUrl = `${siteUrl}/offers/${offer.id}`;

    const [buyerAuthResult, sellerProfileResult, buyerProfileResult] =
      await Promise.all([
        adminClient.auth.admin.getUserById(hunt.buyer_id),
        supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .single<{ display_name: string }>(),
        supabase
          .from("profiles")
          .select("display_name")
          .eq("id", hunt.buyer_id)
          .single<{ display_name: string }>(),
      ]);

    const buyerEmail = buyerAuthResult.data.user?.email;
    if (buyerEmail) {
      await sendNewOfferEmail(
        buyerEmail,
        buyerProfileResult.data?.display_name ?? "Collezionista",
        hunt.title,
        sellerProfileResult.data?.display_name ?? "Un venditore",
        offerUrl,
      );
    }
  } catch (emailErr) {
    // L'email è non-critica: logghiamo l'errore senza bloccare il redirect.
    console.error("sendNewOfferEmail error:", emailErr);
  }

  revalidatePath(`/hunts/${hunt_id}`);
  redirect(`/hunts/${hunt_id}`);
}

// ---------------------------------------------------------------------------
// withdrawOffer
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// sendMessage
// ---------------------------------------------------------------------------

/**
 * Inserisce un messaggio nel thread dell'offerta. L'utente deve essere
 * un partecipante (seller o buyer) e l'offerta deve essere aperta
 * (pending / accepted). Non chiama revalidatePath: i messaggi arrivano
 * al client via Supabase Realtime.
 */
export async function sendMessage(
  formData: FormData,
): Promise<SendMessageState> {
  const user = await requireUser();

  const parsed = sendMessageSchema.safeParse({
    offer_id: formData.get("offer_id"),
    body: String(formData.get("body") ?? "").trim(),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { offer_id, body } = parsed.data;
  const supabase = await createClient();

  // Autorizzazione: partecipante e offerta aperta.
  const { data: offer } = await supabase
    .from("offers")
    .select("seller_id, status, hunts!hunt_id(buyer_id)")
    .eq("id", offer_id)
    .maybeSingle<{
      seller_id: string;
      status: string;
      hunts: { buyer_id: string } | null;
    }>();

  if (!offer) return { error: "Offerta non trovata." };

  const buyerId = offer.hunts?.buyer_id;
  const isParticipant =
    user.id === offer.seller_id || user.id === buyerId;
  if (!isParticipant) return { error: "Non sei autorizzato." };

  if (!["pending", "accepted"].includes(offer.status)) {
    return { error: "Non puoi inviare messaggi in questa conversazione." };
  }

  const { error: msgError } = await supabase
    .from("messages")
    .insert({ offer_id, sender_id: user.id, body });

  if (msgError) {
    console.error("sendMessage error:", msgError);
    return { error: "Impossibile inviare il messaggio. Riprova." };
  }

  return {};
}

// ---------------------------------------------------------------------------
// withdrawOffer
// ---------------------------------------------------------------------------

/** Ritira un'offerta propria. Solo il venditore, solo se status = 'pending'. */
export async function withdrawOffer(formData: FormData): Promise<void> {
  const user = await requireUser();

  const parsed = withdrawOfferSchema.safeParse({
    offer_id: formData.get("offer_id"),
  });
  if (!parsed.success) redirect("/dashboard");

  const { offer_id } = parsed.data;
  const supabase = await createClient();

  // Autorizzazione server-side (oltre alla RLS).
  const { data: offer } = await supabase
    .from("offers")
    .select("seller_id, hunt_id, status")
    .eq("id", offer_id)
    .maybeSingle<{ seller_id: string; hunt_id: string; status: string }>();

  if (!offer || offer.seller_id !== user.id || offer.status !== "pending") {
    redirect("/dashboard");
  }

  await supabase
    .from("offers")
    .update({ status: "withdrawn" })
    .eq("id", offer_id);

  revalidatePath(`/hunts/${offer.hunt_id}`);
  redirect(`/hunts/${offer.hunt_id}`);
}
