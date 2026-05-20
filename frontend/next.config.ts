import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    // Ensure Turbopack treats the frontend folder as the workspace root
    root: ".",
  },
};

export default nextConfig;
