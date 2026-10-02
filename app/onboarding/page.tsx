import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import OnboardingForm from "./OnboardingForm";

export default async function OnboardingPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (user.onboarded) redirect("/");

  return <OnboardingForm username={user.username} />;
}
