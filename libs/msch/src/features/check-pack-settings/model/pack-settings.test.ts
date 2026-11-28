import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkPackSettings } from "./pack-settings.ts";

const STRICT_CONFIG =
  'export default { pack: { entry: ["src/index.ts"], publint: { strict: true } } };\n';
const PREPUBLISH = "vp exec msch-publish prepublish .";

const published = (name: string, prepublish = PREPUBLISH): string =>
  `{ "name": "@r_masseater/${name}", "scripts": { "prepublishOnly": "${prepublish}" }, "publishConfig": { "access": "public" } }\n`;

const flagsPublishedPackagesWithoutTheSharedPrepublish = Effect.gen(
  function* flagsPublishedPackagesWithoutTheSharedPrepublish() {
    const repositoryFiles = yield* RepositoryFiles;
    const root = yield* gitRepositoryWith({
      "package.json": '{ "name": "root", "private": true }\n',
      "libs/shared/package.json": published("shared"),
      "libs/shared/vite.config.ts": STRICT_CONFIG,
      "libs/build-only/package.json": published("build-only", "vp run build"),
      "libs/build-only/vite.config.ts": STRICT_CONFIG,
      "libs/none/package.json":
        '{ "name": "@r_masseater/none", "publishConfig": { "access": "public" } }\n',
      "libs/none/vite.config.ts": STRICT_CONFIG,
      "libs/kept/package.json": '{ "name": "kept", "private": true, "publishConfig": {} }\n',
    });
    const problems = yield* checkPackSettings(root);
    expect(
      pipe(
        sortProblems(problems),
        Arr.map(
          (problem) =>
            `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)} ${problem.rule}`,
        ),
      ),
    ).toStrictEqual([
      "libs/build-only/package.json:1 prepublish-script",
      "libs/none/package.json:1 prepublish-script",
    ]);
  },
);

const flagsPublishedPackagesWithoutStrictPublint = Effect.gen(
  function* flagsPublishedPackagesWithoutStrictPublint() {
    const repositoryFiles = yield* RepositoryFiles;
    const root = yield* gitRepositoryWith({
      "package.json": '{ "name": "root", "private": true }\n',
      "libs/strict/package.json": published("strict"),
      "libs/strict/vite.config.ts":
        'export default { pack: { entry: ["src/index.ts"], publint: { strict: true } } };\n',
      "libs/listed/package.json": published("listed"),
      "libs/listed/vite.config.ts":
        'export default { pack: [{ entry: ["a.ts"] }, { entry: ["b.ts"], publint: { strict: true } }] };\n',
      "libs/loose/package.json": published("loose"),
      "libs/loose/vite.config.ts":
        'export default {\n  pack: { entry: ["src/index.ts"], publint: true },\n};\n',
      "libs/missing/package.json": published("missing"),
      "libs/missing/vite.config.ts":
        'export default {\n  test: {},\n  pack: { entry: ["src/index.ts"] },\n};\n',
      "libs/unpacked/package.json": published("unpacked"),
      "libs/unpacked/vite.config.ts": "export default {};\n",
      "libs/kept/package.json": '{ "name": "kept", "private": true, "publishConfig": {} }\n',
      "libs/kept/vite.config.ts": 'export default { pack: { entry: ["src/index.ts"] } };\n',
      "apps/web/package.json": '{ "name": "web" }\n',
      "apps/web/vite.config.ts": 'export default { pack: { entry: ["src/index.ts"] } };\n',
    });
    const problems = yield* checkPackSettings(root);
    expect(
      pipe(
        sortProblems(problems),
        Arr.map(
          (problem) =>
            `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)} ${problem.rule}`,
        ),
      ),
    ).toStrictEqual([
      "libs/loose/vite.config.ts:2 pack-publint",
      "libs/missing/vite.config.ts:3 pack-publint",
      "libs/unpacked/vite.config.ts:1 pack-publint",
    ]);
  },
);

layer(fixtureLayer)("published packages check their packed manifest", (it) => {
  it.effect(
    "flags a published package whose pack does not run publint in strict mode",
    () => flagsPublishedPackagesWithoutStrictPublint,
  );
  it.effect(
    "flags a published package whose prepublishOnly is not the shared command",
    () => flagsPublishedPackagesWithoutTheSharedPrepublish,
  );
});
