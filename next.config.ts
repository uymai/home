import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
