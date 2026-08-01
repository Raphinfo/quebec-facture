import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    DATABASE_URL: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_0ty1BsLCrbJd@ep-frosty-firefly-atcdyplj-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  },
};

export default nextConfig;