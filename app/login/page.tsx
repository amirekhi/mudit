"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { IconMusic, IconEye, IconEyeOff } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { loginUser, LoginInput } from "@/lib/TanStackQuery/authQueries/loginUser";
import { queryClient } from "@/lib/TanStackQuery/queryClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BackButton from "@/components/basics/BackButton";
import ThemeToggle from "@/components/basics/ThemeToggle";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const { mutate, isPending, isError, error } = useMutation({
    mutationFn: (input: LoginInput) => loginUser(input),
    onSuccess: (data) => {
      queryClient.setQueryData(["current-user"], data.user);
      queryClient.resetQueries({ queryKey: ["playlists", "me"] });
      queryClient.resetQueries({ queryKey: ["user-tracks"] });
      router.push("/");
    },
  });

  return (
    <div className="min-h-screen overflow-x-hidden flex items-center justify-center
      bg-gradient-to-b from-neutral-100 to-white dark:from-black dark:to-zinc-900 px-4 py-10 transition-colors">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-sm"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white">Sign in</h1>
            <p className="text-sm text-neutral-500 dark:text-zinc-400 mt-0.5">Welcome back</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <BackButton />
          </div>
        </div>

        <div className="bg-white/80 dark:bg-zinc-950/60 backdrop-blur-xl border
          border-neutral-200 dark:border-zinc-800
          rounded-2xl shadow-xl p-6 sm:p-8 space-y-5">

          <div className="flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-2">
              <IconMusic className="w-7 h-7 text-purple-500 dark:text-purple-400" />
              <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">Mudit</h1>
            </div>
            <h2 className="text-sm text-neutral-500 dark:text-zinc-400">Sign in to your account</h2>
          </div>

          {isError && (
            <p className="text-red-500 dark:text-red-400 text-sm text-center">{(error as Error).message}</p>
          )}

          <div className="space-y-3">
            <div>
              <Label className="text-neutral-500 dark:text-zinc-400 text-xs mb-1 block">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="bg-white dark:bg-zinc-900/60 border-neutral-200 dark:border-zinc-700 rounded-xl h-10 text-sm"
              />
            </div>

            <div>
              <Label className="text-neutral-500 dark:text-zinc-400 text-xs mb-1 block">Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-white dark:bg-zinc-900/60 border-neutral-200 dark:border-zinc-700 pr-10 rounded-xl h-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-zinc-400 hover:text-neutral-700 dark:hover:text-white"
                >
                  {showPassword ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              className="w-full mt-1 bg-purple-600 hover:bg-purple-700 text-white
                rounded-xl h-11 text-sm transition"
              onClick={() => mutate({ email, password })}
              disabled={isPending}
            >
              {isPending ? "Signing in…" : "Login"}
            </Button>

            <p className="text-sm text-center text-neutral-500 dark:text-zinc-400">
              No account?{" "}
              <Link href="/signup" className="text-purple-600 dark:text-purple-400 hover:text-purple-500 dark:hover:text-purple-300 font-medium">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}