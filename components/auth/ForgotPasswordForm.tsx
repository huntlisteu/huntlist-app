"use client";

import { useActionState } from "react";
import Link from "next/link";

import { sendPasswordReset } from "@/app/(auth)/forgot-password/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/auth/SubmitButton";
import type { AuthFormState } from "@/lib/validation/auth";

const initialState: AuthFormState = {};

export function ForgotPasswordForm() {
  const [state, action] = useActionState(sendPasswordReset, initialState);

  if (state.message) {
    return (
      <div className="space-y-4">
        <p
          className="text-sm font-medium text-[#1A1A18] dark:text-[#F0EFE8]"
          role="status"
        >
          {state.message}
        </p>
        <Link
          href="/login"
          className="block text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          ← Torna al login
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="forgot-email">Email</Label>
        <Input
          id="forgot-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="tu@esempio.it"
          required
        />
      </div>

      {state.error && (
        <p className="text-sm font-medium text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <SubmitButton className="w-full" pendingLabel="Invio in corso…">
        Invia link di recupero
      </SubmitButton>

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          ← Torna al login
        </Link>
      </p>
    </form>
  );
}
