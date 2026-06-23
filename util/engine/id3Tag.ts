import { ID3Writer } from "browser-id3-writer";

interface TagOptions {
  title: string;
  artist: string;
  coverFile?: File | null;
}

export async function tagMp3(mp3Blob: Blob, opts: TagOptions): Promise<Blob> {
  const arrayBuffer = await mp3Blob.arrayBuffer();
  const writer = new ID3Writer(arrayBuffer);

  writer.setFrame("TIT2", opts.title || "Untitled");
  writer.setFrame("TPE1", [opts.artist || "Unknown Artist"]);

  if (opts.coverFile) {
    const coverBuffer = await opts.coverFile.arrayBuffer();
    writer.setFrame("APIC", {
      type: 3, // "front cover"
      data: coverBuffer,
      description: "Cover",
    });
  }

  writer.addTag();
  return writer.getBlob();
}