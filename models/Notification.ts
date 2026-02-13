import mongoose, { Schema, Document, Types } from "mongoose";

export interface INotification extends Document {
  title: string;
  description: string;

  userId: Types.ObjectId;

  isRead: boolean;
  dismissed: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // important for performance
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    dismissed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "notifications",
  }
);

export default mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);
