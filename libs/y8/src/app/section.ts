import { pathspecsOf, sectionOf } from "@masseater.dev/lint-host";
import type { PathspecRequest } from "@masseater.dev/lint-host";

import { flattenConfig } from "#/entities/rule/index.ts";
import type { Y8Config } from "#/shared/config/index.ts";

export type PathspecInput = PathspecRequest<Y8Config>;

export const y8Section = sectionOf<Y8Config>({
  name: "y8",
  prepare: flattenConfig,
  fallback: {},
});

export const markdownPathspecs = pathspecsOf({ defaults: ["*.md"] });
