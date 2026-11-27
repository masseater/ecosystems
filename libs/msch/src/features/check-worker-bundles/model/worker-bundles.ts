import { Array as Arr, Effect, Option } from "effect";
import { rolldown } from "vite/rolldown";

import { bundledEntries } from "#/entities/workspace/index.ts";
import { bundleErrorDetail } from "#/shared/lib/bundle-error.ts";
import { problemInFile } from "#/shared/lib/problem.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

const RULE: RuleName = "worker-bundle";
const BUNDLE_CONCURRENCY = 4;
const PLATFORM_MODULES = [/^cloudflare:/u, /^node:/u];
const CONDITIONS = ["workerd", "worker", "browser", "import", "module", "default"];

const problemFor = problemInFile(RULE);

const problemOf = (file: string, detail: string): Problem =>
  problemFor(file, `does not bundle as a Worker, so the deploy would fail. ${detail}`);

const bundleProblem = (file: string): Effect.Effect<Option.Option<Problem>> =>
  Effect.gen(function* bundle() {
    const built = yield* Effect.tryPromise({
      try: () =>
        rolldown({
          input: file,
          platform: "neutral",
          external: PLATFORM_MODULES,
          resolve: { conditionNames: CONDITIONS },
          logLevel: "silent",
        }),
      catch: bundleErrorDetail,
    });
    yield* Effect.tryPromise({
      try: () => built.generate({ format: "esm" }),
      catch: bundleErrorDetail,
    });
    yield* Effect.promise(() => built.close());
  }).pipe(
    Effect.match({
      onSuccess: () => Option.none<Problem>(),
      onFailure: (detail) => Option.some(problemOf(file, detail)),
    }),
  );

/** @internal */
export const checkWorkerBundles = Effect.fn("checkWorkerBundles")(function* checkWorkerBundles(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const entries = yield* bundledEntries(root);
  const found = yield* Effect.forEach(entries, (entry) => bundleProblem(files.join(root, entry)), {
    concurrency: BUNDLE_CONCURRENCY,
  });
  return Arr.getSomes(found);
});
