import { parseBlob } from "music-metadata-browser";

export async function getEmbeddedImage(file: File): Promise<Blob | null> {
  try {
    const metadata = await parseBlob(file);
    const picture = metadata.common.picture?.[0];
    if (!picture) return null;

    let arrayBuffer: ArrayBuffer;

    // If it's already an ArrayBuffer, use it
    if (picture.data instanceof ArrayBuffer) {
      arrayBuffer = picture.data;
    } else {
      // If it's a Node.js Buffer, convert to ArrayBuffer
      arrayBuffer = (picture.data.buffer as ArrayBuffer).slice(
        picture.data.byteOffset,
        picture.data.byteOffset + picture.data.byteLength
      );
    }

    const uint8Array = new Uint8Array(arrayBuffer);

    return new Blob([uint8Array], { type: picture.format });
  } catch (err) {
    console.warn("Failed to extract embedded image:", err);
    return null;
  }
}
