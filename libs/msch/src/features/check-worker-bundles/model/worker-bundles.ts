import { stripVTControlCharacters } from "node:util";

import { Array as Arr, Effect, Option, Predicate, String as Str, pipe } from "effect";
import { rolldown } from "vite/rolldown";

import { deployEntries } from "#/entities/workspace/index.ts";
import { problemInFile } from "#/shared/lib/problem.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

const RULE: RuleName = "worker-bundle";
const BUNDLE_CONCURRENCY = 4;
const SHOWN_ERRORS = 3;
const ERROR_LINE = /\[[A-Z_]+\]/u;
const PLATFORM_MODULES = [/^cloudflare:/u, /^node:/u];
const CONDITIONS = ["workerd", "worker", "browser", "import", "module", "default"];
const NO_DETAIL = "Run the bundle to see the error.";

const problemFor = problemInFile(RULE);

const errorLines = (error: unknown): readonly string[] =>
  pipe(
    Option.liftPredicate(error, Predicate.isError),
    Option.map(({ message }) => message),
    Option.getOrElse(() => String(error)),
    stripVTControlCharacters,
    Str.split("\n"),
    Arr.filter((line) => ERROR_LINE.test(line)),
    Arr.take(SHOWN_ERRORS),
  );

const detailOf = (lines: readonly string[]): string =>
  pipe(lines, Arr.match({ onEmpty: () => NO_DETAIL, onNonEmpty: Arr.join(" ") }));

const problemOf = (file: string, lines: readonly string[]): Problem =>
  problemFor(file, `does not bundle as a Worker, so the deploy would fail. ${detailOf(lines)}`);

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
      catch: errorLines,
    });
    yield* Effect.tryPromise({ try: () => built.generate({ format: "esm" }), catch: errorLines });
    yield* Effect.promise(() => built.close());
  }).pipe(
    Effect.match({
      onSuccess: () => Option.none<Problem>(),
      onFailure: (lines) => Option.some(problemOf(file, lines)),
    }),
  );

/** @internal */
export const checkWorkerBundles = Effect.fn("checkWorkerBundles")(function* checkWorkerBundles(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const entries = yield* deployEntries(root);
  const found = yield* Effect.forEach(entries, (entry) => bundleProblem(files.join(root, entry)), {
    concurrency: BUNDLE_CONCURRENCY,
  });
  return Arr.getSomes(found);
});
