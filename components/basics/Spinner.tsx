"use client";

import { motion } from "framer-motion";

interface SpinnerProps {
  size?: number;
  className?: string;
}

export function Spinner({ size = 18, className = "" }: SpinnerProps) {
  return (
    <motion.div
      className={`rounded-full border-2 border-white/30 border-t-white ${className}`}
      style={{ width: size, height: size }}
      animate={{ rotate: 360 }}
      transition={{
        repeat: Infinity,
        duration: 0.8,
        ease: "linear",
      }}
    />
  );
}
