import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Prévias dos criativos: banners do Google Ads e miniaturas do YouTube.
    remotePatterns: [
      new URL("https://tpc.googlesyndication.com/simgad/**"),
      new URL("https://i.ytimg.com/vi/**"),
    ],
  },
};

export default nextConfig;
