import { redirect } from "next/navigation";
import Link from "next/link";

import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/brand/ThemeToggle";
import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex items-center justify-end px-6 py-4">
        <ThemeToggle />
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="max-w-md space-y-6">
          <div className="flex justify-center">
            <Logo width={200} height={52} />
          </div>

          <p className="font-sans text-lg text-[#4A4A44] dark:text-[#B0AFA8]">
            Pubblica le carte che cerchi. I venditori vengono da te.
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
    </div>
  );
}
