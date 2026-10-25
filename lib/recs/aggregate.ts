// Turns mood evidence ("signals") from any source into the per-track mood
// scores the generator reads. New sources (votes, an API, an AI agent) only
// need to write signals; nothing else changes.

export type SignalSource = "manual" | "uploader" | "vote" | "lastfm" | "llm" | "audio" | "agent";

/** How much each kind of evidence is trusted. Tune freely. */
export const SOURCE_WEIGHT: Record<SignalSource, number> = {
  manual: 1.0,   // an admin set it by hand
  uploader: 0.8, // the person who uploaded the track
  audio: 0.7,    // analysis of the audio itself
  lastfm: 0.6,   // crowd tags from a third party
  llm: 0.5,      // inferred from title/artist/lyrics
  agent: 0.5,    // tagged by an AI agent
  vote: 0.25,    // one listener's vote (many votes add up)
};

export interface MoodSignal {
  moodSlug: string;
  source: SignalSource;
  /** 1 = "fits this mood", 0 = "doesn't". Fractions are fine. */
  value: number;
  /** How sure the source is (0 to 1). Defaults to 1. */
  confidence?: number;
}

export interface MoodScore {
  slug: string;
  score: number;
}

/**
 * Weighted average of the evidence, pulled slightly toward zero so a single
 * weak signal can't produce a confident score. More agreeing sources push the
 * score up; disagreeing ones pull it down.
 */
export function aggregateMoods(
  signals: MoodSignal[],
  opts: { prior?: number; minScore?: number; max?: number } = {}
): MoodScore[] {
  const { prior = 0.3, minScore = 0.15, max = 8 } = opts;

  const sums = new Map<string, { num: number; den: number }>();
  for (const s of signals) {
    const w = SOURCE_WEIGHT[s.source] * (s.confidence ?? 1);
    const value = Math.min(1, Math.max(0, s.value));
    const entry = sums.get(s.moodSlug) ?? { num: 0, den: 0 };
    entry.num += w * value;
    entry.den += w;
    sums.set(s.moodSlug, entry);
  }

  return [...sums.entries()]
    .map(([slug, { num, den }]) => ({ slug, score: Math.round((num / (den + prior)) * 100) / 100 }))
    .filter(m => m.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, max);
}