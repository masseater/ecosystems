import BACH_CHORALES from "#/app/presets/features/check-style/data/bach-chorales.json" with { type: "json" };
import type { StyleTable } from "#/app/presets/shared/lib/style-table.ts";
import { definePlugin } from "#/entities/rule/index.ts";
import type { I68Config, Plugin } from "#/shared/config/index.ts";

import { rareTransitionOf } from "./rare-transition.ts";

export const bachPlugin: Plugin = definePlugin({
  rules: { "rare-transition": rareTransitionOf(BACH_CHORALES) },
});

export const bach = (): I68Config => ({
  plugins: { bach: bachPlugin },
  rules: { "bach/rare-transition": "warn" },
});

export const stylePluginOf = (table: StyleTable): Plugin =>
  definePlugin({ rules: { "rare-transition": rareTransitionOf(table) } });
