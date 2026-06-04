import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Supabase per il browser (Client Components).
 * Usa solo chiavi pubbliche (URL + publishable/anon key): la sicurezza e'
 * garantita dalla RLS lato database. Mai usare qui la secret key.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Variabili Supabase mancanti: imposta NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local",
    );
  }

  return createBrowserClient(url, key);
}
