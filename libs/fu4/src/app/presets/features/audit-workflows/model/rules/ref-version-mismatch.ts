import { Option } from "effect";

import { isLocked } from "#/app/presets/features/audit-workflows/lib/lock.ts";
import { onlineCheck } from "#/app/presets/features/audit-workflows/lib/online.ts";
import {
  reusableTargetCheck,
  stepTargetCheck,
} from "#/app/presets/features/audit-workflows/lib/uses-targets.ts";
import { commitRef, refSlug } from "#/app/presets/features/audit-workflows/lib/uses.ts";
import type { Audit } from "#/app/presets/features/audit-workflows/model/audit.ts";

import { audited, meta } from "./ref-version-mismatch-drafts.ts";
import { commentState } from "./ref-version-mismatch-parts.ts";

const check = onlineCheck((target) =>
  Option.all([refSlug(target.ref), commitRef(target.ref), commentState(target)]),
)(({ client, found: [slug, commit, state], target }) =>
  audited({ target, client, slug: slug.full, commit })(state),
);

const steps = stepTargetCheck(check);

export const refVersionMismatch: Audit = {
  ...meta,
  step: (view, context) => {
    if (isLocked(context.project)(view.input.path)) {
      return [];
    }
    return steps(view, context);
  },
  compositeStep: steps,
  reusableJob: reusableTargetCheck(check),
};
