import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@resvg/resvg-js", "satori", "satori/standalone", "satori/jsx"],
};

export default nextConfig;
