"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IconPlus, IconSparkles } from "@tabler/icons-react";
import BackButton from "@/components/basics/BackButton";
import ThemeToggle from "@/components/basics/ThemeToggle";
import { Spinner } from "@/components/basics/Spinner";
import TasteEditor from "@/components/tastes/TasteEditor";
import { useCurrentUser } from "@/lib/TanStackQuery/authQueries/hooks/useCurrentUser";
import { seedMoods, useMoods, useTastes, type TasteView } from "@/lib/TanStackQuery/Queries/tastes";

const NO_TASTES: TasteView[] = [];

function TastesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const tastesQuery = useTastes();
  const tastes = tastesQuery.data ?? NO_TASTES;
  const { data: moods = [], isLoading: moodsLoading } = useMoods();
  const { data: user } = useCurrentUser();
  const isAdmin = user?.role === "admin";

  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  // Changing this gives the editor a fresh start (new form, no old preview).
  const [editorKey, setEditorKey] = useState(0);
  const initialised = useRef(false);
  const dirtyRef = useRef(false);

  // Decide what to show first: ?new=1, ?id=…, or the most recent taste.
  useEffect(() => {
    if (initialised.current || tastesQuery.isLoading) return;
    initialised.current = true;
    if (searchParams.get("new")) {
      setCreating(true);
      return;
    }
    const wanted = searchParams.get("id");
    const match = wanted ? tastes.find(t => t._id === wanted) : undefined;
    if (match) setSelected(match._id);
    else if (tastes.length > 0) setSelected(tastes[0]._id);
  }, [tastesQuery.isLoading, tastes, searchParams]);

  const seed = useMutation({
    mutationFn: seedMoods,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["moods"] }),
  });

  const okToLeave = () => !dirtyRef.current || confirm("Discard unsaved changes?");

  const selectTaste = (id: string) => {
    if (id === selected && !creating) return;
    if (!okToLeave()) return;
    dirtyRef.current = false;
    setCreating(false);
    setSelected(id);
    setEditorKey(k => k + 1);
    router.replace(`/tastes?id=${id}`, { scroll: false });
  };

  const startNew = () => {
    if (!okToLeave()) return;
    dirtyRef.current = false;
    setSelected(null);
    setCreating(true);
    setEditorKey(k => k + 1);
    router.replace("/tastes?new=1", { scroll: false });
  };

  // The editor keeps going after its first save, so no restart here.
  const handleSaved = (id: string) => {
    setSelected(id);
    setCreating(false);
    router.replace(`/tastes?id=${id}`, { scroll: false });
  };

  const handleDeleted = () => {
    const rest = tastes.filter(t => t._id !== selected);
    dirtyRef.current = false;
    setCreating(false);
    setSelected(rest[0]?._id ?? null);
    setEditorKey(k => k + 1);
    router.replace(rest[0] ? `/tastes?id=${rest[0]._id}` : "/tastes", { scroll: false });
  };

  const activeTaste = creating ? null : tastes.find(t => t._id === selected) ?? null;
  const showEditor = creating || !!activeTaste;

  return (
    <div className="min-h-full overflow-x-hidden bg-white dark:bg-transparent transition-colors">
      <div className="max-w-6xl mx-auto w-full p-4 sm:p-6 pb-32 flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">Tastes</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              Tell Mudit what you&apos;re in the mood for and get playlists that fit
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <ThemeToggle />
            <BackButton />
          </div>
        </div>

        {tastesQuery.isLoading && (
          <div className="flex items-center justify-center gap-2 py-24 text-sm text-neutral-500">
            <Spinner size={16} /> Loading your tastes…
          </div>
        )}

        {tastesQuery.isError && (
          <div className="rounded-2xl border border-red-300/50 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-5 py-4 text-sm text-red-700 dark:text-red-300">
            Couldn&apos;t load your tastes: {tastesQuery.error.message}
          </div>
        )}

        {/* Switch between tastes */}
        {!tastesQuery.isLoading && !tastesQuery.isError && (tastes.length > 0 || creating) && (
          <div className="flex gap-2 overflow-x-auto hide-scrollbar py-1 -mx-1 px-1">
            {tastes.map(t => {
              const active = !creating && t._id === selected;
              return (
                <button
                  key={t._id}
                  type="button"
                  onClick={() => selectTaste(t._id)}
                  aria-pressed={active}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition ${
                    active
                      ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                      : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                  }`}
                >
                  {t.name}
                </button>
              );
            })}
            <button
              type="button"
              onClick={startNew}
              className={`flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition ${
                creating
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "border-dashed border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:border-neutral-500"
              }`}
            >
              <IconPlus className="w-4 h-4" />
              New taste
            </button>
          </div>
        )}

        {/* First time here */}
        {!tastesQuery.isLoading && !tastesQuery.isError && tastes.length === 0 && !creating && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-8 sm:p-12 flex flex-col items-center text-center gap-4 transition-colors"
          >
            <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center">
              <IconSparkles className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">Teach Mudit your taste</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-md leading-relaxed">
              Pick the moods you like, decide how much is familiar and how much is new, and Mudit builds playlists that
              match. It takes about a minute.
            </p>
            <button
              type="button"
              onClick={startNew}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-5 py-3 transition"
            >
              <IconPlus className="w-4 h-4" />
              Create your first taste
            </button>
          </motion.div>
        )}

        {showEditor && (
          <TasteEditor
            key={editorKey}
            taste={activeTaste}
            moods={moods}
            moodsLoading={moodsLoading}
            isAdmin={isAdmin}
            onSeedMoods={() => seed.mutate()}
            seeding={seed.isPending}
            seedError={seed.error ? (seed.error as Error).message : null}
            onSaved={handleSaved}
            onDeleted={handleDeleted}
            onDirtyChange={d => { dirtyRef.current = d; }}
          />
        )}
      </div>
    </div>
  );
}

export default function TastesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full text-neutral-500 text-sm">Loading…</div>
      }
    >
      <TastesPageInner />
    </Suspense>
  );
}