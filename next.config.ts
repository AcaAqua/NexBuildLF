import type { NextConfig } from "next";
import path from "node:path";

const projectRoot = path.resolve(process.cwd());

const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  buildExcludes: [/app-build-manifest\.json$/],
});

const nextConfig: NextConfig = {
  output: "export",
  outputFileTracingRoot: projectRoot,
  images: {
    unoptimized: true,
  },
  reactStrictMode: false,
};

export default withPWA(nextConfig);
