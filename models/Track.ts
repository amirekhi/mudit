import mongoose, { Schema, Types } from "mongoose";

// Cached YouTube match for a track, saved after the first lookup so each
// track only ever costs YouTube API quota once.
export interface TrackYoutube {
  /** The chosen video, or null = we looked and nothing good exists. */
  videoId: string | null;
  /** Length of that video in seconds (used to decide whether we can sync). */
  duration?: number;
  /** When it was looked up. A null videoId is retried after a while. */
  checkedAt?: Date;
  /** "manual" picks are never overwritten or invalidated automatically. */
  source?: "auto" | "manual";
  /** Title/artist the lookup was done for. If the track is renamed these no
   *  longer match, and the match is looked up again. */
  forTitle?: string;
  forArtist?: string;
}

// Combined mood scores for a track (0 to 1), computed from TrackMoodSignal
// rows. Stored on the track itself so recommendation queries stay fast.
export interface TrackMood {
  slug: string;
  score: number;
}

export interface TrackDocument {
  title: string;
  artist: string;
  url: string;
  image?: string;

  ownerId?: Types.ObjectId | null;
  visibility: "public" | "private";

  prev?: Types.ObjectId;
  next?: Types.ObjectId;

  // Optional and additive: existing tracks simply don't have these yet.
  youtube?: TrackYoutube;
  moods?: TrackMood[];
  moodsUpdatedAt?: Date;
}

const TrackYoutubeSchema = new Schema<TrackYoutube>(
  {
    videoId: { type: String, default: null },
    duration: { type: Number },
    checkedAt: { type: Date },
    source: { type: String, enum: ["auto", "manual"], default: "auto" },
    forTitle: { type: String },
    forArtist: { type: String },
  },
  { _id: false }
);

const TrackMoodSchema = new Schema<TrackMood>(
  {
    slug: { type: String, required: true, lowercase: true, trim: true },
    score: { type: Number, required: true, min: 0, max: 1 },
  },
  { _id: false }
);

const TrackSchema = new Schema<TrackDocument>(
  {
    title: { type: String, required: true },
    artist: { type: String, required: true },
    url: { type: String, required: true },
    image: { type: String },

    // ownership
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
    },

    prev: { type: Schema.Types.ObjectId, ref: "Track" },
    next: { type: Schema.Types.ObjectId, ref: "Track" },

    // No defaults: tracks that haven't been looked up / tagged have no field.
    youtube: { type: TrackYoutubeSchema, default: undefined },
    moods: { type: [TrackMoodSchema], default: undefined },
    moodsUpdatedAt: { type: Date },
  },
  {
    timestamps: true,
    collection: "tracks",
  }
);

// "Find tracks tagged with these moods"
TrackSchema.index({ "moods.slug": 1 });

// ✅ THIS LINE IS REQUIRED
export default mongoose.models.Track ||
  mongoose.model<TrackDocument>("Track", TrackSchema);

// Kept here because your original file exported it from this module. If
// DraftTrack also lives in its own file, delete this block.
type DraftTrack = {
  id: string;
  file: File;
  title: string;
  artist: string;
  imageFile?: File;
  imagePreview?: string;
  visibility: "public" | "private";
  selected: boolean;
};
export type { DraftTrack };