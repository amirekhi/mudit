export default function ToolPanel({ disabled }: { disabled: boolean }) {
  const btn =
    "w-full px-3 py-2 rounded bg-neutral-900 border border-neutral-800 text-sm hover:bg-neutral-800 disabled:opacity-40";

  return (
    <aside className="w-64 border-l border-neutral-800 p-4 space-y-2">
      <h3 className="text-sm font-semibold mb-2">Tools</h3>

      <button disabled={disabled} className={btn}>✂ Cut</button>
      <button disabled={disabled} className={btn}>⏩ Speed</button>
      <button disabled={disabled} className={btn}>🎚 Pitch</button>
      <button disabled={disabled} className={btn}>🎛 Filters</button>
      <button disabled={disabled} className={btn}>🔁 Loop</button>
    </aside>
  );
}
