import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkPublishedManifests } from "./published-manifests.ts";

const manifest = (fields: string): string =>
  `{ "name": "@r_masseater/x", "publishConfig": { "access": "public" }${fields} }\n`;

const URL = "git+https://github.com/owner/repo.git";
const repository = (directory: string): string =>
  `, "repository": { "type": "git", "url": "${URL}", "directory": "${directory}" }`;
const homepage = (directory: string): string =>
  `, "homepage": "https://github.com/owner/repo/tree/main/${directory}#readme"`;

const flagsPublishedPackagesThatPointAtTheRoot = Effect.gen(
  function* flagsPublishedPackagesThatPointAtTheRoot() {
    const repositoryFiles = yield* RepositoryFiles;
    const root = yield* gitRepositoryWith({
      "package.json": manifest(', "private": true'),
      "libs/right/package.json": manifest(homepage("libs/right") + repository("libs/right")),
      "libs/no-directory/package.json": manifest(
        `${homepage("libs/no-directory")}, "repository": { "type": "git", "url": "${URL}" }`,
      ),
      "libs/no-homepage/package.json": manifest(repository("libs/no-homepage")),
      "libs/root-homepage/package.json": manifest(
        `, "homepage": "https://github.com/owner/repo"${repository("libs/root-homepage")}`,
      ),
      "libs/string-repository/package.json": manifest(', "repository": "owner/repo"'),
      "libs/no-repository/package.json": manifest(""),
      "libs/private/package.json": manifest(', "private": true'),
      "libs/unpublished/package.json": '{ "name": "unpublished" }\n',
    });
    const problems = yield* checkPublishedManifests(root);
    const homepageProblems = pipe(
      problems,
      Arr.filter((problem) => problem.rule === "package-homepage"),
    );
    expect(
      pipe(
        sortProblems(homepageProblems),
        Arr.map((problem) => repositoryFiles.relative(root, problem.file)),
      ),
    ).toStrictEqual([
      "libs/no-directory/package.json",
      "libs/no-homepage/package.json",
      "libs/no-repository/package.json",
      "libs/root-homepage/package.json",
      "libs/string-repository/package.json",
    ]);
  },
);

layer(fixtureLayer)("published packages point npm at their own directory", (it) => {
  it.effect(
    "flags a missing repository.directory, homepage or repository",
    () => flagsPublishedPackagesThatPointAtTheRoot,
  );
});
