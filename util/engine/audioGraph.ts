import type { CompiledRegion } from "@/util/compileRegions";
import type { MasterChannel } from "@/types/MasterChannel";

/**
 * ONE place that builds the audio graph. Live playback, the waveform preview and the MP3
 * export all go through scheduleClip() / renderMix(), so they can no longer drift apart
 * (before, the preview ignored fades and none of them knew about reverse or the master).
 */

/* ───────────── reverse (cached per source buffer) ───────────── */

const reversedCache = new WeakMap<AudioBuffer, AudioBuffer>();

export function getReversedBuffer(ctx: BaseAudioContext, buffer: AudioBuffer): AudioBuffer {
  const cached = reversedCache.get(buffer);
  if (cached) return cached;

  const out = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const src = buffer.getChannelData(c);
    const dst = out.getChannelData(c);
    const n = src.length;
    for (let i = 0; i < n; i++) dst[i] = src[n - 1 - i];
  }
  reversedCache.set(buffer, out);
  return out;
}

/* ───────────── master chain: volume/mute -> soft limiter ───────────── */

// The shaper's input is scaled by 1/HEADROOM so sums up to +6 dBFS still hit the curve
// instead of being hard-clipped at the shaper's edge.
const HEADROOM = 2;
const CURVE_SIZE = 4097;
const SAFETY_CEILING = 0.98;

/** Linear below the knee, then smoothly saturates towards `ceiling`. */
function softLimit(x: number, ceiling: number) {
  const knee = ceiling * 0.85;
  const a = Math.abs(x);
  if (a <= knee) return x;
  const y = knee + (ceiling - knee) * Math.tanh((a - knee) / (ceiling - knee));
  return x < 0 ? -y : y;
}

function makeCurve(ceiling: number | null) {
  const curve = new Float32Array(CURVE_SIZE);
  for (let i = 0; i < CURVE_SIZE; i++) {
    const u = (i / (CURVE_SIZE - 1)) * 2 - 1; // shaper input, -1..1
    const x = u * HEADROOM;                   // real signal level
    curve[i] = ceiling === null ? x : softLimit(x, ceiling);
  }
  return curve;
}

export interface MasterChain {
  gain: GainNode;          // everything is connected to this
  shaper: WaveShaperNode;  // soft limiter (identity curve when the limiter is off)
  curveKey: string;
}

export function createMasterChain(ctx: BaseAudioContext): MasterChain {
  const gain = ctx.createGain();
  const shaper = ctx.createWaveShaper();
  gain.connect(shaper);
  shaper.connect(ctx.destination);
  return { gain, shaper, curveKey: "" };
}

export function applyMasterParams(
  chain: MasterChain,
  ctx: BaseAudioContext,
  master: MasterChannel | null,
  opts: { safetyLimiter?: boolean; smooth?: boolean } = {}
) {
  const volume = master ? (master.muted ? 0 : master.volume) : 1;

  let ceiling: number | null = master?.limiter?.enabled ? master.limiter.ceiling : null;
  if (ceiling === null && opts.safetyLimiter) ceiling = SAFETY_CEILING;

  const level = volume / HEADROOM;
  if (opts.smooth) chain.gain.gain.setTargetAtTime(level, ctx.currentTime, 0.015);
  else chain.gain.gain.value = level;

  const key = ceiling === null ? "off" : ceiling.toFixed(3);
  if (key !== chain.curveKey) {
    chain.shaper.curve = makeCurve(ceiling);
    chain.shaper.oversample = ceiling === null ? "none" : "2x";
    chain.curveKey = key;
  }
}

/* ───────────── one clip -> nodes ───────────── */

export interface ClipHandle {
  stop(): void;
}

/**
 * Schedules one compiled clip. `t0` is the context time that corresponds to the start of the
 * play window; the clip starts at t0 + r.when.
 */
export function scheduleClip(
  ctx: BaseAudioContext,
  r: CompiledRegion,
  dest: AudioNode,
  t0: number
): ClipHandle {
  const source = ctx.createBufferSource();
  const buffer = r.reverse ? getReversedBuffer(ctx, r.buffer) : r.buffer;
  source.buffer = buffer;
  source.playbackRate.value = r.playbackRate;

  // `duration` is in buffer time. On the timeline the clip lasts duration / playbackRate,
  // and the fade-out has to be placed against THAT (it used the buffer duration before).
  const timelineDur = r.timelineDuration ?? r.duration / r.playbackRate;
  const start = t0 + r.when;
  const end = start + timelineDur;

  const gain = ctx.createGain();
  const fadeIn = Math.min(Math.max(r.fadeIn ?? 0, 0), timelineDur);
  const fadeOut = Math.min(Math.max(r.fadeOut ?? 0, 0), timelineDur);

  if (fadeIn > 0) {
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(r.gain, start + fadeIn);
  } else {
    gain.gain.setValueAtTime(r.gain, start);
  }
  if (fadeOut > 0) {
    const fadeStart = Math.max(end - fadeOut, start + fadeIn);
    gain.gain.setValueAtTime(r.gain, fadeStart);
    gain.gain.linearRampToValueAtTime(0, end);
  }

  const pan = ctx.createStereoPanner();
  pan.pan.value = r.pan;

  source.connect(gain);
  gain.connect(pan);
  pan.connect(dest);

  // A reversed buffer maps source time [o, o + d] to [bufferDuration - (o + d), bufferDuration - o]
  const offset = r.reverse ? Math.max(0, buffer.duration - (r.offset + r.duration)) : r.offset;
  source.start(start, offset, r.duration);

  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    try { source.disconnect(); } catch {}
    try { gain.disconnect(); } catch {}
    try { pan.disconnect(); } catch {}
  };

  // Free the nodes when the clip finishes (not needed, and skipped, for offline renders)
  if (!(ctx instanceof OfflineAudioContext)) source.onended = dispose;

  return {
    stop() {
      source.onended = null;
      try { source.stop(); } catch {}
      dispose();
    },
  };
}

/* ───────────── offline render (export + waveform preview) ───────────── */

export interface RenderMixOptions {
  sampleRate?: number;
  /** Route through the master chain (volume, mute, limiter). Preview renders skip it. */
  useMaster?: boolean;
  master?: MasterChannel | null;
  /** Soft-limit at 0.98 even if the master limiter is off (stops clipping on export). */
  safetyLimiter?: boolean;
}

export async function renderMix(
  compiled: CompiledRegion[],
  duration: number,
  opts: RenderMixOptions = {}
): Promise<AudioBuffer> {
  const sampleRate = opts.sampleRate ?? 44100;
  const length = Math.max(1, Math.ceil(sampleRate * duration));
  const offline = new OfflineAudioContext(2, length, sampleRate);

  let dest: AudioNode = offline.destination;
  if (opts.useMaster) {
    const chain = createMasterChain(offline);
    applyMasterParams(chain, offline, opts.master ?? null, { safetyLimiter: opts.safetyLimiter });
    dest = chain.gain;
  }

  for (const r of compiled) scheduleClip(offline, r, dest, 0);
  return offline.startRendering();
}
