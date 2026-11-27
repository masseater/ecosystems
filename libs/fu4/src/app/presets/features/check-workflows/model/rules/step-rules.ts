import type { Rule } from "#/shared/config/index.ts";

import { action } from "./action.ts";
import { shellcheck } from "./shellcheck.ts";

export const STEP_RULES: Readonly<Record<string, Rule>> = {
  action,
  shellcheck,
};
