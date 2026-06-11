"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ErrorKind = "validation" | "session" | "generic";

interface FormError {
  message: string;
  kind: ErrorKind;
}

function classifySupabaseError(message: string): ErrorKind {
  const lower = message.toLowerCase();
  if (
    lower.includes("session") ||
    lower.includes("jwt") ||
    lower.includes("expired") ||
    lower.includes("invalid") ||
    lower.includes("not found")
  ) {
    return "session";
  }
  return "generic";
}

export function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [formError, setFormError] = useState<FormError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    // ── Validazione client-side ──────────────────────────────────────────
    if (password.length < 8) {
      setFormError({
        message: "La password deve essere di almeno 8 caratteri",
        kind: "validation",
      });
      return;
    }
    if (password !== confirm) {
      setFormError({
        message: "Le password non coincidono",
        kind: "validation",
      });
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();
    const { data, error: updateError } = await supabase.auth.updateUser({
      password,
    });
    setIsSubmitting(false);

    // ── Errore Supabase ──────────────────────────────────────────────────
    if (updateError) {
      // Log sempre il messaggio originale — mai inghiottito silenziosamente.
      console.error("[update-password] supabase.auth.updateUser error:", {
        message: updateError.message,
        status: (updateError as { status?: number }).status,
        name: updateError.name,
      });

      const kind = classifySupabaseError(updateError.message);

      setFormError({
        message:
          kind === "session"
            ? "Il link è scaduto. Richiedine uno nuovo."
            : "Errore durante il salvataggio. Riprova tra qualche secondo.",
        kind,
      });
      return;
    }

    // ── Successo ─────────────────────────────────────────────────────────
    if (data.user) {
      // Sessione ancora attiva → vai al feed.
      router.push("/market");
    } else {
      // Supabase ha invalidato la sessione dopo il reset (raro ma possibile).
      router.push("/login?message=password_aggiornata");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="new-password">Nuova password</Label>
        <Input
          id="new-password"
          name="new-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          placeholder="Almeno 8 caratteri"
          required
          minLength={8}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-password">Conferma password</Label>
        <Input
          id="confirm-password"
          name="confirm-password"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          placeholder="Ripeti la password"
          required
        />
      </div>

      {formError && (
        <div className="space-y-1">
          <p className="text-sm font-medium text-destructive" role="alert">
            {formError.message}
          </p>
          {formError.kind === "session" && (
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Richiedi un nuovo link →
            </Link>
          )}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Salvataggio…" : "Aggiorna password"}
      </Button>
    </form>
  );
}
