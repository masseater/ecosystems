import { library } from "@r_masseater/msch/library";

export default library({
  entry: {
    index: "src/entities/segment/index.ts",
    mapper: "src/features/map-content/index.ts",
    vite: "src/features/import-content/index.ts",
  },
});
