import { LOCKED } from "@r_masseater/msch/locked-inputs";
import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      test: { command: "vp test run", cache: LOCKED },
      build: { command: "vp pack", cache: LOCKED },
    },
  },
  pack: {
    entry: {
      index: "src/entities/segment/index.ts",
      mapper: "src/features/map-content/index.ts",
      vite: "src/features/import-content/index.ts",
    },
    platform: "node",
    sourcemap: true,
    publint: { strict: true },
    dts: true,
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
