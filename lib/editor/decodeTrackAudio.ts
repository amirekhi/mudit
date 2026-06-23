import { extractPeaks } from "@/util/extractPeaks";

export async function decodeTrackAudio(
  url: string
): Promise<{ buffer: AudioBuffer; peaks: number[] }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch audio (${response.status}): ${url}`);
  }
  const arrayBuffer = await response.arrayBuffer();

  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  const ctx = new AudioContextClass();

  let buffer: AudioBuffer;
  try {
    buffer = await ctx.decodeAudioData(arrayBuffer);
  } finally {
    ctx.close();
  }

  const minMax = extractPeaks(buffer, 2000); // [min0,max0,min1,max1,...]
  const peaks: number[] = [];
  for (let i = 1; i < minMax.length; i += 2) {
    peaks.push(minMax[i]); // simplified single-value-per-pixel using the max
  }

  return { buffer, peaks };
}