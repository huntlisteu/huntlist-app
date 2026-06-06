import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Recupera password · Huntlist",
};

const ERROR_MESSAGES: Record<string, string> = {
  link_scaduto:
    "Il link di recupero è scaduto o è già stato usato. Richiedine uno nuovo.",
  link_non_valido:
    "Il link di recupero non è valido. Richiedine uno nuovo.",
};

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? null) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Recupera la password</CardTitle>
        <CardDescription>
          Inserisci la tua email e ti mandiamo un link per reimpostare la
          password.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorMessage && (
          <p
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
            role="alert"
          >
            {errorMessage}
          </p>
        )}
        <ForgotPasswordForm />
      </CardContent>
    </Card>
  );
}
