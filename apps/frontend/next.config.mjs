/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Proxy /api/* to the backend in dev so the browser avoids CORS during local dev.
    const backend = process.env.BACKEND_URL || 'http://localhost:4000';
    return [{ source: '/api/:path*', destination: `${backend}/:path*` }];
  },
};

export default nextConfig;
