import { baseName } from "@masseater.dev/path-kit";
import { Option, String as Str } from "effect";

import type { InputKind } from "#/shared/config/index.ts";

const WORKFLOWS = ".github/workflows/";
const YAML = /\.ya?ml$/u;
const ACTION = /^action\.ya?ml$/u;
const DEPENDABOT = /^\.github\/dependabot\.ya?ml$/u;
const PRE_COMMIT = /^\.pre-commit-(?:config|hooks)\.yaml$/u;

export const kindOf = (path: string): Option.Option<InputKind> => {
  if (DEPENDABOT.test(path)) {
    return Option.some("dependabot");
  }
  if (PRE_COMMIT.test(path)) {
    return Option.some("pre-commit");
  }
  if (ACTION.test(baseName(path))) {
    return Option.some("action");
  }
  if (Str.includes(WORKFLOWS)(path) && YAML.test(path)) {
    return Option.some("workflow");
  }
  return Option.none();
};
