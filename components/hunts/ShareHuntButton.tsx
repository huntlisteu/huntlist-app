"use client";

import { useEffect, useState } from "react";
import { Check, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Durata del feedback "Copiato!" prima di tornare allo stato iniziale. */
const FEEDBACK_DURATION_MS = 2000;

/** Bottone che copia l'URL corrente negli appunti, per condividere la Hunt. */
export function ShareHuntButton() {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), FEEDBACK_DURATION_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  async function handleClick() {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      // Clipboard API non disponibile (es. contesto non sicuro): nessun feedback.
      return;
    }
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      // Permesso negato o copia non riuscita: nessun feedback.
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleClick}>
      {copied ? (
        <>
          <Check className="size-4" />
          Copiato!
        </>
      ) : (
        <>
          <Share2 className="size-4" />
          Condividi
        </>
      )}
    </Button>
  );
}
