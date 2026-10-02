import { Schema, model, models } from "mongoose";

const UserSchema = new Schema({
  // Link to the Clerk account. Clerk owns identity (password, sessions, email verification).
  clerkId: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },

  // App-owned profile data. profileImageUrl is set during onboarding and is
  // NOT overwritten by the Clerk webhook.
  profileImageUrl: { type: String, default: null },
  onboarded: { type: Boolean, default: false },

  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },

  isActive: { type: Boolean, default: true },
  emailVerified: { type: Boolean, default: false },
  lastLoginAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

const User = models.User || model("User", UserSchema);
export default User;
