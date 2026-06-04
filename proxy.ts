import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy di Next.js 16 (ex "middleware"): rinfresca la sessione Supabase a ogni
 * richiesta, riscrivendo i cookie sia sulla request (per i Server Components a
 * valle) sia sulla response (per il browser).
 *
 * NB: chiama `supabase.auth.getUser()` per forzare il refresh del token; non ci
 * si fida della sola sessione nel cookie. Nello scaffold della Fase 1 non
 * protegge ancora alcuna rotta: la logica di redirect arriva in Fase 2.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Senza variabili Supabase non c'e' nulla da rinfrescare: lascia passare.
  if (!url || !key) {
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Forza il refresh della sessione lato server di Auth.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * Tutte le rotte tranne asset statici e file con estensione immagine:
     * - _next/static, _next/image
     * - favicon.ico e immagini comuni
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
