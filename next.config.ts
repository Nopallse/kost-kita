import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(process.env.VERCEL
    ? {}
    : { outputFileTracingRoot: path.join(__dirname) }),
};

export default nextConfig;
