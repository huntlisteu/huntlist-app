import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OnboardingForm } from "@/components/auth/OnboardingForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getProfile, requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Scegli lo username · Huntlist",
};

export default async function OnboardingPage() {
  // Pagina privata: il layout (app) non redirige piu', quindi la guardia e' qui.
  await requireUser();
  const profile = await getProfile();

  // Username gia' scelto -> niente onboarding, vai in dashboard.
  if (profile?.username) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Scegli il tuo username</CardTitle>
          <CardDescription>
            Ci siamo quasi. Ti serve un username per pubblicare Hunt e fare
            offerte.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OnboardingForm />
        </CardContent>
      </Card>
    </div>
  );
}
