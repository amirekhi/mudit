export type MasterChannel = {
  volume: number; // 0..1
  muted: boolean;
  limiter: {
    enabled: boolean;
    ceiling: number; // 0..1
  };
};