/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@careerpilot/shared"],
  // Local dev: forward /api to the gateway so the browser stays same-origin (httpOnly cookies just work).
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.GATEWAY_URL}/api/:path*`,
      },
    ];
  },
  experimental: { proxyTimeout: 120000 },
};

module.exports = nextConfig;
