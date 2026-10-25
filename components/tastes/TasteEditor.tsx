"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IconChevronDown, IconDeviceFloppy, IconEye, IconPlaylistAdd, IconTrash, IconX } from "@tabler/icons-react";
import { Spinner } from "@/components/basics/Spinner";
import { useAudioStore, type Track } from "@/store/useAudioStore";
import type { TrackMeta } from "@/lib/recs/service";
import {
  createTaste,
  deleteTaste,
  generateFromTaste,
  previewTaste,
  updateTaste,
  type MoodView,
  type PlaylistPreview,
  type TasteFields,
  type TasteView,
} from "@/lib/TanStackQuery/Queries/tastes";
import MixEditor from "./MixEditor";
import MoodPicker from "./MoodPicker";
import PreviewPanel from "./PreviewPanel";
import TasteSettings from "./TasteSettings";
import { newForm, toForm } from "./form";
import { TASTE_TEMPLATES } from "./templates";

interface Props {
  /** The saved taste to edit, or null to start a new one. */
  taste: TasteView | null;
  moods: MoodView[];
  moodsLoading: boolean;
  isAdmin: boolean;
  onSeedMoods: () => void;
  seeding: boolean;
  seedError: string | null;
  onSaved: (id: string) => void;
  onDeleted: () => void;
  onDirtyChange: (dirty: boolean) => void;
}

const card =
  "rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-5 sm:p-6 transition-colors";

const inputCls =
  "w-full rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-3 py-2.5 text-sm " +
  "text-neutral-900 dark:text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-indigo-500";

const isWide = () => typeof window !== "undefined" && window.matchMedia("(min-width: 1280px)").matches;

