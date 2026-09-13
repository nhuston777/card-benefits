import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Screenshot uploads: a handful of phone screenshots, compressed in the
      // browser to ~300KB each before they're sent.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
