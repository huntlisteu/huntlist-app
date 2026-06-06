import { AppNavbar } from "@/components/layout/AppNavbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { getProfile, getUser } from "@/lib/auth";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Sia getUser che getProfile usano `cache` di React: una sola chiamata HTTP
  // anche se invocate separatamente.
  const [user, profile] = await Promise.all([getUser(), getProfile()]);

  const navProfile = profile
    ? { username: profile.username, avatar_url: profile.avatar_url }
    : null;

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <AppNavbar isLoggedIn={!!user} profile={navProfile} />

      {/* pb-20 su mobile lascia spazio alla bottom bar; md:pb-0 lo azzera */}
      <main className="container max-w-5xl flex-1 py-10 pb-20 md:pb-10">
        {children}
      </main>

      {user && <BottomNav />}
    </div>
  );
}
