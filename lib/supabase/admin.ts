import { createClient } from "@supabase/supabase-js";

/**
 * Client Supabase con service-role key. SOLO server, MAI importato da
 * Client Components o da file caricati nel browser.
 *
 * Usa autoRefreshToken: false e persistSession: false perché opera come
 * service account, non come utente con sessione.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error(
      "Variabili admin Supabase mancanti: imposta NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY in .env.local",
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
