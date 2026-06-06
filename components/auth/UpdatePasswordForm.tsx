"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isExpiredError =
    error !== null &&
    (error.includes("scaduto") || error.includes("valido"));

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("La password deve avere almeno 8 caratteri");
      return;
    }
    if (password !== confirm) {
      setError("Le due password non coincidono");
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);

    if (updateError) {
      const msg = updateError.message.toLowerCase();
      if (msg.includes("expired") || msg.includes("invalid") || msg.includes("not found")) {
        setError("Il link è scaduto o non è più valido.");
      } else {
        setError("Errore durante l'aggiornamento. Riprova.");
      }
      return;
    }

    router.push("/feed");
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

      {error && (
        <div className="space-y-1">
          <p className="text-sm font-medium text-destructive" role="alert">
            {error}
          </p>
          {isExpiredError && (
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
