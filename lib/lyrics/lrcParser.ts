export interface LyricLine {
  time: number; // seconds
  text: string;
}

/**
 * Parses standard LRC format text into timestamped lines.
 *
 * Handles:
 * - Standard tags: [00:12.34]Some lyric line
 * - Multiple timestamps on one line (rare but valid LRC — e.g. repeated choruses)
 * - Metadata tags like [ar:], [ti:], [al:], [length:], which are skipped
 *
 * Returns lines sorted by time, ascending.
 */
export function parseLrc(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  const timeTag = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\]/g;
  const metadataTag = /^\[[a-zA-Z]+:.*\]$/;

  for (const rawLine of lrc.split("\n")) {
    const line = rawLine.trim();
    if (!line || metadataTag.test(line)) continue;

    const matches = [...line.matchAll(timeTag)];
    if (matches.length === 0) continue;

    const text = line.replace(timeTag, "").trim();

    for (const match of matches) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const fraction = match[3] ? parseInt(match[3].padEnd(3, "0"), 10) / 1000 : 0;
      const time = minutes * 60 + seconds + fraction;
      lines.push({ time, text });
    }
  }

  return lines.sort((a, b) => a.time - b.time);
}