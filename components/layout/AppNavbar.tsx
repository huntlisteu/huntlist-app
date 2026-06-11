"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { signOut } from "@/app/(app)/actions";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/brand/ThemeToggle";

interface NavProfile {
  username: string | null;
  avatar_url: string | null;
}

interface AppNavbarProps {
  isLoggedIn: boolean;
  profile: NavProfile | null;
}

// ── Avatar ─────────────────────────────────────────────────────────────────

function AvatarFallback({ username }: { username: string | null }) {
  const letter = username ? username.charAt(0).toUpperCase() : "?";
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#1A1A18] dark:border-[#3A3D38] bg-[#B84A1C] dark:bg-[#FF6B2C] font-sans text-sm font-bold text-white select-none shadow-[4px_4px_0px_#1A1A18] dark:shadow-[2px_2px_0px_#3A3D38]">
      {letter}
    </span>
  );
}

function Avatar({ profile }: { profile: NavProfile | null }) {
  const [broken, setBroken] = useState(false);

  if (!profile?.avatar_url || broken) {
    return <AvatarFallback username={profile?.username ?? null} />;
  }

  return (
    <span className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-[#1A1A18] dark:border-[#3A3D38] shadow-[4px_4px_0px_#1A1A18] dark:shadow-[2px_2px_0px_#3A3D38]">
      <Image
        src={profile.avatar_url}
        alt={profile.username ?? "Avatar"}
        fill
        className="object-cover"
        unoptimized
        onError={() => setBroken(true)}
      />
    </span>
  );
}

// ── Nav link ───────────────────────────────────────────────────────────────

function NavLink({
  href,
  children,
  active,
}: {
  href: string;
  children: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "hidden md:inline-flex items-center px-3 py-1.5 font-sans text-sm font-medium rounded-[4px] border-2 transition-all",
        active
          ? "border-[#1A1A18] dark:border-[#3A3D38] bg-[#1A1A18] dark:bg-[#3A3D38] text-[#F2EDE3] dark:text-[#F0EFE8]"
          : "border-transparent text-[#1A1A18] dark:text-[#F0EFE8] hover:border-[#1A1A18] dark:hover:border-[#3A3D38]",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function AppNavbar({ isLoggedIn, profile }: AppNavbarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <header className="border-b-2 border-[#1A1A18] dark:border-[#3A3D38] bg-[#F2EDE3] dark:bg-[#111210]">
      <div className="container flex h-16 max-w-5xl items-center justify-between gap-4">

        {/* ── Logo ────────────────────────────────────────────────────── */}
        <Link
          href={isLoggedIn ? "/market" : "/"}
          className="flex items-center shrink-0"
        >
          <Logo width={140} height={36} />
        </Link>

        {/* ── Centro: link desktop ────────────────────────────────────── */}
        <nav className="hidden md:flex items-center gap-1">
          {isLoggedIn && (
            <>
              <NavLink href="/market" active={isActive("/market")}>
                Feed
              </NavLink>
              <NavLink href="/dashboard" active={isActive("/dashboard")}>
                Dashboard
              </NavLink>
            </>
          )}
          <NavLink href="/cards" active={isActive("/cards")}>
            Carte
          </NavLink>
        </nav>

        {/* ── Destra ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 ml-auto md:ml-0">
          {isLoggedIn ? (
            <>
              {/* Nuova Hunt — solo desktop */}
              <Link
                href="/hunts/new"
                className={[
                  "hidden md:inline-flex items-center gap-1 px-4 py-2",
                  "font-sans text-sm font-bold rounded-[4px]",
                  "border-2 border-[#1A1A18] dark:border-[#3A3D38]",
                  "bg-[#6DBE00] dark:bg-[#9ADE00] text-[#1A1A18]",
                  "shadow-[4px_4px_0px_#1A1A18] dark:shadow-[4px_4px_0px_#3A3D38]",
                  "hover:translate-x-0.5 hover:translate-y-0.5",
                  "hover:shadow-[2px_2px_0px_#1A1A18] dark:hover:shadow-[2px_2px_0px_#3A3D38]",
                  "transition-all",
                ].join(" ")}
              >
                + Nuova Hunt
              </Link>

              <ThemeToggle />

              {/* Avatar + dropdown */}
              <div className="relative flex items-center self-center" ref={dropdownRef}>
                <button
                  onClick={() => setOpen((v) => !v)}
                  aria-label="Menu profilo"
                  aria-expanded={open}
                  aria-haspopup="menu"
                  className="flex items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6DBE00] dark:focus-visible:ring-[#9ADE00] focus-visible:ring-offset-2"
                >
                  <Avatar profile={profile} />
                </button>

                {open && (
                  <div
                    role="menu"
                    className={[
                      "absolute right-0 top-full mt-2 w-48 z-50 overflow-hidden",
                      "border-2 border-[#1A1A18] dark:border-[#3A3D38] rounded-[4px]",
                      "bg-[#F2EDE3] dark:bg-[#1A1C19]",
                      "shadow-[4px_4px_0px_#1A1A18] dark:shadow-[4px_4px_0px_#3A3D38]",
                    ].join(" ")}
                  >
                    {/* Username header */}
                    {profile?.username && (
                      <div className="border-b border-[#1A1A18]/20 dark:border-[#3A3D38] px-3 py-2">
                        <p className="font-sans text-[10px] uppercase tracking-wider text-[#8A8A82] dark:text-[#5A5A54]">
                          Loggato come
                        </p>
                        <p className="mt-0.5 font-sans text-sm font-bold text-[#1A1A18] dark:text-[#F0EFE8] truncate">
                          @{profile.username}
                        </p>
                      </div>
                    )}

                    {/* Il mio profilo */}
                    {profile?.username && (
                      <Link
                        href={`/profile/${profile.username}`}
                        role="menuitem"
                        onClick={() => setOpen(false)}
                        className="flex items-center px-3 py-2.5 font-sans text-sm text-[#1A1A18] dark:text-[#F0EFE8] hover:bg-[#EAE2D4] dark:hover:bg-[#3A3D38] transition-colors"
                      >
                        Il mio profilo
                      </Link>
                    )}

                    {/* Impostazioni */}
                    <Link
                      href="/settings"
                      role="menuitem"
                      onClick={() => setOpen(false)}
                      className="flex items-center px-3 py-2.5 font-sans text-sm text-[#1A1A18] dark:text-[#F0EFE8] hover:bg-[#EAE2D4] dark:hover:bg-[#3A3D38] transition-colors"
                    >
                      Impostazioni
                    </Link>

                    {/* Esci */}
                    <form action={signOut}>
                      <button
                        type="submit"
                        role="menuitem"
                        className="w-full text-left flex items-center px-3 py-2.5 font-sans text-sm font-medium text-[#B84A1C] dark:text-[#FF6B2C] hover:bg-[#EAE2D4] dark:hover:bg-[#3A3D38] transition-colors"
                      >
                        Esci
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Utente non autenticato */
            <>
              <ThemeToggle />
              <Link
                href="/login"
                className="hidden md:inline-flex px-3 py-1.5 font-sans text-sm font-medium text-[#1A1A18] dark:text-[#F0EFE8] hover:underline underline-offset-4"
              >
                Accedi
              </Link>
              <Link
                href="/signup"
                className={[
                  "inline-flex px-4 py-1.5 font-sans text-sm font-bold rounded-[4px]",
                  "border-2 border-[#1A1A18] dark:border-[#3A3D38]",
                  "bg-[#B84A1C] dark:bg-[#FF6B2C] text-white",
                  "shadow-[4px_4px_0px_#1A1A18] dark:shadow-[4px_4px_0px_#3A3D38]",
                  "hover:translate-x-0.5 hover:translate-y-0.5",
                  "hover:shadow-[2px_2px_0px_#1A1A18] dark:hover:shadow-[2px_2px_0px_#3A3D38]",
                  "transition-all",
                ].join(" ")}
              >
                Registrati
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
