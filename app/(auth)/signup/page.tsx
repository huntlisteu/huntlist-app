import type { Metadata } from "next";

import { SignupForm } from "@/components/auth/SignupForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Registrati · Huntlist",
};

export default function SignupPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Crea il tuo account</CardTitle>
        <CardDescription>
          Da collezionista a collezionista: pubblica cosa cerchi e ricevi offerte.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SignupForm />
      </CardContent>
    </Card>
  );
}
