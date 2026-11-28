import { layer } from "@effect/vitest";
import { Array as Arr, ConfigProvider, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { changedRepositoryWith, fixtureLayer } from "#/shared/lib/repository.test.support.ts";

import { checkPackageVersions } from "./package-versions.ts";

const manifest = (name: string, version: string, extra = ""): string =>
  `{\n  "name": "${name}",\n  "version": "${version}"${extra}\n}\n`;

const withBase = ConfigProvider.fromUnknown({ VPA_BASE: "HEAD" });

const flagsChangesThatKeepTheVersion = Effect.gen(function* flagsChanges() {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* changedRepositoryWith(
    {
      "libs/kept/package.json": manifest("kept", "1.0.0"),
      "libs/kept/src/a.ts": "export const a = 1;\n",
      "libs/bumped/package.json": manifest("bumped", "1.0.0"),
      "libs/bumped/src/a.ts": "export const a = 1;\n",
      "libs/tested/package.json": manifest("tested", "1.0.0"),
      "libs/tested/src/a.test.ts": "export const a = 1;\n",
      "libs/hidden/package.json": manifest("hidden", "1.0.0", ',\n  "private": true'),
      "libs/hidden/src/a.ts": "export const a = 1;\n",
      "libs/unchanged/package.json": manifest("unchanged", "1.0.0"),
    },
    {
      "libs/kept/src/a.ts": "export const a = 2;\n",
      "libs/bumped/package.json": manifest("bumped", "1.1.0"),
      "libs/bumped/src/a.ts": "export const a = 2;\n",
      "libs/tested/src/a.test.ts": "export const a = 2;\n",
      "libs/hidden/src/a.ts": "export const a = 2;\n",
    },
  );
  const problems = yield* checkPackageVersions(root).pipe(
    Effect.provideService(ConfigProvider.ConfigProvider, withBase),
  );
  expect(
    pipe(
      sortProblems(problems),
      Arr.map(
        (problem) =>
          `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)} ${problem.rule}`,
      ),
    ),
  ).toStrictEqual(["libs/kept/package.json:3 unbumped-package"]);
});

layer(fixtureLayer)("package versions", (it) => {
  it.effect(
    "flags a changed package that keeps the version main holds",
    () => flagsChangesThatKeepTheVersion,
  );
});
