import { Config, Effect, Option } from "effect";

import { RepositoryFiles } from "./repository-files.ts";

const DEFAULT_BASE = "origin/main";

/** @internal */
export const baseName = Config.option(Config.String("VPA_BASE")).pipe(
  Effect.orDie,
  Effect.map(Option.getOrElse(() => DEFAULT_BASE)),
);

/** @internal */
export const baseRevision = Effect.fn("baseRevision")(function* baseRevision(root: string) {
  const files = yield* RepositoryFiles;
  const base = yield* baseName;
  return yield* files.mergeBase(root, base);
});
