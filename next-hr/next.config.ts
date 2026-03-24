import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Monorepo: avoid tracing root from parent lockfile when building from next-hr/
  outputFileTracingRoot: path.join(process.cwd()),
};

export default nextConfig;
