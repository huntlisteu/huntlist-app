import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getProfile, requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Dashboard · Huntlist",
};

export default async function DashboardPage() {
  // Pagina privata: il layout (app) non redirige piu', quindi la guardia e' qui.
  await requireUser();
  const profile = await getProfile();

  // Senza profilo (stato anomalo) o senza username: passa dall'onboarding.
  // Non si redirige a /login per evitare loop col layout (auth).
  if (!profile || !profile.username) {
    redirect("/onboarding");
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-accent">
          Dashboard
        </p>
        <h1 className="mt-1 font-heading text-3xl font-semibold sm:text-4xl">
          Ciao, {profile.display_name}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Sei loggato come{" "}
          <span className="font-medium text-foreground">
            @{profile.username}
          </span>
          .
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Le tue Hunt</CardTitle>
            <CardDescription>
              Le mancaliste che pubblichi appariranno qui.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Arriva nella Fase 3 (core loop): creazione Hunt, feed e offerte.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Le tue offerte</CardTitle>
            <CardDescription>
              Le offerte che invii ai venditori appariranno qui.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Anche questa sezione arriva nella Fase 3.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
