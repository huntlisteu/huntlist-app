"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { usernameSchema, type AuthFormState } from "@/lib/validation/auth";

/** Imposta lo username del profilo dell'utente corrente, poi va in dashboard. */
export async function setUsername(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const user = await requireUser();

  const parsed = usernameSchema.safeParse({
    username: formData.get("username"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ username: parsed.data.username })
    .eq("id", user.id);

  if (error) {
    // 23505 = unique_violation -> username gia' preso.
    if (error.code === "23505") {
      return { error: "Username gia' in uso. Scegline un altro." };
    }
    return { error: "Impossibile salvare lo username. Riprova." };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
