import type { NextConfig } from "next";

// Static export: the whole site is HTML/CSS/JS at build time, served by nginx on the homelab.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true, // every page is <route>/index.html, which nginx serves without rewrites
  images: { unoptimized: true }, // no image optimisation server in a static export
  poweredByHeader: false,
};

export default nextConfig;
