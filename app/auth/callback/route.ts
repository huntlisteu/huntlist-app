import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

/**
 * Callback auth per il template email Supabase che usa:
 * {{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=...&next=...
 *
 * Gestisce sia il flusso PKCE (?code=...) sia il flusso token_hash.
 * Gli errori di recovery vanno a /forgot-password, non a /login.
 */
export async function GET(request: Request): Promise<Response> {
  const { searchParams, origin } = new URL(request.url);

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // next deve essere un percorso relativo interno per evitare open redirect.
  const nextParam = searchParams.get("next");
  const next =
    nextParam && nextParam.startsWith("/") ? nextParam : "/feed";

  const supabase = await createClient();

  // ── Flusso PKCE (code) ─────────────────────────────────────────────────
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
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

  // ── Flusso token_hash ──────────────────────────────────────────────────
  if (!type) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

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
