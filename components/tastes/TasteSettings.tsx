"use client";

import { useEffect, useMemo, useState } from "react";
import { IconInfoCircle } from "@tabler/icons-react";
import type { TasteFields } from "@/lib/TanStackQuery/Queries/tastes";

interface Props {
  form: TasteFields;
  onChange: (patch: Partial<TasteFields>) => void;
}

const STRICTNESS = [
  { id: "strict", label: "Strict", hint: "Only close matches", exact: 0.75, loose: 0.45 },
  { id: "balanced", label: "Balanced", hint: "A sensible middle", exact: 0.6, loose: 0.3 },
  { id: "loose", label: "Loose", hint: "Anything that fits a little", exact: 0.45, loose: 0.2 },
] as const;

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const FREQUENCIES = [
  { id: "manual", label: "Only when I ask" },
  { id: "daily", label: "Every day" },
  { id: "weekly", label: "Every week" },
  { id: "monthly", label: "Every month" },
] as const;

const fieldCls =
  "rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 px-3 py-2 text-sm " +
  "text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500";

// A number box that lets you type freely and only fixes the value when you leave it.
function NumberField({
  value, min, max, onChange, label,
}: { value: number; min: number; max: number; onChange: (n: number) => void; label: string }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);

  const commit = () => {
    const n = Math.round(Number(text));
    const clean = Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : value;
    setText(String(clean));
    if (clean !== value) onChange(clean);
  };

  return (
    <input
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      value={text}
      aria-label={label}
      onChange={e => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      className={`${fieldCls} w-20 text-center`}
    />
  );
}

function Row({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <div className="min-w-0">
        <p className="text-sm font-medium text-neutral-900 dark:text-white">{title}</p>
        {hint && <p className="text-xs text-neutral-500 dark:text-neutral-400">{hint}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

export default function TasteSettings({ form, onChange }: Props) {
  const strictness = STRICTNESS.find(s => s.exact === form.exactThreshold && s.loose === form.looseThreshold)?.id;

  const zones = useMemo(() => {
    const list = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? [];
    return list.includes(form.schedule.timezone) ? list : [form.schedule.timezone, ...list];
  }, [form.schedule.timezone]);

  const setSchedule = (patch: Partial<TasteFields["schedule"]>) => onChange({ schedule: { ...form.schedule, ...patch } });

  const segBtn = (active: boolean) =>
    `flex-1 rounded-lg px-3 py-2 text-sm font-medium transition border ${
      active
        ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-neutral-900 dark:border-white"
        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-500"
    }`;

  return (
    <div className="space-y-6">
      {/* Size */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-sm font-medium text-neutral-900 dark:text-white">Playlist length</p>
          <span className="text-sm font-semibold tabular-nums text-neutral-900 dark:text-white">{form.size} songs</span>
        </div>
        <input
          type="range"
          min={5}
          max={100}
          step={1}
          value={form.size}
          aria-label="Playlist length"
          onChange={e => onChange({ size: Number(e.target.value) })}
          className="w-full h-1 cursor-pointer accent-indigo-500"
        />
      </div>

      {/* Strictness */}
      <div>
        <p className="text-sm font-medium text-neutral-900 dark:text-white mb-1">How closely songs must match</p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
          {strictness ? STRICTNESS.find(s => s.id === strictness)!.hint : "Custom"}
        </p>
        <div className="flex gap-2">
          {STRICTNESS.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => onChange({ exactThreshold: s.exact, looseThreshold: s.loose })}
              className={segBtn(strictness === s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Time windows */}
      <div className="space-y-4">
        <Row title="Counts as “recently played”" hint="Songs you played within this many days">
          <div className="flex items-center gap-2">
            <NumberField value={form.recentDays} min={1} max={365} label="Recent days" onChange={n => onChange({ recentDays: n })} />
            <span className="text-sm text-neutral-500">days</span>
          </div>
        </Row>
        <Row title="Counts as “not heard in a while”" hint="Songs you haven't played for at least this long">
          <div className="flex items-center gap-2">
            <NumberField
              value={form.rediscoverAfterDays}
              min={7}
              max={3650}
              label="Days before a song counts as forgotten"
              onChange={n => onChange({ rediscoverAfterDays: n })}
            />
            <span className="text-sm text-neutral-500">days</span>
          </div>
        </Row>
        <Row title="Most songs by one artist" hint="Keeps the playlist varied">
          <NumberField value={form.maxPerArtist} min={1} max={10} label="Most songs per artist" onChange={n => onChange({ maxPerArtist: n })} />
        </Row>
      </div>

      {/* Schedule */}
      <div className="pt-5 border-t border-neutral-200 dark:border-neutral-800 space-y-4">
        <div>
          <p className="text-sm font-medium text-neutral-900 dark:text-white mb-2">Refresh the playlist</p>
          <div className="flex flex-wrap gap-2">
            {FREQUENCIES.map(f => (
              <button key={f.id} type="button" onClick={() => setSchedule({ frequency: f.id })} className={`${segBtn(form.schedule.frequency === f.id)} min-w-[7rem]`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {form.schedule.frequency !== "manual" && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {form.schedule.frequency === "weekly" && (
                <label className="block">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 block mb-1">Day</span>
                  <select value={form.schedule.weekday} onChange={e => setSchedule({ weekday: Number(e.target.value) })} className={`${fieldCls} w-full`}>
                    {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
                  </select>
                </label>
              )}
              <label className="block">
                <span className="text-xs text-neutral-500 dark:text-neutral-400 block mb-1">Time</span>
                <select value={form.schedule.hour} onChange={e => setSchedule({ hour: Number(e.target.value) })} className={`${fieldCls} w-full`}>
                  {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>)}
                </select>
              </label>
              <label className="block sm:col-span-1">
                <span className="text-xs text-neutral-500 dark:text-neutral-400 block mb-1">Time zone</span>
                <select value={form.schedule.timezone} onChange={e => setSchedule({ timezone: e.target.value })} className={`${fieldCls} w-full`}>
                  {zones.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button type="button" onClick={() => setSchedule({ mode: "replace" })} className={`${segBtn(form.schedule.mode === "replace")} text-left`}>
                Update the same playlist
              </button>
              <button type="button" onClick={() => setSchedule({ mode: "new" })} className={`${segBtn(form.schedule.mode === "new")} text-left`}>
                Make a new one each time
              </button>
            </div>
          </>
        )}

        <div className="flex items-start gap-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-800 px-3 py-2.5">
          <IconInfoCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-neutral-400" />
          <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
            Automatic refreshing isn&apos;t switched on yet. Your choice is saved and will start working once it is. Until
            then, use <span className="font-medium">Make playlist</span> whenever you want a fresh one.
          </p>
        </div>
      </div>
    </div>
  );
}