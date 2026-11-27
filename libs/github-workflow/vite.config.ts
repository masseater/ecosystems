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
    entry: ["src/app/index.ts"],
    platform: "node",
    sourcemap: true,
    publint: { strict: true },
    dts: true,
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
