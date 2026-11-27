import { Option, pipe } from "effect";

import type { Step } from "#/app/presets/entities/workflow/index.ts";
import {
  isChecked,
  runnerShell,
  sanitize,
  shellOf,
  shown,
  stepShell,
} from "#/app/presets/features/check-workflows/lib/shellcheck.ts";
import type { Shells } from "#/app/presets/features/check-workflows/lib/shellcheck.ts";
import { runOf } from "#/app/presets/features/check-workflows/lib/step.ts";
import { NOOP, workflowRule } from "#/app/presets/features/check-workflows/lib/workflow-rule.ts";
import type { Visitor } from "#/app/presets/features/check-workflows/lib/workflow-rule.ts";
import { checkShell, parseableScript } from "#/app/presets/shared/shell/index.ts";
import type { Text } from "#/app/presets/shared/yaml/index.ts";
import type { Position } from "#/shared/config/index.ts";

const checkedRun =
  (shells: Readonly<Shells>) =>
  (step: Step): Option.Option<readonly [Text, Position]> =>
    pipe(
      runOf(step),
      Option.filter((run) => isChecked(stepShell(shells)(run))),
      Option.flatMap((run) =>
        Option.all([Option.fromNullishOr(run.run), Option.fromNullishOr(run.runPosition)]),
      ),
    );

export const shellcheck = workflowRule({
  description: "Reports shellcheck findings in bash and sh run scripts",
  docs: "https://github.com/rhysd/actionlint/blob/main/docs/checks.md#check-shellcheck-integ",
  visitor: (fail, context): Visitor => {
    const shells: Shells = { workflow: Option.none(), job: Option.none(), runner: Option.none() };
    return {
      ...NOOP,
      workflowPre: (workflow): void => {
        shells.workflow = shellOf(workflow.defaults);
      },
      jobPre: (job): void => {
        shells.job = shellOf(job.defaults);
        shells.runner = runnerShell(job);
      },
      jobPost: (): void => {
        shells.job = Option.none();
        shells.runner = Option.none();
      },
      step: (step): void => {
        for (const [script, at] of Option.toArray(checkedRun(shells)(step))) {
          const parseable = parseableScript(sanitize(script.value));
          for (const finding of checkShell(context.parseScript("bash", parseable))) {
            fail(at, shown(finding));
          }
        }
      },
    };
  },
});
