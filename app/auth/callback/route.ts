import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

/**
 * Callback auth per il template email Supabase che usa:
 * {{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=...&next=...
 *
 * Gestisce sia il flusso PKCE (?code=...) sia il flusso token_hash.
 * Gli errori di recovery vanno a /forgot-password, non a /login.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // next deve essere un percorso relativo interno per evitare open redirect.
  const nextParam = searchParams.get("next");
  const next =
    nextParam && nextParam.startsWith("/") ? nextParam : "/feed";

  // ── Flusso PKCE (code): OAuth e magic link ─────────────────────────────
  if (code) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
      return NextResponse.redirect(`${origin}/login?error=auth`);
    }

    // La response di redirect e' l'oggetto che il browser ricevera': il client
    // SSR va legato direttamente a QUESTA response (cookies.set scrive su di
    // essa), non a next/headers — altrimenti exchangeCodeForSession scrive la
    // sessione su un cookie store che non viene copiato nel Set-Cookie del
    // redirect, e l'utente arriva al feed risultando non autenticato.
    const response = NextResponse.redirect(`${origin}${next}`);
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    }

    return type === "recovery"
      ? NextResponse.redirect(`${origin}/forgot-password?error=link_scaduto`)
      : NextResponse.redirect(`${origin}/login?error=auth`);
  }

  // ── token_hash mancante ────────────────────────────────────────────────
  if (!tokenHash) {
    return type === "recovery"
      ? NextResponse.redirect(`${origin}/forgot-password?error=link_non_valido`)
      : NextResponse.redirect(`${origin}/login?error=auth`);
  }

  // ── Flusso token_hash (recovery, email OTP) — invariato ────────────────
  if (!type) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (!error) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  return type === "recovery"
    ? NextResponse.redirect(`${origin}/forgot-password?error=link_scaduto`)
    : NextResponse.redirect(`${origin}/login?error=auth`);
}
