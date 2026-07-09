import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "./",
  test: {
    environment: "jsdom",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/domain/**/*.ts", "src/data/**/*.ts", "src/platform/**/*.ts"],
    },
  },
});
