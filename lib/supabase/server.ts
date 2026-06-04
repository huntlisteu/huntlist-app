import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Client Supabase per il server (Server Components, Server Actions, Route Handler).
 * Legge/scrive i cookie di sessione via next/headers. In Next.js 16 `cookies()`
 * e' asincrona, quindi questa factory e' async.
 *
 * REGOLA DI SICUREZZA #1: per autorizzare usa SEMPRE `supabase.auth.getUser()`
 * (che ricontatta il server di Auth), MAI la sola sessione dal cookie.
 */
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Variabili Supabase mancanti: imposta NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local",
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // `setAll` chiamata da un Server Component: ignorabile se c'e' un
          // proxy (middleware) che rinfresca la sessione. E' il caso qui.
        }
      },
    },
  });
}
