import { SignIn } from "@clerk/nextjs";
import BackButton from "@/components/basics/BackButton";
import ThemeToggle from "@/components/basics/ThemeToggle";

export default function LoginPage() {
  return (
    <div
      className="relative min-h-screen overflow-x-hidden flex items-center justify-center
      bg-gradient-to-b from-neutral-100 to-white dark:from-black dark:to-zinc-900 px-4 py-10 transition-colors"
    >
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <ThemeToggle />
        <BackButton />
      </div>
      <SignIn appearance={{ variables: { colorPrimary: "#7c3aed" } }} />
    </div>
  );
}
