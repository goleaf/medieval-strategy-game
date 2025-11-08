import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"

export default defineConfig({
  test: {
    environment: "node",
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
    coverage: {
      enabled: false,
    },
  },
})
