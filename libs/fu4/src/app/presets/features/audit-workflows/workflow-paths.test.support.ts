import { baseName, parent } from "@masseater.dev/path-kit";
import { String as Str } from "effect";

import type { InputKind } from "#/shared/config/index.ts";

export const kindOf = (path: string): InputKind => {
  const base = baseName(path);
  if (Str.endsWith(".github/workflows")(parent(path))) {
    return "workflow";
  }
  if (base === "action.yml" || base === "action.yaml") {
    return "action";
  }
  if (base === "dependabot.yml" || base === "dependabot.yaml") {
    return "dependabot";
  }
  if (Str.startsWith(".pre-commit-")(base)) {
    return "pre-commit";
  }
  return "workflow";
};

export const isAuditable = (path: string): boolean => {
  const base = baseName(path);
  return (
    Str.endsWith(".github/workflows")(parent(path)) ||
    base === "action.yml" ||
    base === "action.yaml" ||
    base === ".pre-commit-config.yaml" ||
    ((base === "dependabot.yml" || base === "dependabot.yaml") &&
      Str.endsWith(".github")(parent(path)))
  );
};
