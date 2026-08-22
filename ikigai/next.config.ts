import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cursor Ports View and cloud-agent forwarding may reach the
  // dev server via localhost, 127.0.0.1, or a proxied hostname.
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "*.localhost",
    "*.cursor.sh",
    "*.cursor.com",
  ],
};

export default nextConfig;
