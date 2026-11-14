// SHARED. Ask in chat before changing.
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Load Photon's SDKs from node_modules at runtime instead of bundling them.
    serverComponentsExternalPackages: ["@photon-ai/api", "spectrum-ts", "@spectrum-ts/core", "@spectrum-ts/imessage"],
  },
};

export default nextConfig;
