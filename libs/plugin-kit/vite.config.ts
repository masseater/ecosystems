import { library } from "@r_masseater/msch/library";
import { defineConfig } from "vite-plus";

const base = library({ entry: { index: "src/app/index.ts" } });

export default defineConfig({
  ...base,
  pack: { ...base.pack, deps: { alwaysBundle: ["effect"] } },
});
