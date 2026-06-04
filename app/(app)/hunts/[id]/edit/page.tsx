import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { HuntForm } from "@/components/hunts/HuntForm";
import { requireUser } from "@/lib/auth";
import { getHuntWithCards } from "@/lib/hunts";

export const metadata: Metadata = {
  title: "Modifica Hunt · Huntlist",
};

export default async function EditHuntPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const data = await getHuntWithCards(id);
  if (!data) {
    notFound();
  }
  const { hunt, cards } = data;

  // Solo il proprietario puo' modificare, e solo finche' la Hunt e' aperta.
  if (hunt.buyer_id !== user.id) {
    redirect(`/hunts/${hunt.id}`);
  }
  if (hunt.status !== "open") {
    redirect(`/hunts/${hunt.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-accent">
          Modifica Hunt
        </p>
        <h1 className="mt-1 font-heading text-3xl font-semibold">
          {hunt.title}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Aggiorna i dettagli o le carte. Le modifiche sono possibili solo finche'
          la Hunt e' aperta.
        </p>
      </div>

      <HuntForm
        mode="edit"
        huntId={hunt.id}
        defaultHunt={{
          title: hunt.title,
          description: hunt.description ?? "",
          game: hunt.game,
        }}
        defaultCards={cards.map((c) => ({
          name: c.name,
          set_name: c.set_name ?? "",
          collector_number: c.collector_number ?? "",
          language: c.language ?? "",
          quantity: c.quantity,
          desired_condition: c.desired_condition ?? "",
        }))}
      />
    </div>
  );
}
