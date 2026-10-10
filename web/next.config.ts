import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  // Monorepo: avoid picking the parent lockfile as Turbopack root
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
