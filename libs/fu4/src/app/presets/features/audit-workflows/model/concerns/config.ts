import type { Audit } from "#/app/presets/features/audit-workflows/model/audit.ts";
import { dependabotCooldown } from "#/app/presets/features/audit-workflows/model/rules/dependabot-cooldown.ts";
import { dependabotExecution } from "#/app/presets/features/audit-workflows/model/rules/dependabot-execution.ts";
import { insecureUrlScheme } from "#/app/presets/features/audit-workflows/model/rules/insecure-url-scheme.ts";

export const CONFIG: readonly Audit[] = [
  dependabotExecution,
  dependabotCooldown,
  insecureUrlScheme,
];
