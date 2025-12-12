"use client"
import { useState } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { IconMusic, IconEye, IconEyeOff } from "@tabler/icons-react";
import clsx from "clsx";

export default function SignupPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function passwordStrength(pw: string ) {
    let score = 0;
    if (pw.length >= 6) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  }

  const strength = passwordStrength(password);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black to-zinc-900 text-white p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Card className="bg-zinc-950/60 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-xl p-2">
          <CardContent className="space-y-6 p-6">
            <div className="flex items-center gap-3 justify-center mb-2">
              <IconMusic className="w-8 h-8 text-purple-400" />
              <h1 className="text-2xl font-semibold">MyApplicationMuted</h1>
            </div>

            <h2 className="text-xl font-medium text-center text-zinc-200">
              Create Your Account
            </h2>

            <div className="space-y-4 mt-4">
              <div>
                <Label className="text-sm mb-1 text-zinc-400">Username</Label>
                <Input
                  className="bg-zinc-900/60 border-zinc-700 focus:ring-purple-500"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Your username"
                />
              </div>

              <div>
                <Label className="text-sm mb-1 text-zinc-400">Email</Label>
                <Input
                  className="bg-zinc-900/60 border-zinc-700 focus:ring-purple-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  type="email"
                />
              </div>

              <div className="relative">
                <Label className="text-sm mb-1 text-zinc-400">Password</Label>
                <Input
                  className="bg-zinc-900/60 border-zinc-700 pr-10 focus:ring-purple-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  type={showPassword ? "text" : "password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-zinc-400 hover:text-zinc-200"
                >
                  {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>

                <div className="flex gap-1 mt-2">
                        <div className={clsx("h-1 flex-1 rounded", strength >= 1 ? "bg-red-500" : "bg-zinc-700")}></div>
                        <div className={clsx("h-1 flex-1 rounded", strength >= 2 ? "bg-yellow-500" : "bg-zinc-700")}></div>
                        <div className={clsx("h-1 flex-1 rounded", strength >= 3 ? "bg-green-500" : "bg-zinc-700")}></div>
                </div>
              </div>

              <div>
                <Label className="text-sm mb-1 text-zinc-400">Confirm Password</Label>
                <Input
                  className="bg-zinc-900/60 border-zinc-700 focus:ring-purple-500"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  type={showPassword ? "text" : "password"}
                />
              </div>

              <Button className="w-full mt-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl py-2 text-base">
                Sign Up
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}