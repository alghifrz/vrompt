import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vrompt generates AGENTS.md as product output. Do not let Next overwrite a root copy.
  agentRules: false,
};

export default nextConfig;
