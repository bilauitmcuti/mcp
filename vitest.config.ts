import path from "node:path"

import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
  alias: {
    "cloudflare:workers": path.resolve(import.meta.dirname, "test/cloudflare-workers-stub.ts"),
  },
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
})
