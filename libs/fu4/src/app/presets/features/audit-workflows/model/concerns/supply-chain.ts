import type { Audit } from "#/app/presets/features/audit-workflows/model/audit.ts";
import { adhocPackages } from "#/app/presets/features/audit-workflows/model/rules/adhoc-packages.ts";
import { archivedUses } from "#/app/presets/features/audit-workflows/model/rules/archived-uses.ts";
import { forbiddenUses } from "#/app/presets/features/audit-workflows/model/rules/forbidden-uses.ts";
import { selfRepository } from "#/app/presets/features/audit-workflows/model/rules/self-repository.ts";
import { superfluousActions } from "#/app/presets/features/audit-workflows/model/rules/superfluous-actions.ts";
import { typosquatUses } from "#/app/presets/features/audit-workflows/model/rules/typosquat-uses.ts";
import { unpinnedImages } from "#/app/presets/features/audit-workflows/model/rules/unpinned-images.ts";
import { unpinnedTools } from "#/app/presets/features/audit-workflows/model/rules/unpinned-tools.ts";
import { unpinnedUses } from "#/app/presets/features/audit-workflows/model/rules/unpinned-uses.ts";

export const SUPPLY_CHAIN: readonly Audit[] = [
  unpinnedUses,
  unpinnedImages,
  unpinnedTools,
  forbiddenUses,
  archivedUses,
  typosquatUses,
  superfluousActions,
  selfRepository,
  adhocPackages,
];
