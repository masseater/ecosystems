import { LOCKED } from "@r_masseater/msch/locked-inputs";
import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      test: { command: "vp test run", cache: LOCKED },
      build: { command: "vp pack", cache: LOCKED },
    },
  },
  pack: [
    {
      entry: { "intent-book": "bin/intent-book.ts" },
      platform: "node",
      sourcemap: true,
      publint: { strict: true },
      dts: false,
      outputOptions: { banner: "#!/usr/bin/env node" },
    },
  ],
  test: { include: ["src/**/*.test.ts"] },
});
