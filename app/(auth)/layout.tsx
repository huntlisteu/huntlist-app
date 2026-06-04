import Link from "next/link";
import { redirect } from "next/navigation";

import { ThemeToggle } from "@/components/brand/ThemeToggle";
import { getUser } from "@/lib/auth";

export default async function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Chi e' gia' autenticato non deve vedere login/signup.
  const user = await getUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="flex items-center justify-between px-6 py-5">
        <Link href="/" className="font-heading text-xl font-semibold">
          Huntlist
        </Link>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
