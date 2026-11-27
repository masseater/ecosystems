import { pathspecsOf, sectionOf } from "@masseater.dev/lint-host";
import type { PathspecRequest } from "@masseater.dev/lint-host";

import { flattenConfig } from "#/entities/rule/index.ts";
import type { I68Config } from "#/shared/config/index.ts";

export type PathspecInput = PathspecRequest<I68Config>;

export const i68Section = sectionOf<I68Config>({
  name: "i68",
  prepare: flattenConfig,
  fallback: {},
});

export const songPathspecs = pathspecsOf({ defaults: ["*.fumx"] });
