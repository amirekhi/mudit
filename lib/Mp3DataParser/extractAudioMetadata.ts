import { parseBlob } from "music-metadata-browser";

export type ExtractedAudioMetadata = {
  title: string | null;
  artist: string | null;
  album: string | null;
  genre: string[] | null;
  year: number | null;
  duration: number | null;
  track: { no: number | null; of: number | null } | null;
  disk: { no: number | null; of: number | null } | null;
  image: Blob | null;
};

export async function extractAudioMetadata(
  file: File
): Promise<ExtractedAudioMetadata | null> {
  try {
    const metadata = await parseBlob(file);
    const { common, format } = metadata;

    // ---- IMAGE (same logic as your function) ----
    let image: Blob | null = null;
    const picture = common.picture?.[0];

    if (picture) {
      let arrayBuffer: ArrayBuffer;

      if (picture.data instanceof ArrayBuffer) {
        arrayBuffer = picture.data;
      } else {
        arrayBuffer = (picture.data.buffer as ArrayBuffer).slice(
          picture.data.byteOffset,
          picture.data.byteOffset + picture.data.byteLength
        );
      }

      const uint8Array = new Uint8Array(arrayBuffer);
      image = new Blob([uint8Array], { type: picture.format });
    }

    // ---- METADATA ----
    return {
      title: common.title ?? null,
      artist: common.artist ?? null,
      album: common.album ?? null,
      genre: common.genre ?? null,
      year: common.year ?? null,
      duration: format.duration ?? null,
      track: common.track
        ? {
            no: common.track.no ?? null,
            of: common.track.of ?? null,
          }
        : null,
      disk: common.disk
        ? {
            no: common.disk.no ?? null,
            of: common.disk.of ?? null,
          }
        : null,
      image,
    };
  } catch (err) {
    console.warn("Failed to extract audio metadata:", err);
    return null;
  }
}
