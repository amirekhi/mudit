/**
 * Extract waveform peaks from an AudioBuffer.
 *
 * Returns a Float32Array structured as [min0, max0, min1, max1, ...].
 *
 * To keep this cheap on long buffers, each block looks at roughly 128 samples
 * per channel (evenly strided) instead of every sample. That is plenty for a
 * waveform drawing and makes it far faster than a full scan.
 *
 * @param buffer AudioBuffer
 * @param resolution Number of horizontal samples (default: 2000)
 */
export function extractPeaks(buffer: AudioBuffer, resolution: number = 2000): Float32Array {
  const length = buffer.length;
  if (length === 0) return new Float32Array();

  const channelCount = buffer.numberOfChannels;
  const channels: Float32Array[] = [];
  for (let c = 0; c < channelCount; c++) channels.push(buffer.getChannelData(c));

  const blockSize = Math.max(1, Math.floor(length / resolution));
  const stride = Math.max(1, Math.floor(blockSize / 128));
  const peaks = new Float32Array(resolution * 2);

  for (let i = 0; i < resolution; i++) {
    const start = i * blockSize;
    const end = Math.min(start + blockSize, length);

    let min = Infinity;
    let max = -Infinity;

    for (let ch = 0; ch < channelCount; ch++) {
      const data = channels[ch];
      for (let j = start; j < end; j += stride) {
        const sample = data[j];
        if (sample < min) min = sample;
        if (sample > max) max = sample;
      }
    }

    if (min === Infinity) { min = 0; max = 0; } // empty block
    peaks[i * 2] = min;
    peaks[i * 2 + 1] = max;
  }

  return peaks;
}
