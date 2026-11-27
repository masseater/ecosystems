import { Array as Arr, Effect } from "effect";

import { checkTreeShaking } from "#/features/check-tree-shaking/index.ts";
import { checkTypescriptGeneration } from "#/features/check-typescript-generation/index.ts";
import { checkWorkerBundles } from "#/features/check-worker-bundles/index.ts";

/** @internal */
export const checkBuilds = Effect.fn("checkBuilds")(function* checkBuilds(root: string) {
  const found = yield* Effect.all(
    [checkTypescriptGeneration(root), checkWorkerBundles(root), checkTreeShaking(root)],
    {
      concurrency: "unbounded",
    },
  );
  return Arr.flatten(found);
});
