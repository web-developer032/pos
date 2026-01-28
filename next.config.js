/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable standalone output for Docker
  output: "standalone",
  // Instrumentation is stable in Next 15+ (no experimental flag needed)
};

module.exports = nextConfig;
