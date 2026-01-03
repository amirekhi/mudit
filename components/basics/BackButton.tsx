"use client";

import { useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();

  return (
  
      <button
        onClick={() => router.back()}
        aria-label="Go back"
        className="
          w-12 h-12
          flex items-center justify-center
          rounded-full
          bg-neutral-900/80 text-white
          hover:bg-neutral-800
          active:scale-95
          transition
        "
      >
        <GoBackArrow />
      </button>
  
  );
}
function GoBackArrow() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M5.828 7H13a6 6 0 1 1 0 12H4v-2h9a4 4 0 1 0 0-8H5.828l3.586 3.586L8 14 2 8l6-6 1.414 1.414z" />
    </svg>
  );
}
