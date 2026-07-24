"use client";

import { useEffect, useState } from "react";
import { IconSun, IconMoon } from "@tabler/icons-react";

const COOKIE_NAME = "theme";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function setThemeCookie(theme: "light" | "dark") {
  document.cookie = `${COOKIE_NAME}=${theme}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className = "" }: ThemeToggleProps) {
  // The <html> element already has the correct class from the server render,
  // so we just mirror it into local state for the icon — no flash, no storage read.
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    document.documentElement.style.colorScheme = next;
    setThemeCookie(next);
  };

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className={`relative inline-flex items-center justify-center h-10 w-10 rounded-full
        border transition-all active:scale-[0.95]
        bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-100
        dark:bg-white/5 dark:backdrop-blur dark:border-white/10 dark:text-white dark:hover:bg-white/10
        ${className}`}
    >
      {theme === "dark" ? (
        <IconSun className="w-4 h-4" />
      ) : (
        <IconMoon className="w-4 h-4" />
      )}
    </button>
  );
}