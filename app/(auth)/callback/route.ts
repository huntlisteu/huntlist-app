import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

/**
 * Callback auth — path: /callback
 *
 * Gestisce sia il flusso PKCE (?code=...) sia il flusso token_hash.
 * Questo e' il callback effettivamente configurato nel dashboard Supabase
 * come redirect URL autorizzato, quindi gestisce anche Google OAuth.
 *
 * Flusso PKCE: la destinazione e' sempre determinata lato server in base allo
 * stato del profilo — il parametro ?next= e' ignorato per evitare redirect su
 * pagine con cache RSC stale (es. ?next=/market dal bottone OAuth). Unica
 * eccezione: type=recovery manda sempre a /update-password.
 *
 * Flusso token_hash: ?next= e' rispettato (link costruiti lato server con
 * destinazioni affidabili, es. ?next=/dashboard).
 */
export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // ── Flusso PKCE (code): Google OAuth e link email PKCE ─────────────────
  if (code) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
      return NextResponse.redirect(`${origin}/login?error=auth`);
    }

    // Cookie raccolti durante exchangeCodeForSession e getUser, poi applicati
    // alla response di redirect finale: la destinazione dipende dalla query
    // sul profilo, quindi costruiamo la response solo dopo aver letto tutto.
    const sessionCookies: Array<{
      name: string;
      value: string;
      options?: CookieOptions;
    }> = [];

    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          sessionCookies.push(...cookiesToSet);
        },
      },
    });

    function redirectTo(path: string): NextResponse {
      const response = NextResponse.redirect(`${origin}${path}`);
      for (const { name, value, options } of sessionCookies) {
        response.cookies.set(name, value, options);
      }
      return response;
    }

    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      return type === "recovery"
        ? redirectTo("/forgot-password?error=link_scaduto")
        : redirectTo("/login?error=auth");
    }

    // REGOLA DI SICUREZZA #1: getUser() ricontatta il server di Auth — non ci
    // si fida mai della sola sessione nel cookie.
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return redirectTo("/login?error=auth");
    }

    // Recovery (reset password): sessione recovery attiva, manda alla pagina
    // di aggiornamento password indipendentemente dallo stato del profilo.
    if (type === "recovery") {
      return redirectTo("/update-password");
    }

    // Destinazione basata sullo stato del profilo.
    // ?next= e' ignorato nel flusso code: valori come ?next=/market causerebbero
    // redirect su pagine con cache RSC stale, rendendo l'utente apparentemente
    // non autenticato.
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .single();

    if (!profile || profile.onboarding_completed === false) {
      return redirectTo("/onboarding");
    }

    return redirectTo("/dashboard");
  }

  // ── token_hash mancante ────────────────────────────────────────────────
  if (!tokenHash) {
    return type === "recovery"
      ? NextResponse.redirect(`${origin}/forgot-password?error=link_non_valido`)
      : NextResponse.redirect(`${origin}/login?error=auth`);
  }

  // ── Flusso token_hash (magic link, email OTP, recovery) ────────────────
  if (!type) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  // ?next= rispettato solo qui: link costruiti lato server con destinazioni
  // esplicite e affidabili (es. ?next=/dashboard, ?next=/update-password).
  const nextParam = searchParams.get("next");
  const safeNext = nextParam && nextParam.startsWith("/") ? nextParam : null;

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (!error) {
    return NextResponse.redirect(`${origin}${safeNext ?? "/dashboard"}`);
  }

  return type === "recovery"
    ? NextResponse.redirect(`${origin}/forgot-password?error=link_scaduto`)
    : NextResponse.redirect(`${origin}/login?error=auth`);
}
