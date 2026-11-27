import { pathspecsOf, sectionOf } from "@masseater.dev/lint-host";
import type { PathspecRequest } from "@masseater.dev/lint-host";

import { flattenConfig } from "#/entities/rule/index.ts";
import type { Fu4Config } from "#/shared/config/index.ts";

export type PathspecInput = PathspecRequest<Fu4Config>;

export const fu4Section = sectionOf<Fu4Config>({
  name: "fu4",
  prepare: flattenConfig,
  fallback: {},
});

export const workflowPathspecs = pathspecsOf({
  defaults: [
    ".github/workflows/*.yml",
    ".github/workflows/*.yaml",
    ":(glob)**/action.yml",
    ":(glob)**/action.yaml",
    ".github/dependabot.yml",
    ".github/dependabot.yaml",
    ".pre-commit-config.yaml",
    ".pre-commit-hooks.yaml",
  ],
  unowned: [":(exclude,attr:linguist-vendored)", ":(exclude,attr:linguist-generated)"],
});
