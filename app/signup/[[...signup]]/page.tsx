import { SignUp } from "@clerk/nextjs";
import BackButton from "@/components/basics/BackButton";
import ThemeToggle from "@/components/basics/ThemeToggle";

export default function SignupPage() {
  return (
    <div
      className="relative min-h-screen overflow-x-hidden flex items-center justify-center
      bg-gradient-to-b from-white via-neutral-50 to-neutral-100
      dark:from-black dark:via-zinc-950 dark:to-zinc-900 px-4 py-10 transition-colors"
    >
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <ThemeToggle />
        <BackButton />
      </div>
      <SignUp appearance={{ variables: { colorPrimary: "#7c3aed" } }} />
    </div>
  );
}
