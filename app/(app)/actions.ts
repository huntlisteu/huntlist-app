"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/** Logout: chiude la sessione Supabase e riporta al login. */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
