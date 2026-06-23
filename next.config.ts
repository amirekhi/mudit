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
};

export default nextConfig;