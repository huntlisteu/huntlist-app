import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { UpdatePasswordForm } from "@/components/auth/UpdatePasswordForm";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/brand/ThemeToggle";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Nuova password · Huntlist",
};

/**
 * Pagina di reset password — fuori dal gruppo (auth) perché il layout (auth)
 * redirige gli utenti autenticati. Qui l'utente arriva CON una sessione di
 * recovery (stabilita dal callback dopo lo scambio del codice nell'email).
 * Se non c'è sessione → redirect a /forgot-password.
 */
export default async function UpdatePasswordPage() {
  const user = await getUser();
  if (!user) {
    redirect("/forgot-password");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="flex items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center">
          <Logo width={160} height={42} />
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Nuova password</CardTitle>
              <CardDescription>
                Scegli una nuova password per il tuo account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UpdatePasswordForm />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
