import { formatDiagnostic, runCli as runLinter } from "@masseater.dev/lint-host";

import { failedWith } from "#/shared/lib/errors.ts";

import { lint } from "./lint.ts";
import { i68Section, songPathspecs } from "./section.ts";

export const runCli = (): void => {
  runLinter({
    name: "i68",
    section: i68Section,
    pathspecs: songPathspecs,
    lint,
    format: formatDiagnostic,
    failWith: failedWith,
  });
};
