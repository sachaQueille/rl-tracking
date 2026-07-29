import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Mongo driver has optional native deps; keep it out of the bundler.
  serverExternalPackages: ["mongodb"],
};

export default nextConfig;
