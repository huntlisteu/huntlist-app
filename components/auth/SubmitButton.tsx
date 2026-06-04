"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";

/**
 * Bottone di submit che si disabilita e mostra "Attendi…" mentre la Server
 * Action e' in esecuzione (via useFormStatus). Va usato DENTRO un <form>.
 */
export function SubmitButton({
  children,
  pendingLabel = "Attendi…",
  ...props
}: ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending} {...props}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
