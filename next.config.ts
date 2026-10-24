import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/finaglings/hawkins-legion-darts",
        destination: "/finaglings/hawkins-legion-darts.html",
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/recipes",
        destination: "https://grimoire.uymai.net",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
