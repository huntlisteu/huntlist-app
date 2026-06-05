import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

// Bordi: Ink #1A1A18 (light) / Char #3A3D38 (dark)
// Sfondo: --paper #F2EDE3 (light) via bg-background / --surface #1A1C19 (dark) via dark:bg-card
function Input({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-[4px] border-2 border-[#1A1A18] bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#3A3D38] dark:bg-card",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
