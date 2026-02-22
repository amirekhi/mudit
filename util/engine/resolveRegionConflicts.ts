

export function resolveRegionConflicts(regions: any[]) {
  if (regions.length === 0) return [];

  // Collect all time boundaries
  const boundaries = new Set<number>();

  for (const r of regions) {
    boundaries.add(r.when);
    boundaries.add(r.when + r.duration);
  }

  const times = Array.from(boundaries).sort((a, b) => a - b);

  const result: any[] = [];

  // Build slices between every adjacent boundary
  for (let i = 0; i < times.length - 1; i++) {
    const sliceStart = times[i];
    const sliceEnd = times[i + 1];

    if (sliceEnd <= sliceStart) continue;

    // Find all regions covering this slice
    const covering = regions.filter(r =>
      sliceStart >= r.when &&
      sliceEnd <= r.when + r.duration
    );

    if (covering.length === 0) continue;

    // Priority: child > parent
    const winner =
      covering.find(r => r.parentRegionId) ??
      covering[0];

    const offsetIntoRegion = sliceStart - winner.when;

    result.push({
      ...winner,
      when: sliceStart,
      duration: sliceEnd - sliceStart,
      offset:
        winner.offset +
        offsetIntoRegion * winner.playbackRate,
    });
  }

  return result;
}