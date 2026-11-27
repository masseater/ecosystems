import { definePlugin } from "#/entities/rule/index.ts";
import type { I68Config, Plugin } from "#/shared/config/index.ts";

import { parallelPerfects } from "./parallel-perfects.ts";
import { unresolvedDissonance } from "./unresolved-dissonance.ts";

export const classicalPlugin: Plugin = definePlugin({
  rules: {
    "parallel-perfects": parallelPerfects,
    "unresolved-dissonance": unresolvedDissonance,
  },
});

export const classical = (): I68Config => ({
  plugins: { classical: classicalPlugin },
  rules: {
    "classical/parallel-perfects": "warn",
    "classical/unresolved-dissonance": "warn",
  },
});
