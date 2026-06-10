"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function IconFeed() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function IconCarte() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="2.5" width="13" height="18" rx="2" />
      <path d="M20.5 7v11a3 3 0 0 1-3 3H9" />
    </svg>
  );
}

function IconDashboard() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  const tabCls = (href: string) =>
    [
      "flex flex-1 flex-col items-center justify-center gap-1 py-2",
      "font-sans text-[11px] font-medium transition-colors",
      isActive(href)
        ? "text-[#6DBE00] dark:text-[#9ADE00]"
        : "text-[#4A4A44] dark:text-[#B0AFA8]",
    ].join(" ");

  const isNewHuntActive = isActive("/hunts/new");

  return (
    <nav
      aria-label="Navigazione principale"
      className={[
        "md:hidden fixed bottom-0 inset-x-0 z-40 flex h-16 items-stretch",
        "border-t-2 border-[#1A1A18] dark:border-[#3A3D38]",
        "bg-[#F2EDE3] dark:bg-[#111210]",
      ].join(" ")}
    >
      {/* Feed */}
      <Link href="/feed" className={tabCls("/feed")} aria-label="Feed">
        <IconFeed />
        <span>Feed</span>
      </Link>

      {/* Carte */}
      <Link href="/carte" className={tabCls("/carte")} aria-label="Carte">
        <IconCarte />
        <span>Carte</span>
      </Link>

      {/* Nuova Hunt — bottone centrale elevato */}
      <div className="flex flex-1 items-center justify-center">
        <Link
          href="/hunts/new"
          aria-label="Nuova Hunt"
          className={[
            "flex h-12 w-12 -mt-5 items-center justify-center rounded-full",
            "border-2 border-[#1A1A18] dark:border-[#3A3D38]",
            "bg-[#6DBE00] dark:bg-[#9ADE00] text-[#1A1A18]",
            isNewHuntActive
              ? "shadow-[2px_2px_0px_#1A1A18] dark:shadow-[2px_2px_0px_#3A3D38] translate-x-0.5 translate-y-0.5"
              : "shadow-[4px_4px_0px_#1A1A18] dark:shadow-[4px_4px_0px_#3A3D38]",
            "transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0px_#1A1A18]",
          ].join(" ")}
        >
          <IconPlus />
        </Link>
      </div>

      {/* Dashboard */}
      <Link
        href="/dashboard"
        className={tabCls("/dashboard")}
        aria-label="Dashboard"
      >
        <IconDashboard />
        <span>Dashboard</span>
      </Link>
    </nav>
  );
}
