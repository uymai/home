import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

export default withPWA({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        urlPattern: /^\/api\/recipes/,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "recipes-api",
        },
      },
    ],
  },
})({} satisfies NextConfig);
