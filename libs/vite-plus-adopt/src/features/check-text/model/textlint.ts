import type { TextlintKernelDescriptor, TextlintResult } from "@textlint/kernel";
import { Effect, Path, Array as Arr, Option, pipe, Function as Fn, String as Str } from "effect";
import { createLinter, loadLinterFormatter } from "textlint";

import type { TextlintConfig } from "#/shared/config/index.ts";
import { attempt } from "#/shared/lib/attempt.ts";
import type { VpToolsError } from "#/shared/lib/errors.ts";
import type { Report } from "#/shared/lib/report.ts";

import { descriptorOf } from "./textlint-descriptor.ts";
import { filesWithDirectives, formatUnused, recording, unusedIn } from "./unused-directives.ts";
import type { Recording, Unused } from "./unused-directives.ts";

const DATA_FIRST_ARITY_3 = 3;

const unusedOf = (
  config: TextlintConfig,
  descriptor: TextlintKernelDescriptor,
  recorder: Recording,
): Effect.Effect<readonly Unused[], VpToolsError> => {
  const ignored = recorder.ignored();
  if (config.reportUnusedDirectives !== true || Arr.isReadonlyArrayEmpty(ignored)) {
    return Effect.succeed([]);
  }
  const bare = descriptor.shallowMerge({ filterRules: [] });
  return attempt("textlint")(() =>
    createLinter({ descriptor: bare }).lintFiles([...filesWithDirectives(ignored)]),
  ).pipe(Effect.map((unfiltered) => unusedIn({ unfiltered, ignored })));
};

const wrapperOf = (config: TextlintConfig, recorder: Recording): Recording["wrap"] =>
  pipe(
    Option.liftPredicate(recorder.wrap, () => config.reportUnusedDirectives === true),
    Option.getOrElse(() => Fn.identity),
  );

const reportOf = (
  formatted: string,
  results: readonly TextlintResult[],
  unused: readonly Unused[],
): Report => ({
  valid:
    Arr.isReadonlyArrayEmpty(unused) &&
    pipe(
      results,
      Arr.every((result) => Arr.isArrayEmpty(result.messages)),
    ),
  output: pipe([formatted, formatUnused(unused)], Arr.filter(Str.isNonEmpty), Arr.join("\n")),
});

/** @internal */
export const lintTexts: {
  (
    root: string,
    files: readonly string[],
  ): (config: TextlintConfig) => Effect.Effect<Report, VpToolsError, Path.Path>;
  (
    config: TextlintConfig,
    root: string,
    files: readonly string[],
  ): Effect.Effect<Report, VpToolsError, Path.Path>;
} = Fn.dual(
  DATA_FIRST_ARITY_3,
  (
    config: TextlintConfig,
    root: string,
    files: readonly string[],
  ): Effect.Effect<Report, VpToolsError, Path.Path> =>
    Effect.gen(function* lint() {
      const path = yield* Path.Path;
      yield* attempt("textlint")(() => import("vite-plus/register"));
      const recorder = recording();
      const descriptor = yield* descriptorOf({
        root,
        config,
        wrap: wrapperOf(config, recorder),
      });
      const absolute = pipe(
        files,
        Arr.map((file) => path.join(root, file)),
      );
      const results = yield* attempt("textlint")(() =>
        createLinter({ descriptor }).lintFiles([...absolute]),
      );
      const unused = yield* unusedOf(config, descriptor, recorder);
      const formatter = yield* attempt("textlint")(() =>
        loadLinterFormatter({ formatterName: "stylish", color: false }),
      );
      return reportOf(formatter.format(results), results, unused);
    }),
);