export default function TasteEditor({
  taste, moods, moodsLoading, isAdmin, onSeedMoods, seeding, seedError, onSaved, onDeleted, onDirtyChange,
}: Props) {
  const queryClient = useQueryClient();
  const playTrack = useAudioStore(s => s.playTrack);
  const currentTrackId = useAudioStore(s => s.currentTrack?._id ?? null);
  const isPlaying = useAudioStore(s => s.isPlaying);

  // After the first save this editor keeps going with the new id, so a
  // preview or result on screen isn't thrown away.
  const [savedId, setSavedId] = useState<string | null>(taste?._id ?? null);
  const [form, setForm] = useState<TasteFields>(() => (taste ? toForm(taste) : newForm()));
  const [baselineJson, setBaselineJson] = useState(() => JSON.stringify(taste ? toForm(taste) : newForm()));
  const [showTuning, setShowTuning] = useState(false);

  const formJson = useMemo(() => JSON.stringify(form), [form]);
  const dirty = formJson !== baselineJson;
  const patch = (p: Partial<TasteFields>) => setForm(f => ({ ...f, ...p }));

  useEffect(() => { onDirtyChange(dirty); }, [dirty]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const nameOk = form.name.trim().length > 0;
  const moodsOk = form.moods.length > 0;
  const canSave = nameOk && moodsOk && (dirty || !savedId);
  const missing = !nameOk ? "Give it a name" : !moodsOk ? "Pick at least one mood" : null;

  // ── preview ──
  const [preview, setPreview] = useState<PlaylistPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [result, setResult] = useState<{ playlistId: string; replaced: boolean } | null>(null);
  const seedRef = useRef<string | undefined>(undefined);
  const previewedJsonRef = useRef<string | null>(null);
  const requestRef = useRef(0);

  const previewMut = useMutation({
    mutationFn: (v: { fields: TasteFields; seed?: string; n: number }) => previewTaste(v.fields, v.seed),
    onSuccess: (data, v) => {
      if (v.n !== requestRef.current) return; // a newer request is already on its way
      setPreview(data);
      setPreviewError(null);
      seedRef.current = data.seed;
      previewedJsonRef.current = JSON.stringify(v.fields);
    },
    onError: (err: Error, v) => {
      if (v.n === requestRef.current) setPreviewError(err.message);
    },
  });

  const runPreview = (seed?: string) => {
    if (!moodsOk) return;
    setResult(null);
    previewMut.mutate({ fields: form, seed, n: ++requestRef.current });
  };

  const openPreview = () => {
    runPreview(seedRef.current);
    if (!isWide()) setPreviewOpen(true);
  };

  // Once something has been previewed, keep it fresh while tuning. Same seed,
  // so only your changes move the list, not a reshuffle.
  useEffect(() => {
    if (!preview || !moodsOk || formJson === previewedJsonRef.current) return;
    setResult(null);
    const timer = setTimeout(() => {
      previewMut.mutate({ fields: form, seed: seedRef.current, n: ++requestRef.current });
    }, 900);
    return () => clearTimeout(timer);
  }, [formJson]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── save / generate / delete ──
  const saveMut = useMutation({
    mutationFn: (fields: TasteFields) => (savedId ? updateTaste(savedId, fields) : createTaste(fields)),
    onSuccess: (saved, fields) => {
      setSavedId(saved._id);
      setBaselineJson(JSON.stringify(fields));
      queryClient.invalidateQueries({ queryKey: ["tastes"] });
      onSaved(saved._id);
    },
  });

  const generateMut = useMutation({
    mutationFn: async () => {
      // The playlist is built from the saved taste, so save any changes first.
      const id = !savedId || dirty ? (await saveMut.mutateAsync(form))._id : savedId;
      return generateFromTaste(id, seedRef.current);
    },
    onSuccess: data => {
      setPreview(data);
      seedRef.current = data.seed;
      previewedJsonRef.current = formJson;
      setPreviewError(null);
      setResult({ playlistId: data.playlistId, replaced: data.replaced });
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      queryClient.invalidateQueries({ queryKey: ["tastes"] });
      if (!isWide()) setPreviewOpen(true);
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteTaste(savedId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tastes"] });
      onDeleted();
    },
  });

  const playFromPreview = (t: TrackMeta) => {
    const track: Track = {
      _id: t._id,
      title: t.title,
      artist: t.artist,
      url: t.url,
      image: t.image,
      visibility: "private",
      createdAt: "",
      updatedAt: "",
    };
    playTrack(track);
  };

  const applyTemplate = (id: string) => {
    const t = TASTE_TEMPLATES.find(x => x.id === id);
    if (!t) return;
    const available = new Set(moods.map(m => m.slug));
    patch({
      name: t.name,
      description: t.description,
      moods: t.moods.filter(m => available.has(m.slug)),
      mix: { ...t.mix },
    });
  };

  const busy = saveMut.isPending || generateMut.isPending;
  const actionError = (saveMut.error as Error | null)?.message || (generateMut.error as Error | null)?.message || null;

  const panel = (
    <PreviewPanel
      preview={preview}
      loading={previewMut.isPending}
      error={previewError}
      canPreview={moodsOk}
      onShuffle={() => runPreview(crypto.randomUUID())}
      onPlay={playFromPreview}
      currentTrackId={currentTrackId}
      isPlaying={isPlaying}
      result={result}
    />
  );

  return (
    <>
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 flex flex-col gap-5 min-w-0">

          {/* Basics */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={`${card} space-y-4`}>
            <div>
              <h2 className="text-base font-semibold text-neutral-900 dark:text-white">{savedId ? "Your taste" : "New taste"}</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">A name and a short note so you can tell it apart later</p>
            </div>

            {!savedId && !dirty && (
              <div>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Quick start</p>
                <div className="flex flex-wrap gap-2">
                  {TASTE_TEMPLATES.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => applyTemplate(t.id)}
                      disabled={moodsLoading || moods.length === 0}
                      className="px-3 py-1.5 rounded-full text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <input
              value={form.name}
              onChange={e => patch({ name: e.target.value })}
              placeholder="Name, e.g. Rainy evening"
              maxLength={60}
              className={inputCls}
              aria-label="Taste name"
            />
            <input
              value={form.description ?? ""}
              onChange={e => patch({ description: e.target.value })}
              placeholder="Description (optional)"
              maxLength={300}
              className={inputCls}
              aria-label="Description"
            />
          </motion.div>

          {/* Moods */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }} className={`${card} space-y-4`}>
            <div>
              <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Moods</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">What do you want this taste to feel like?</p>
            </div>
            <MoodPicker
              moods={moods}
              loading={moodsLoading}
              value={form.moods}
              onChange={m => patch({ moods: m })}
              isAdmin={isAdmin}
              onSeed={onSeedMoods}
              seeding={seeding}
              seedError={seedError}
            />
          </motion.div>

          {/* Mix */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className={`${card} space-y-4`}>
            <div>
              <h2 className="text-base font-semibold text-neutral-900 dark:text-white">The mix</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">How much of each kind of song goes into the playlist</p>
            </div>
            <MixEditor value={form.mix} onChange={mix => patch({ mix })} />
          </motion.div>

          {/* Fine tuning */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className={card}>
            <button
              type="button"
              onClick={() => setShowTuning(s => !s)}
              aria-expanded={showTuning}
              className="w-full flex items-center justify-between gap-3 text-left"
            >
              <div>
                <h2 className="text-base font-semibold text-neutral-900 dark:text-white">Fine tuning</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {form.size} songs · up to {form.maxPerArtist} per artist · refresh {form.schedule.frequency === "manual" ? "on demand" : form.schedule.frequency}
                </p>
              </div>
              <IconChevronDown className={`w-5 h-5 text-neutral-400 transition-transform ${showTuning ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence initial={false}>
              {showTuning && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-5 mt-5 border-t border-neutral-200 dark:border-neutral-800">
                    <TasteSettings form={form} onChange={patch} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {savedId && (
            <div className="flex justify-end">
              <button
                type="button"
                disabled={deleteMut.isPending}
                onClick={() => {
                  if (!confirm("Delete this taste? Playlists it already made are kept.")) return;
                  deleteMut.mutate();
                }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50 transition"
              >
                <IconTrash className="w-3.5 h-3.5" />
                {deleteMut.isPending ? "Deleting…" : "Delete this taste"}
              </button>
            </div>
          )}

          {/* Always within reach while tuning */}
          <div className="sticky bottom-3 max-md:bottom-24 z-20 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur shadow-xl p-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0 text-xs px-1">
              {actionError ? (
                <span className="text-red-600 dark:text-red-400">{actionError}</span>
              ) : saveMut.isPending ? (
                <span className="text-neutral-500">Saving…</span>
              ) : missing ? (
                <span className="text-neutral-500 dark:text-neutral-400">{missing} to save it</span>
              ) : dirty ? (
                <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Unsaved changes
                </span>
              ) : savedId ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> All changes saved
                </span>
              ) : (
                <span className="text-neutral-500">Not saved yet</span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={openPreview}
                disabled={!moodsOk || previewMut.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 dark:border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-900 dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {previewMut.isPending ? <Spinner size={14} /> : <IconEye className="w-4 h-4" />}
                Preview
              </button>
              <button
                type="button"
                onClick={() => saveMut.mutate(form)}
                disabled={!canSave || busy}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-700 dark:hover:bg-neutral-200 disabled:bg-neutral-200 dark:disabled:bg-neutral-700 disabled:text-neutral-400 dark:disabled:text-neutral-500 disabled:cursor-not-allowed"
              >
                {saveMut.isPending && !generateMut.isPending ? <Spinner size={14} /> : <IconDeviceFloppy className="w-4 h-4" />}
                Save
              </button>
              <button
                type="button"
                onClick={() => generateMut.mutate()}
                disabled={!nameOk || !moodsOk || busy}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition disabled:bg-neutral-200 dark:disabled:bg-neutral-700 disabled:text-neutral-400 dark:disabled:text-neutral-500 disabled:cursor-not-allowed"
              >
                {generateMut.isPending ? <Spinner size={14} /> : <IconPlaylistAdd className="w-4 h-4" />}
                Make playlist
              </button>
            </div>
          </div>
        </div>

        {/* Live preview beside the controls on wide screens */}
        <aside className="hidden xl:block xl:col-span-2">
          <div className="sticky top-4">{panel}</div>
        </aside>
      </div>

      {/* Smaller screens get the same preview in a sheet */}
      <AnimatePresence>
        {previewOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="xl:hidden fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 px-4 pb-4"
            onClick={() => setPreviewOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl"
              onClick={e => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                aria-label="Close preview"
                className="absolute top-3 right-3 z-10 p-1.5 rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              >
                <IconX className="w-4 h-4" />
              </button>
              {panel}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}