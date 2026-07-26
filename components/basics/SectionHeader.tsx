"use client";

interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  accent?: "discover" | "yours" | "people";
}

const ACCENT_CLASSES: Record<string, string> = {
  discover: "text-indigo-600 dark:text-indigo-400",
  yours: "text-amber-600 dark:text-amber-400",
  people: "text-neutral-500 dark:text-neutral-400",
};

export default function SectionHeader({ eyebrow, title, accent = "discover" }: SectionHeaderProps) {
  return (
    <div className="px-8 pt-3 pb-1 flex items-baseline gap-3">
      <span className={`text-[11px] font-bold uppercase tracking-[0.18em] ${ACCENT_CLASSES[accent]}`}>
        {eyebrow}
      </span>
      <h2 className="text-2xl font-bold max-md:text-xl text-neutral-900 dark:text-white">{title}</h2>
    </div>
  );
}