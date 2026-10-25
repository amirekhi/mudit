import { useAudioStore, type Track } from "@/store/useAudioStore";

/**
 * Plays a list of songs one after another.
 *
 * This keeps its own queue and moves to the next song when one finishes. It
 * works with the existing player as it is, but the player's Next / Previous
 * buttons don't know about this queue. Once they're connected to the playlist
 * store, only this file needs to change.
 */

let queue: Track[] = [];
let position = -1;

function playAt(index: number) {
  if (index < 0 || index >= queue.length) return;
  position = index;
  const track = queue[index];

  useAudioStore.getState().playTrack(track);

  // Each song is its own Howl. If something else starts playing, this one is
  // unloaded and never fires "end", so the queue stops by itself.
  useAudioStore.getState().howl?.once("end", () => {
    if (queue[position]?._id === track._id) playAt(position + 1);
  });
}

export function playQueue(tracks: Track[], startAt = 0) {
  queue = tracks;
  playAt(startAt);
}

export function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}