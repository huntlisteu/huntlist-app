import { AppNavbar } from "@/components/layout/AppNavbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { getProfile, getUser } from "@/lib/auth";

export default async function CarteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Sezione pubblica: nessun redirect se non loggato, ma la navbar si adatta
  // allo stato auth (stesso pattern del layout (app)).
  const [user, profile] = await Promise.all([getUser(), getProfile()]);

  const navProfile = profile
    ? { username: profile.username, avatar_url: profile.avatar_url }
    : null;

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <AppNavbar isLoggedIn={!!user} profile={navProfile} />

      {/* pb-20 su mobile lascia spazio alla bottom bar; md:pb-0 lo azzera */}
      <div className="flex-1 pb-20 md:pb-0">{children}</div>

      {user && <BottomNav />}
    </div>
  );
}
