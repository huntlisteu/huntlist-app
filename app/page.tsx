import { redirect } from "next/navigation";

import { getUser } from "@/lib/auth";
import LandingClient from "@/components/landing/LandingClient";

export default async function HomePage() {
  const user = await getUser();
  if (user) redirect("/dashboard");
  return <LandingClient />;
}
