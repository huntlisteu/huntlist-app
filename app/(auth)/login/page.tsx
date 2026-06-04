import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/LoginForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Accedi · Huntlist",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Bentornato</CardTitle>
        <CardDescription>
          Accedi per gestire le tue Hunt e le tue offerte.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error === "auth" && (
          <p
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
            role="alert"
          >
            Link non valido o scaduto. Richiedine uno nuovo qui sotto.
          </p>
        )}
        <LoginForm />
      </CardContent>
    </Card>
  );
}
