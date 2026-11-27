import { pathspecsOf, sectionOf } from "@masseater.dev/lint-host";

import type { WismConfig } from "#/shared/config/index.ts";

export const wismSection = sectionOf<WismConfig>({ name: "wism", fallback: {} });

export const wismPathspecs = pathspecsOf({
  defaults: ["."],
  unowned: [
    ":(exclude,attr:linguist-vendored)",
    ":(exclude,attr:linguist-generated)",
    ":(exclude,attr:linguist-documentation)",
  ],
});
