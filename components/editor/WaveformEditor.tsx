"use client";

import { useState, useEffect } from "react";
import WavesurferPlayer from "@wavesurfer/react";
import { Track } from "@/store/useAudioStore";
import WaveSurfer from "wavesurfer.js";
import { getDownloadURL, ref } from "firebase/storage";
import { storage } from "@/lib/firebase/firebase";


interface WaveformEditorProps {
  track: Track;
}

export default function WaveformEditor({ track }: WaveformEditorProps) {
  const [wavesurfer, setWavesurfer] = useState<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackUrl, setTrackUrl] = useState<string>(""); // store Firebase URL
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Reset states on track change
    setIsPlaying(false);
    setWavesurfer(null);
    setLoading(true);

    // Get Firebase download URL
    const trackRef = ref(storage, track.url); // track.url = storage path, e.g., 'tracks/OLD-DAYS.mp3'
    getDownloadURL(trackRef)
      .then((url) => {
        setTrackUrl(url);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to get track URL:", err);
        setLoading(false);
      });
  }, [track._id]);

  const togglePlay = () => {
    if (wavesurfer) {
      wavesurfer.playPause();
      setIsPlaying(!isPlaying);
    }
  };

  const handleReady = (ws: WaveSurfer) => {
    setWavesurfer(ws);
    setIsPlaying(false);
  };

  return (
    <div className="space-y-2">
      {trackUrl && (
        <WavesurferPlayer
          url={trackUrl} // Use Firebase download URL
          height={140}
          waveColor="#444"
          progressColor="#6366f1"
          cursorColor="#fff"
          onReady={handleReady}
          onError={(e) => console.error("WaveSurfer error:", e)}
        />
      )}

      {loading && <p>Loading waveform...</p>}

      <button
        onClick={togglePlay}
        disabled={loading || !wavesurfer}
        className="px-4 py-2 bg-indigo-600 text-white rounded"
      >
        {isPlaying ? "Pause" : "Play"}
      </button>
    </div>
  );
}
