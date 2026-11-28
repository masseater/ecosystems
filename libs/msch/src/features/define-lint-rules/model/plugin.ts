import { Record as Rec, pipe } from "effect";
import type { Plugin } from "vite-plus/lint/plugins";

import { CODED_RULES } from "./coded-rules.ts";
import { ruleOf } from "./intent-rule.ts";
import { INTENTS } from "./intents.ts";

export const mschLintPlugin: Plugin & { readonly meta: { readonly name: string } } = {
  meta: { name: "msch-lint" },
  rules: {
    ...CODED_RULES,
    ...pipe(INTENTS, Rec.map(ruleOf)),
  },
};
