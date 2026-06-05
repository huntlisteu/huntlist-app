import { redirect } from "next/navigation";
import Link from "next/link";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center">
      <div className="max-w-md space-y-6">
        <div className="flex justify-center">
          <Logo width={200} height={52} />
        </div>
        <h1 className="font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Huntlist
        </h1>

        <p className="text-lg text-muted-foreground">
          Pubblica le carte che cerchi, ricevi offerte dai venditori.
        </p>

        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/feed">Sfoglia le Hunt</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/login">Accedi</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
