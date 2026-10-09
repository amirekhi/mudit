// Placeholder for a carousel section while its data loads, so the home page
// can render immediately and each section fills in on its own instead of
// everything waiting behind one full-screen spinner.

interface Props {
  /** Size/shape of each placeholder card, e.g. "w-40 h-40 rounded-xl". */
  cardClassName?: string;
  count?: number;
}

const BLOCK = "bg-neutral-200 dark:bg-white/10 motion-safe:animate-pulse";

export default function CarouselSkeleton({
  cardClassName = "w-40 h-40 rounded-2xl",
  count = 6,
}: Props) {
  return (
    <div className="w-full" aria-hidden>
      <div className="px-8 flex flex-col gap-2">
        <div className={`h-3 w-16 rounded-full ${BLOCK}`} />
        <div className={`h-6 w-40 rounded-full ${BLOCK}`} />
      </div>
      <div className="flex gap-4 py-4 px-8 max-md:px-2 overflow-hidden">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className={`flex-shrink-0 ${BLOCK} ${cardClassName}`} />
        ))}
      </div>
    </div>
  );
}
