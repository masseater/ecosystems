import { Array as Arr, Effect } from "effect";

import { fixUncatalogedDependencies } from "#/features/check-catalog-entries/index.ts";
import { fixPrepublishScripts } from "#/features/check-pack-settings/index.ts";

/** @internal */
export const fixManifests = Effect.fn("fixManifests")(function* fixManifests(root: string) {
  const lines = yield* Effect.all([fixPrepublishScripts(root), fixUncatalogedDependencies(root)], {
    concurrency: 1,
  });
  return Arr.flatten(lines);
});
