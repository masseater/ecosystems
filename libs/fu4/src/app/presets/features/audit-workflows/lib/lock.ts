import { Option, pipe } from "effect";

import { valueAt } from "#/app/presets/shared/yaml/index.ts";
import type { Project } from "#/shared/config/index.ts";

const LOCKFILE = ".github/workflows/actions.lock";

export const isLocked =
  (project: Project) =>
  (path: string): boolean =>
    pipe(
      project.parse(LOCKFILE),
      Option.flatMap((source) => Option.fromNullishOr(source.yaml)),
      Option.flatMap(valueAt("workflows")),
      Option.flatMap(valueAt(path)),
      Option.isSome,
    );
