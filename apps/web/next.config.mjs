/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@predialops/ds"],
  experimental: {
    typedRoutes: false
  }
};

export default nextConfig;
