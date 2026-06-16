import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["lib/music-prompt/**/*.test.ts"],
    environment: "node",
  },
});
