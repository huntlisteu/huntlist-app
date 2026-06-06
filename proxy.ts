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
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .single();

    // Lascia passare se la query fallisce o restituisce null (fail-open).
    if (profile && profile.onboarding_completed === false) {
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
