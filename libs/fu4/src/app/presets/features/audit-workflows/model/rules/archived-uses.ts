import { Option, String as Str, pipe } from "effect";

import {
  at,
  confidence,
  finding,
  persona,
  severity,
} from "#/app/presets/features/audit-workflows/lib/finding.ts";
import {
  repoTargetCheck,
  reusableTargetCheck,
  stepTargetCheck,
} from "#/app/presets/features/audit-workflows/lib/uses-targets.ts";
import type { UsesTarget } from "#/app/presets/features/audit-workflows/lib/uses-targets.ts";
import { refSlug } from "#/app/presets/features/audit-workflows/lib/uses.ts";
import type { RepoRef } from "#/app/presets/features/audit-workflows/lib/uses.ts";
import type { Audit, Drafts } from "#/app/presets/features/audit-workflows/model/audit.ts";
import archived from "#/app/presets/shared/data/zizmor/archived-repos.json" with { type: "json" };

const meta = {
  ident: "archived-uses",
  desc: "action or reusable workflow from archived repository",
} as const;

const ARCHIVED: ReadonlySet<string> = new Set(archived);

const isArchived = (ref: RepoRef): boolean =>
  Option.exists(refSlug(ref), (slug) =>
    ARCHIVED.has(`${Str.toLowerCase(slug.owner)}/${Str.toLowerCase(slug.repo)}`),
  );

const check = (target: UsesTarget): Drafts => {
  if (!isArchived(target.ref)) {
    return [];
  }
  return [
    pipe(
      finding(meta),
      confidence("high"),
      severity("medium"),
      persona("regular"),
      at(target.grip),
      at(target.at("repository is archived")),
    ),
  ];
};

const step = stepTargetCheck(check);

export const archivedUses: Audit = {
  ...meta,
  step,
  compositeStep: step,
  reusableJob: reusableTargetCheck(check),
  preCommitRepo: repoTargetCheck(check),
};
