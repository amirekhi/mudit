"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useBanners } from "@/hooks/useBanners";
import { useBannerStore, Banner } from "@/store/useTopBannerStore";

export function TopBanner() {
  const banners = useBanners(); // derived banners
  const dismiss = useBannerStore((s) => s.dismiss);

  const [current, setCurrent] = useState<Banner | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  // Pick first banner if none displayed and not closing
  useEffect(() => {
    if (!current && !isClosing && banners.length > 0) {
      setCurrent(banners[0]);
    }
  }, [banners, current, isClosing]);

  if (!current) return null;

  return (
    <AnimatePresence
      onExitComplete={() => {
        if (current) {
          dismiss(current.id); // persist dismissal
        }
        setCurrent(null);
        setIsClosing(false);
      }}
    >
      {!isClosing && (
        <motion.div
          key={current.id}
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="w-full h-[40px] bg-gradient-to-r from-indigo-500 to-purple-500
                     text-white text-sm px-4 rounded-2xl
                     flex items-center justify-between"
        >
          {current.type === "sale" && (
            <span>🎵 Holiday Sale – Get 30% off premium tracks</span>
          )}
          {current.type === "welcome" && (
            <span>Welcome! Sign up to save playlists and upload tracks.</span>
          )}
          {current.type === "announcement" && (
            <span>📢 New feature available! Check it out.</span>
          )}

          <button
            onClick={() => setIsClosing(true)}
            className="ml-4 text-white font-bold"
          >
            ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
