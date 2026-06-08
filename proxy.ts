import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy di Next.js 16: rinfresca la sessione Supabase e reindirizza a
 * /onboarding gli utenti autenticati che non hanno ancora completato il profilo.
 */

// Percorsi esclusi dal redirect di onboarding.
const ONBOARDING_SKIP = [
  "/onboarding",
  "/login",
  "/signup",
  "/callback",
  "/auth",           // copre /auth/callback e qualsiasi altro path /auth/*
  "/forgot-password",
  "/update-password",
  "/api",
];

function shouldSkipOnboarding(pathname: string): boolean {
  return ONBOARDING_SKIP.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && !shouldSkipOnboarding(request.nextUrl.pathname)) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .single();

    if (profileError) {
      // PGRST116 = nessuna riga: l'utente e' stato cancellato da Supabase ma
      // il JWT residuo nel cookie e' ancora valido (getUser() lo accetta).
      // Va sloggato esplicitamente, altrimenti resta intrappolato su /onboarding.
      if (profileError.code === "PGRST116") {
        await supabase.auth.signOut();

        const signOutRedirect = NextResponse.redirect(
          new URL("/login", request.url),
        );
        for (const cookie of response.cookies.getAll()) {
          signOutRedirect.cookies.set(cookie);
        }
        return signOutRedirect;
      }

      // Altri errori: fail-open, lascia passare.
    } else if (profile && profile.onboarding_completed === false) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
