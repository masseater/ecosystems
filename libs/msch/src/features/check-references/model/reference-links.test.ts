import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkReferenceLinks } from "./reference-links.ts";

const lines = (parts: readonly string[]): string => Arr.join(parts, "\n");

const COMMIT = "5dbbf4abd9b3a5b1a74bc30c89ca7bd6712bd929";

const findingsFor = Effect.fn("findingsFor")(function* findingsFor(
  files: Readonly<Record<string, string>>,
) {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith(files);
  const problems = yield* checkReferenceLinks(root);
  return pipe(
    sortProblems(problems),
    Arr.map(
      (problem) =>
        `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)} ${problem.rule}`,
    ),
  );
});

const flagsLinksThatCannotBeChecked = Effect.gen(function* flagsLinksThatCannotBeChecked() {
  const findings = yield* findingsFor({
    "docs/good.md": lines([
      "See [msch](github:masseater/ecosystems/libs/msch) and [the runner](github:o/r/a.ts#runCli).",
      "The package is [msch](npm:@r_masseater/msch).",
      `A [permalink](https://github.com/o/r/blob/${COMMIT}/a.ts), a [pull](https://github.com/o/r/pull/12) and a [branch](https://github.com/o/r/blob/main/a.ts) are not flagged.`,
      "A `[code](github:broken)` and a fenced block are not links.",
      "",
      "```md",
      "[fenced](github:broken)",
      "```",
      "",
    ]),
    "docs/bad.md": lines([
      "A [line](github:o/r/a.ts#L10).",
      "A [path](github:o/r/dir/).",
      "Here is [one](<github:o>).",
      "",
    ]),
    "fixtures/ignored.md": "[x](github:broken)\n",
  });
  expect(findings).toStrictEqual([
    "docs/bad.md:1 reference-link",
    "docs/bad.md:2 reference-link",
    "docs/bad.md:3 reference-link",
  ]);
});

layer(fixtureLayer)("checkReferenceLinks", (it) => {
  it.effect("flags references that msch-refs cannot check", () => flagsLinksThatCannotBeChecked);
});
