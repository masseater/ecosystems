import { Array as Arr, Effect, Option, pipe, String as Str } from "effect";
import { rolldown } from "vite/rolldown";

import { deployEntries } from "#/entities/workspace/index.ts";
import { problemInFile } from "#/shared/lib/problem.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

const RULE: RuleName = "worker-bundle";
const BUNDLE_CONCURRENCY = 4;
const SHOWN_ERRORS = 3;
const ERROR_LINE = /\[[A-Z_]+\]/u;
const ANSI = /\u001B\[[0-9;]*m/gu;
const PLATFORM_MODULES = [/^cloudflare:/u, /^node:/u];
const CONDITIONS = ["workerd", "worker", "browser", "import", "module", "default"];

const problemFor = problemInFile(RULE);

const errorLines = (error: unknown): readonly string[] =>
  pipe(
    String(error instanceof Error ? error.message : error),
    Str.replace(ANSI, ""),
    Str.split("\n"),
    Arr.filter((line) => ERROR_LINE.test(line)),
    Arr.take(SHOWN_ERRORS),
  );

const bundleOf = (entry: string): Effect.Effect<Option.Option<readonly string[]>> =>
  Effect.tryPromise({
    try: async () => {
      const bundle = await rolldown({
        input: entry,
        platform: "neutral",
        external: PLATFORM_MODULES,
        resolve: { conditionNames: CONDITIONS },
        logLevel: "silent",
      });
      await bundle.generate({ format: "esm" });
      await bundle.close();
    },
    catch: errorLines,
  }).pipe(
    Effect.as(Option.none<readonly string[]>()),
    Effect.catch((lines) => Effect.succeed(Option.some(lines))),
  );

const problemOf = (file: string, lines: readonly string[]): Problem =>
  problemFor(
    file,
    `does not bundle as a Worker, so the deploy would fail. ${Arr.isReadonlyArrayNonEmpty(lines) ? lines.join(" ") : "Run the bundle to see the error."}`,
  );

/** @internal */
export const checkWorkerBundles = Effect.fn("checkWorkerBundles")(function* checkWorkerBundles(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const entries = yield* deployEntries(root);
  const found = yield* Effect.forEach(
    entries,
    (entry) => {
      const file = files.join(root, entry);
      return bundleOf(file).pipe(Effect.map(Option.map((lines) => problemOf(file, lines))));
    },
    { concurrency: BUNDLE_CONCURRENCY },
  );
  return Arr.getSomes(found);
});
