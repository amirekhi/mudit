
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "jirzieorhpsvfgndissy.supabase.co",
      },
    ],
  },

  allowedDevOrigins: ["192.168.1.168"],
};

export default nextConfig;