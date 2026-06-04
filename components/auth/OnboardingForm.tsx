"use client";

import { useActionState } from "react";

import { setUsername } from "@/app/(app)/onboarding/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/auth/SubmitButton";
import type { AuthFormState } from "@/lib/validation/auth";

const initialState: AuthFormState = {};

export function OnboardingForm() {
  const [state, action] = useActionState(setUsername, initialState);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <div className="flex items-center rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
          <span className="pl-3 text-sm text-muted-foreground">@</span>
          <Input
            id="username"
            name="username"
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="ash_ketchum"
            minLength={3}
            maxLength={30}
            required
            className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          3-30 caratteri: lettere minuscole, numeri e underscore. Sara' visibile
          agli altri collezionisti.
        </p>
      </div>

      {state.error && (
        <p className="text-sm font-medium text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <SubmitButton className="w-full" pendingLabel="Salvataggio…">
        Continua
      </SubmitButton>
    </form>
  );
}
