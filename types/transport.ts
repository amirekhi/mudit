export interface TransportState {
  time: number;        // seconds
  isPlaying: boolean;
  rate: number;  // playback rate
  pxPerSecond: number;      
  syncedTrackIds: Set<string>;
  duration: number;   // project duration (max track length)
}