"use client";

import Link from "next/link";
import { IconPlus, IconEdit } from "@tabler/icons-react";
import ThemeToggle from "@/components/basics/ThemeToggle";
import { useCurrentUser } from "@/lib/TanStackQuery/authQueries/hooks/useCurrentUser";

// The home page used "/Signup" on mobile and "/signup" on desktop. On a
// case-sensitive host only the one matching your real folder name works, so
// it lives in ONE place now. Set this to match your actual route folder.
const SIGNUP_PATH = "/signup";

const primaryBtn =
  "relative inline-flex items-center gap-2 h-10 px-5 rounded-full " +
  "bg-gradient-to-b from-indigo-500 to-indigo-600 text-white font-medium " +
  "shadow-md shadow-indigo-600/30 hover:from-indigo-400 hover:to-indigo-600 " +
  "active:scale-[0.98] transition-all text-sm";

const secondaryBtn =
  "relative inline-flex items-center gap-2 h-10 px-5 rounded-full " +
  "bg-neutral-100 border border-neutral-200 text-neutral-700 hover:bg-neutral-200 " +
  "dark:bg-white/5 dark:backdrop-blur dark:border-white/10 dark:text-white dark:hover:bg-white/10 dark:hover:border-white/20 " +
  "active:scale-[0.98] transition-all text-sm font-medium";

interface Props {
  /** Layout classes for the wrapper (flex/gap/position/visibility). */
  className?: string;
  /** Extra classes for the theme toggle, e.g. "ml-auto" in the mobile row. */
  toggleClassName?: string;
}

export default function HeaderActions({ className = "", toggleClassName = "" }: Props) {
  const { data: user, isLoading } = useCurrentUser();

  return (
    <div className={className}>
      {!isLoading && (
        <>
          {user ? (
            <>
              <Link href="/createHub" className={primaryBtn}>
                <IconPlus className="w-4 h-4" /> New
              </Link>
              <Link href="/edit" className={secondaryBtn}>
                <IconEdit className="w-4 h-4" /> Edit
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className={secondaryBtn}>Login</Link>
              <Link href={SIGNUP_PATH} className={primaryBtn}>Sign up</Link>
            </>
          )}
          <ThemeToggle className={toggleClassName} />
        </>
      )}
    </div>
  );
}
