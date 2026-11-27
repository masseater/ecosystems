import { library } from "@r_masseater/msch/library";

export default library({
  entry: {
    index: "src/app/index.ts",
    analysis: "src/app/analysis.ts",
    language: "src/app/language.ts",
  },
  platform: "neutral",
  tasks: {
    grammar: "langium generate",
    "grammar:check": "langium generate && git diff --exit-code -- generated",
    verify: { command: [], dependsOn: ["grammar:check", "test", "build"] },
  },
});
