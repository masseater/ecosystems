import { definePlugin } from "#/entities/rule/index.ts";
import type { I68Config, Plugin } from "#/shared/config/index.ts";

import { namedProgression } from "./named.ts";

export const progressionsPlugin: Plugin = definePlugin({
  rules: { named: namedProgression },
});

export const progressions = (): I68Config => ({
  plugins: { progressions: progressionsPlugin },
  rules: { "progressions/named": "warn" },
});
