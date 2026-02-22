/**
 * Extract waveform peaks from an AudioBuffer.
 *
 * Returns a Float32Array structured as:
 * [min0, max0, min1, max1, ...]
 *
 * @param buffer AudioBuffer
 * @param resolution Number of horizontal samples (default: 2000)
 */
export function extractPeaks(
  buffer: AudioBuffer,
  resolution: number = 2000
): Float32Array {
  const channelCount = buffer.numberOfChannels;
  const length = buffer.length;

  if (length === 0) {
    return new Float32Array();
  }

  const blockSize = Math.max(1, Math.floor(length / resolution));

  const peaks = new Float32Array(resolution * 2);

  for (let i = 0; i < resolution; i++) {
    let min = 1.0;
    let max = -1.0;

    const start = i * blockSize;
    const end = Math.min(start + blockSize, length);

    for (let ch = 0; ch < channelCount; ch++) {
      const channelData = buffer.getChannelData(ch);

      for (let j = start; j < end; j++) {
        const sample = channelData[j];

        if (sample < min) min = sample;
        if (sample > max) max = sample;
      }
    }

    peaks[i * 2] = min;
    peaks[i * 2 + 1] = max;
  }

  return peaks;
}
