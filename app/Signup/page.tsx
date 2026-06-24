"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { IconMusic, IconEye, IconEyeOff, IconCamera } from "@tabler/icons-react";
import { signupUser, SignupData } from "@/lib/TanStackQuery/authQueries/signupUser";
import { uploadImage } from "@/lib/firebase/uploadImage";
import { queryClient } from "@/lib/TanStackQuery/queryClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BackButton from "@/components/basics/BackButton";

export default function SignupPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const router = useRouter();

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
      router.push("/");
      router.refresh();
    },
  });

  const handleSignup = async () => {
    setPasswordError(null);
    if (password !== confirmPassword) { setPasswordError("Passwords do not match."); return; }
    if (strength < 2) { setPasswordError("Password needs 6+ characters and a capital letter or symbol."); return; }

    let profileImageUrl = "/userAvatar.webp";
    if (profileImage) {
      try { profileImageUrl = await uploadImage(profileImage); }
      catch { setPasswordError("Failed to upload profile image."); return; }
    }
    mutation.mutate({ username, email, password, profileImageUrl });
  };

  return (
    <div className="min-h-full overflow-x-hidden flex items-center justify-center
      bg-gradient-to-b from-black via-zinc-950 to-zinc-900 px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white">Sign up</h1>
            <p className="text-sm text-zinc-400 mt-0.5">Create your account</p>
          </div>
          <BackButton />
        </div>

        <div className="bg-zinc-950/70 backdrop-blur-xl border border-zinc-800 rounded-3xl
          shadow-2xl p-6 sm:p-8 space-y-5">

          <div className="flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-2">
              <IconMusic className="w-7 h-7 text-purple-400" />
              <h1 className="text-xl font-semibold tracking-tight text-white">Mudit</h1>
            </div>
            <p className="text-sm text-zinc-400">Create your account</p>
          </div>

          {/* Profile image */}
          <div className="flex flex-col items-center gap-2">
            <label className="relative cursor-pointer group">
              <img
                src={profilePreview || "/userAvatar.webp"}
                alt="Profile"
                className="h-20 w-20 rounded-full object-cover border border-zinc-700 transition group-hover:opacity-70"
              />
              <div className="absolute inset-0 flex items-center justify-center rounded-full
                bg-black/50 opacity-0 group-hover:opacity-100 transition">
                <IconCamera className="w-5 h-5 text-white" />
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setProfileImage(e.target.files[0]);
                    setProfilePreview(URL.createObjectURL(e.target.files[0]));
                  }
                }}
              />
            </label>
            <span className="text-xs text-zinc-500">Optional profile photo</span>
          </div>

          {mutation.isError && (
            <p className="text-red-400 text-sm text-center">{(mutation.error as Error).message}</p>
          )}
          {passwordError && (
            <p className="text-red-400 text-sm text-center">{passwordError}</p>
          )}

          <div className="space-y-3">
            <div>
              <Label className="text-zinc-400 text-xs mb-1 block">Username</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-zinc-900/60 border-zinc-700 rounded-xl h-10 text-sm"
              />
            </div>

            <div>
              <Label className="text-zinc-400 text-xs mb-1 block">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-zinc-900/60 border-zinc-700 rounded-xl h-10 text-sm"
              />
            </div>

            <div>
              <Label className="text-zinc-400 text-xs mb-1 block">Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-zinc-900/60 border-zinc-700 pr-10 rounded-xl h-10 text-sm"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex gap-1 mt-1.5">
                {[1, 2, 3].map((lvl) => (
                  <div
                    key={lvl}
                    className={clsx("h-1 flex-1 rounded-full transition-colors", {
                      "bg-red-500": strength >= lvl && lvl === 1,
                      "bg-yellow-500": strength >= lvl && lvl === 2,
                      "bg-green-500": strength >= lvl && lvl === 3,
                      "bg-zinc-700": strength < lvl,
                    })}
                  />
                ))}
              </div>
            </div>

            <div>
              <Label className="text-zinc-400 text-xs mb-1 block">Confirm Password</Label>
              <Input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-zinc-900/60 border-zinc-700 rounded-xl h-10 text-sm"
              />
            </div>

            <Button
              onClick={handleSignup}
              disabled={mutation.isPending}
              className="w-full mt-1 bg-purple-600 hover:bg-purple-700 rounded-xl h-11 text-sm transition"
            >
              {mutation.isPending ? "Creating account…" : "Sign Up"}
            </Button>

            <p className="text-sm text-center text-zinc-400">
              Already have an account?{" "}
              <Link href="/login" className="text-purple-400 hover:text-purple-300 font-medium">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}