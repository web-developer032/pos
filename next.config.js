/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable standalone output for Docker
  output: "standalone",
  // Enable instrumentation hook for database initialization
  experimental: {
    instrumentationHook: true,
  },
};

module.exports = nextConfig;
