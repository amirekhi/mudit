import { Mp3Encoder } from "@breezystack/lamejs";

function floatTo16BitPCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output;
}

/**
 * Encodes an AudioBuffer to MP3. It yields to the browser every few seconds of audio, so the
 * page stays responsive and the "Encoding" progress can actually paint. (A Web Worker would be
 * the next step if you need it fully off the main thread.)
 */
export async function audioBufferToMp3(
  buffer: AudioBuffer,
  kbps: number = 192,
  onProgress?: (fraction: number) => void
): Promise<Blob> {
  const channels = Math.min(buffer.numberOfChannels, 2);
  const sampleRate = buffer.sampleRate;
  const encoder = new Mp3Encoder(channels, sampleRate, kbps);

  const left = floatTo16BitPCM(buffer.getChannelData(0));
  const right = channels > 1 ? floatTo16BitPCM(buffer.getChannelData(1)) : left;

  const blockSize = 1152; // required chunk size for lame's encoder
  const blocksPerSlice = 160; // ~4 seconds of audio per slice
  const chunks: Uint8Array[] = [];
  let block = 0;

  for (let i = 0; i < left.length; i += blockSize) {
    const leftChunk = left.subarray(i, i + blockSize);
    const rightChunk = right.subarray(i, i + blockSize);
    const mp3buf = channels > 1 ? encoder.encodeBuffer(leftChunk, rightChunk) : encoder.encodeBuffer(leftChunk);
    if (mp3buf.length > 0) chunks.push(new Uint8Array(mp3buf));

    if (++block % blocksPerSlice === 0) {
      onProgress?.(i / left.length);
      await new Promise<void>(resolve => setTimeout(resolve, 0));
    }
  }

  const final = encoder.flush();
  if (final.length > 0) chunks.push(new Uint8Array(final));
  onProgress?.(1);

  return new Blob(chunks as BlobPart[], { type: "audio/mpeg" });
}
