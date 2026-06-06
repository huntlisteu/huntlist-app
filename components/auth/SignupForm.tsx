"use client";

import { useActionState } from "react";
import Link from "next/link";

import {
  signUpWithMagicLink,
  signUpWithPassword,
} from "@/app/(auth)/signup/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/auth/SubmitButton";
import type { AuthFormState } from "@/lib/validation/auth";

const initialState: AuthFormState = {};

function FormFeedback({ state }: { state: AuthFormState }) {
  if (state.error) {
    return (
      <p className="text-sm font-medium text-destructive" role="alert">
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p className="text-sm font-medium text-[#1A1A18] dark:text-[#F0EFE8]" role="status">
        {state.message}
      </p>
    );
  }
  return null;
}

export function SignupForm() {
  const [pwState, pwAction] = useActionState(signUpWithPassword, initialState);
  const [mlState, mlAction] = useActionState(signUpWithMagicLink, initialState);

  return (
    <div className="space-y-6">
      {/* Email + password */}
      <form action={pwAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="signup-email">Email</Label>
          <Input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="tu@esempio.it"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-password">Password</Label>
          <Input
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Almeno 8 caratteri"
            required
          />
        </div>
        <FormFeedback state={pwState} />
        <SubmitButton className="w-full" pendingLabel="Creazione in corso…">
          Crea account
        </SubmitButton>
      </form>

      {/* Separatore */}
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          oppure
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      {/* Magic link */}
      <form action={mlAction} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="signup-magic-email">Registrati con un magic link</Label>
          <Input
            id="signup-magic-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="tu@esempio.it"
            required
          />
        </div>
        <FormFeedback state={mlState} />
        <SubmitButton
          variant="outline"
          className="w-full"
          pendingLabel="Invio in corso…"
        >
          Inviami un link di accesso
        </SubmitButton>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Hai gia' un account?{" "}
        <Link
          href="/login"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Accedi
        </Link>
      </p>
    </div>
  );
}
