import Link from "next/link";

import { signOut } from "@/app/(app)/actions";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/brand/ThemeToggle";
import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/auth";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Layout adattivo: alcune pagine sotto (app) sono pubbliche (feed, dettaglio
  // Hunt aperta). NON si redirige qui; le pagine private chiamano requireUser().
  const user = await getUser();

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="border-b border-border">
        <div className="container flex h-16 max-w-5xl items-center justify-between gap-4">
          <Link href={user ? "/dashboard" : "/"} className="flex items-center">
            <Logo width={140} height={36} />
          </Link>

          <nav className="flex items-center gap-2 sm:gap-3">
            {/* Feed: nascosto su mobile (<md), visibile da md in su */}
            <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
              <Link href="/feed">Feed</Link>
            </Button>
            {user ? (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
                <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
                  <Link href="/hunts/new">Nuova Hunt</Link>
                </Button>
                <span className="hidden text-sm text-muted-foreground md:inline">
                  {user.email}
                </span>
                <ThemeToggle />
                <form action={signOut}>
                  <Button variant="ghost" size="sm" type="submit">
                    Esci
                  </Button>
                </form>
              </>
            ) : (
              <>
                <ThemeToggle />
                {/* Accedi: nascosto su mobile, visibile da md */}
                <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
                  <Link href="/login">Accedi</Link>
                </Button>
                {/* Registrati: sempre visibile */}
                <Button asChild variant="ember" size="sm">
                  <Link href="/signup">Registrati</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="container max-w-5xl flex-1 py-10">{children}</main>
    </div>
  );
}
