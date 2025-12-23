"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  IconMusic,
  IconEye,
  IconEyeOff,
  IconCamera,
} from "@tabler/icons-react";
import clsx from "clsx";
import { useMutation } from "@tanstack/react-query";
import { signupUser, SignupData } from "@/lib/TanStackQuery/authQueries/signupUser";
import { uploadImage } from "@/lib/firebase/uploadImage"; // Firebase upload function
import { queryClient } from "@/lib/TanStackQuery/queryClient";

export default function SignupPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);

  function passwordStrength(pw: string) {
    let score = 0;
    if (pw.length >= 6) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  }

  const strength = passwordStrength(password);

    const mutation = useMutation({
      mutationFn: (data: SignupData) => signupUser(data),

      onSuccess: (data) => {
        // 🔥 hydrate current user cache
        queryClient.setQueryData(["current-user"], data.user);

        setSuccessMessage("Account created successfully.");
        setUsername("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setProfileImage(null);
        setProfilePreview(null);
        setPasswordError(null);
      },
    });


  const handleSignup = async () => {
    setPasswordError(null);
    setSuccessMessage(null);

    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    if (strength < 2) {
      setPasswordError(
        "Password must be at least 6 characters and include a capital letter or symbol."
      );
      return;
    }

    let profileImageUrl: string;

    // If user uploaded an image, upload it to Firebase and get real URL
    if (profileImage) {
      try {
        profileImageUrl = await uploadImage(profileImage);
      } catch (err) {
        setPasswordError("Failed to upload profile image");
        return;
      }
    } else {
      // Default placeholder
      profileImageUrl = "/userAvatar.webp";
    }

    mutation.mutate({
      username,
      email,
      password,
      profileImageUrl,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black to-zinc-900 text-white p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Card className="bg-zinc-950/60 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-xl">
          <CardContent className="space-y-5 p-6">
            <div className="flex items-center justify-center gap-3">
              <IconMusic className="w-8 h-8 text-purple-400" />
              <h1 className="text-2xl font-semibold">MyApplicationMuted</h1>
            </div>

            {/* Profile Image */}
            <div className="flex flex-col items-center gap-2">
              <label className="relative cursor-pointer group">
                <img
                  src={profilePreview || "/userAvatar.webp"}
                  className="h-24 w-24 rounded-full object-cover border border-zinc-700"
                  alt="Profile preview"
                />
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition">
                  <IconCamera className="w-6 h-6 text-white" />
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setProfileImage(e.target.files[0]);
                      setProfilePreview(URL.createObjectURL(e.target.files[0])); // local preview only
                    }
                  }}
                />
              </label>
              <p className="text-xs text-zinc-400">Optional profile image</p>
            </div>

            {/* Feedback */}
            {successMessage && (
              <p className="text-green-400 text-sm text-center">{successMessage}</p>
            )}
            {mutation.isError && (
              <p className="text-red-500 text-sm text-center">
                {(mutation.error as Error).message}
              </p>
            )}

            {/* Form */}
            <div className="space-y-3">
              {passwordError && <p className="text-red-500 text-sm">{passwordError}</p>}

              <div>
                <Label className="text-zinc-400 mb-1 block text-sm">Username</Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-zinc-900/60 border-zinc-700"
                />
              </div>

              <div>
                <Label className="text-zinc-400 mb-1 block text-sm">Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-zinc-900/60 border-zinc-700"
                />
              </div>

              <div className="relative">
                <Label className="text-zinc-400 mb-1 block text-sm">Password</Label>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-zinc-900/60 border-zinc-700 pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <IconEyeOff /> : <IconEye />}
                </button>

                <div className="flex gap-1 mt-2">
                  {[1, 2, 3].map((lvl) => (
                    <div
                      key={lvl}
                      className={clsx(
                        "h-1 flex-1 rounded",
                        strength >= lvl
                          ? lvl === 1
                            ? "bg-red-500"
                            : lvl === 2
                            ? "bg-yellow-500"
                            : "bg-green-500"
                          : "bg-zinc-700"
                      )}
                    />
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-zinc-400 mb-1 block text-sm">Confirm Password</Label>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-zinc-900/60 border-zinc-700"
                />
              </div>

              <Button
                className="w-full bg-purple-600 hover:bg-purple-700 rounded-xl"
                onClick={handleSignup}
                disabled={mutation.isPending || !!successMessage}
              >
                {mutation.isPending ? "Creating account..." : "Sign Up"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
