import { LOCKED } from "@r_masseater/msch/locked-inputs";
import { defineConfig } from "vite-plus";

import { fumx } from "./src/app/vite.ts";

export default defineConfig({
  plugins: [fumx()],
  run: {
    tasks: {
      typecheck: "tsc --runExternalCode",
      test: { command: "vp test run", cache: LOCKED },
      build: { command: "vp pack", cache: LOCKED },
      verify: { command: [], dependsOn: ["typecheck", "test", "build"] },
    },
  },
  pack: [
    {
      entry: {
        "convert-midi": "src/features/convert-midi/index.ts",
        vite: "src/app/vite.ts",
      },
      platform: "node",
      sourcemap: true,
      publint: { strict: true },
      tsconfig: "tsconfig.build.json",
      dts: true,
    },
    {
      entry: {
        mapper: "src/app/mapper.ts",
        "fumx-language-server": "bin/fumx-language-server.ts",
        "midi-to-fumx": "bin/midi-to-fumx.ts",
        "song-report": "bin/song-report.ts",
      },
      platform: "node",
      sourcemap: true,
      dts: false,
    },
  ],
  test: {
    include: ["src/**/*.test.ts"],
  },
});
