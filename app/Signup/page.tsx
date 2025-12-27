"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { useMutation } from "@tanstack/react-query";

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

import {
  signupUser,
  SignupData,
} from "@/lib/TanStackQuery/authQueries/signupUser";
import { uploadImage } from "@/lib/firebase/uploadImage";
import { queryClient } from "@/lib/TanStackQuery/queryClient";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const router = useRouter();

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
      queryClient.setQueryData(["current-user"], data.user);

      setSuccessMessage("Account created successfully.");
      setUsername("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setProfileImage(null);
      setProfilePreview(null);
      setPasswordError(null);
      console.log("Signup successful:", data.user);
      router.push("/");
    },
  });

  const handleSignup = async () => {
    setPasswordError(null);
    setSuccessMessage(null);

    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    if (strength < 2) {
      setPasswordError(
        "Password must be at least 6 characters and include a capital letter or symbol."
      );
      return;
    }

    let profileImageUrl = "/userAvatar.webp";

    if (profileImage) {
      try {
        profileImageUrl = await uploadImage(profileImage);
      } catch {
        setPasswordError("Failed to upload profile image.");
        return;
      }
    }

    mutation.mutate({
      username,
      email,
      password,
      profileImageUrl,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black via-zinc-950 to-zinc-900 text-white px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <Card className="bg-zinc-950/70 backdrop-blur-xl border border-zinc-800 rounded-3xl shadow-2xl">
          <CardContent className="p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-3">
                <IconMusic className="w-8 h-8 text-purple-400" />
                <h1 className="text-2xl font-semibold tracking-tight">
                  MyApplicationMuted
                </h1>
              </div>
              <p className="text-sm text-zinc-400">
                Create your account
              </p>
            </div>

            {/* Profile Image */}
            <div className="flex flex-col items-center gap-3">
              <label className="relative cursor-pointer group">
                <img
                  src={profilePreview || "/userAvatar.webp"}
                  alt="Profile"
                  className="h-24 w-24 rounded-full object-cover border border-zinc-700 transition group-hover:opacity-80"
                />
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition">
                  <IconCamera className="w-6 h-6" />
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setProfileImage(e.target.files[0]);
                      setProfilePreview(
                        URL.createObjectURL(e.target.files[0])
                      );
                    }
                  }}
                />
              </label>
              <span className="text-xs text-zinc-400">
                Optional profile image
              </span>
            </div>

            {/* Feedback */}
            {successMessage && (
              <p className="text-green-400 text-sm text-center">
                {successMessage}
              </p>
            )}

            {mutation.isError && (
              <p className="text-red-500 text-sm text-center">
                {(mutation.error as Error).message}
              </p>
            )}

            {passwordError && (
              <p className="text-red-500 text-sm text-center">
                {passwordError}
              </p>
            )}

            {/* Form */}
            <div className="space-y-4">
              <div>
                <Label className="text-zinc-400 text-sm">Username</Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 bg-zinc-900/60 border-zinc-700 rounded-xl"
                />
              </div>

              <div>
                <Label className="text-zinc-400 text-sm">Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 bg-zinc-900/60 border-zinc-700 rounded-xl"
                />
              </div>

              {/* Password */}
              <div>
                <Label className="text-zinc-400 text-sm">Password</Label>
                <div className="relative mt-1">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-zinc-900/60 border-zinc-700 pr-10 rounded-xl"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <IconEyeOff /> : <IconEye />}
                  </button>
                </div>

                {/* Strength */}
                <div className="flex gap-1 mt-2">
                  {[1, 2, 3].map((lvl) => (
                    <div
                      key={lvl}
                      className={clsx(
                        "h-1 flex-1 rounded-full transition",
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
                <Label className="text-zinc-400 text-sm">
                  Confirm Password
                </Label>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 bg-zinc-900/60 border-zinc-700 rounded-xl"
                />
              </div>

              <Button
                onClick={handleSignup}
                disabled={mutation.isPending || !!successMessage}
                className="w-full mt-2 bg-purple-600 hover:bg-purple-700 rounded-xl h-11 transition"
              >
                {mutation.isPending ? "Creating account..." : "Sign Up"}
              </Button>
              <p className="text-sm text-center text-zinc-400 mt-3">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-purple-400 hover:text-purple-300 transition font-medium"
                >
                  Log in
                </Link>
              </p>

            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
