"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import Image from "next/image";

type LogoProps = {
  width?: number;
  height?: number;
  className?: string;
};

/**
 * Logo Huntlist tema-aware.
 * Usa resolvedTheme per gestire anche il tema "system".
 * Prima del mount (SSR + prima idratazione) mostra sempre logo_light.svg
 * per evitare mismatch di hydration — stesso pattern di ThemeToggle.
 */
export function Logo({ width = 140, height = 36, className }: LogoProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Finché non è montato usiamo light come default neutro (corrisponde a SSR).
  const isDark = mounted && resolvedTheme === "dark";

  const src = isDark ? "/logo_dark.svg" : "/logo_light.svg";
  const shadow = isDark
    ? "drop-shadow(4px 4px 0px #3A3D38)"
    : "drop-shadow(4px 4px 0px #000000)";

  return (
    <Image
      src={src}
      alt="Huntlist"
      width={width}
      height={height}
      priority
      className={className}
      style={{ height: "auto", filter: shadow }}
    />
  );
}
