"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Toggle light/dark. Evita mismatch di hydration montando solo a client pronto. */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Il server non conosce il tema salvato in localStorage: renderizza sempre lo
  // stesso markup neutro. Solo dopo il mount (client) calcoliamo tema, label e
  // icona reali. Cosi' il primo render client combacia con l'HTML del server.
  useEffect(() => {
    setMounted(true);
  }, []);

  // Finche' non e' montato: label neutro, icona placeholder, nessuna azione.
  if (!mounted) {
    return (
      <Button
        variant="outline"
        size="icon"
        aria-label="Cambia tema"
        disabled
      >
        <Moon className="size-5" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={isDark ? "Passa al tema chiaro" : "Passa al tema scuro"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </Button>
  );
}
