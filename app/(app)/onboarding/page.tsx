import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { OnboardingWizard } from "@/components/auth/OnboardingWizard";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Benvenuto · Huntlist",
};

export default async function OnboardingPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .single();

  if (profile?.onboarding_completed) {
    redirect("/market");
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center py-12">
      <OnboardingWizard userId={user.id} />
    </div>
  );
}
