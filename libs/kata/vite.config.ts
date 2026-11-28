import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: { index: "src/app/index.ts", cli: "bin/kata.ts" },
    platform: "node",
    sourcemap: true,
    dts: { generator: "tsgo" },
    publint: { strict: true },
  },
  test: { include: ["src/**/*.test.ts"], testTimeout: 60_000 },
});
