import { Track } from "@/store/useAudioStore";
import { EditorTrack } from "@/types/editorTypes";

export function trackToEditorTrack(track: Track): EditorTrack {
  return {
    id: track._id,
    source: track,
    peaks: null,
    // editor-owned runtime state
    duration: 0,
    audioBuffer: null,

    regions: [],

    gain: 1,
    pan: 0,
    muted: false,
    solo: false,
  };
}
