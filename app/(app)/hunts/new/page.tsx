import type { Metadata } from "next";

import { HuntForm } from "@/components/hunts/HuntForm";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Nuova Hunt · Huntlist",
};

export default async function NewHuntPage() {
  await requireUser();

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-accent">
          Nuova Hunt
        </p>
        <h1 className="mt-1 font-heading text-3xl font-semibold">
          Pubblica la tua mancalista
        </h1>
        <p className="mt-2 text-muted-foreground">
          Elenca le carte che cerchi. I venditori risponderanno con un&apos;offerta
          per l&apos;intero lotto in una sola spedizione.
        </p>
      </div>

      <HuntForm mode="create" />
    </div>
  );
}
