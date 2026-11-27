import { Option } from "effect";

import { containsExpression } from "#/app/presets/entities/workflow/index.ts";
import type { ExecAction } from "#/app/presets/entities/workflow/index.ts";
import { checkLocal } from "#/app/presets/features/check-workflows/lib/action-local.ts";
import type { LocalActionEnv } from "#/app/presets/features/check-workflows/lib/action-local.ts";
import {
  checkDocker,
  checkRepo,
  isDocker,
} from "#/app/presets/features/check-workflows/lib/action-remote.ts";
import { actionOf } from "#/app/presets/features/check-workflows/lib/step.ts";
import { NOOP, workflowRule } from "#/app/presets/features/check-workflows/lib/workflow-rule.ts";
import type { Visitor } from "#/app/presets/features/check-workflows/lib/workflow-rule.ts";
import {
  isSelfReferenceWithRef,
  localPath,
  selfReferenceError,
} from "#/app/presets/shared/uses/index.ts";
import type { Text } from "#/app/presets/shared/yaml/index.ts";

const checkUses = (env: LocalActionEnv, uses: Text, exec: ExecAction): void => {
  const spec = uses.value;
  if (isSelfReferenceWithRef(spec)) {
    env.fail(uses, selfReferenceError(spec));
  } else if (Option.isSome(localPath(spec))) {
    checkLocal(env)(uses, exec);
  } else if (isDocker(spec)) {
    checkDocker({ fail: env.fail, uses });
  } else {
    checkRepo({ fail: env.fail, uses })(exec);
  }
};

const usesOf = (exec: ExecAction): Option.Option<Text> =>
  Option.filter(Option.fromNullishOr(exec.uses), (found) => !containsExpression(found.value));

export const action = workflowRule({
  description: "Reports malformed uses, unknown action inputs and invalid local action metadata",
  docs: "https://github.com/rhysd/actionlint/blob/main/docs/checks.md#check-popular-action-inputs",
  visitor: (fail, context): Visitor => ({
    ...NOOP,
    step: (step): void => {
      for (const exec of Option.toArray(actionOf(step))) {
        for (const uses of Option.toArray(usesOf(exec))) {
          checkUses({ fail, project: context.project }, uses, exec);
        }
      }
    },
  }),
});
