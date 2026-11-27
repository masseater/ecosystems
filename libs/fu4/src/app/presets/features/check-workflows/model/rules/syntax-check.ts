import { workflowOf } from "#/app/presets/entities/workflow/index.ts";
import { defineRule } from "#/entities/rule/index.ts";

export const syntaxCheck = defineRule({
  meta: {
    description: "Reports workflow files that GitHub Actions cannot load",
    docs: "https://github.com/rhysd/actionlint/blob/main/docs/checks.md#check-syntax",
  },
  check: (context) => {
    for (const problem of workflowOf(context.source).errors) {
      context.report(problem);
    }
  },
});
