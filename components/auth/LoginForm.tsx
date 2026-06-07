"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

import {
  loginWithMagicLink,
  loginWithPassword,
} from "@/app/(auth)/login/actions";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
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

export function LoginForm() {
  const [pwState, pwAction] = useActionState(loginWithPassword, initialState);
  const [mlState, mlAction] = useActionState(loginWithMagicLink, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-6">
      {/* Google OAuth */}
      <GoogleAuthButton />

      {/* Separatore */}
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          oppure
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      {/* Email + password */}
      <form action={pwAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="login-email">Email</Label>
          <Input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="tu@esempio.it"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="login-password">Password</Label>
          <div className="relative">
            <Input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              required
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Nascondi password" : "Mostra password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1A1A18] dark:text-[#F0EFE8] hover:opacity-70 transition-opacity"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <FormFeedback state={pwState} />
        <SubmitButton className="w-full" pendingLabel="Accesso in corso…">
          Accedi
        </SubmitButton>
        <p className="text-center text-sm text-muted-foreground">
          <Link
            href="/forgot-password"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Hai dimenticato la password?
          </Link>
        </p>
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
          <Label htmlFor="login-magic-email">Accedi con un magic link</Label>
          <Input
            id="login-magic-email"
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
          Inviami un magic link
        </SubmitButton>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Non hai un account?{" "}
        <Link
          href="/signup"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Registrati
        </Link>
      </p>
    </div>
  );
}
