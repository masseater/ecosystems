import { Effect, Option, pipe } from "effect";

import {
  at,
  atPath,
  confidence,
  finding,
  persona,
  severity,
} from "#/app/presets/features/audit-workflows/lib/finding.ts";
import { longestTag } from "#/app/presets/features/audit-workflows/lib/github-refs.ts";
import {
  hidden,
  primary,
  withinText,
  withKeys,
} from "#/app/presets/features/audit-workflows/lib/location.ts";
import { draftsIf, withGitHub } from "#/app/presets/features/audit-workflows/lib/online.ts";
import {
  reusableTargetCheck,
  stepTargetCheck,
} from "#/app/presets/features/audit-workflows/lib/uses-targets.ts";
import type { UsesTarget } from "#/app/presets/features/audit-workflows/lib/uses-targets.ts";
import { commitRef } from "#/app/presets/features/audit-workflows/lib/uses.ts";
import type {
  Audit,
  AuditContext,
  Produced,
} from "#/app/presets/features/audit-workflows/model/audit.ts";
import type { FindingDraft } from "#/app/presets/features/audit-workflows/model/finding.ts";

const meta = {
  ident: "stale-action-refs",
  desc: "commit hash does not point to a Git tag",
} as const;

const draft = (target: UsesTarget): FindingDraft =>
  pipe(
    finding(meta),
    confidence("high"),
    severity("low"),
    persona("pedantic"),
    at(hidden(target.location)),
    atPath(target.location, primary, withKeys("uses"), withinText(target.raw)),
  );

const check = (target: UsesTarget, context: AuditContext): Produced =>
  Option.match(commitRef(target.ref), {
    onNone: (): Produced => [],
    onSome: (commit) =>
      withGitHub(context)((client) =>
        Effect.map(longestTag(client)(target.ref)(commit), (tag) =>
          draftsIf(draft(target))(Option.isNone(tag)),
        ),
      ),
  });

const step = stepTargetCheck(check);

export const staleActionRefs: Audit = {
  ...meta,
  step,
  compositeStep: step,
  reusableJob: reusableTargetCheck(check),
};
