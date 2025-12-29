import { Track } from "@/store/useAudioStore";
import { EditorTrack } from "@/types/editorTypes";


export function trackToEditorTrack(track: Track): EditorTrack {
  return {
    id: track._id,
    source: track,

    regions: [
      {
        id: crypto.randomUUID(),
        sourceTrackId: track._id, // ✅ FIX
        start: 0,
        end: 0,                  // will be set after audio loads
        offset: 0,
        playbackRate: 1,
        pitch: 0,
      },
    ],

    gain: 1,
    pan: 0,
    muted: false,
  };
}
