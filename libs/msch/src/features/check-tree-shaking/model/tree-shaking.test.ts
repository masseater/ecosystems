import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { sortProblems } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkTreeShaking } from "./tree-shaking.ts";

const PACK_ENTRIES = '{ index: "src/index.ts", extra: "src/extra.ts" }';
const EXPORTS = '"exports": { ".": "./src/index.ts", "./extra": "./src/extra.ts" }';
const DEPENDENCIES = '"dependencies": { "dep-one": "1.0.0", "dep-two": "1.0.0" }';
const EXTRA_PEER =
  '"peerDependencies": { "dep-extra": "1.0.0" },\n  "peerDependenciesMeta": { "dep-extra": { "optional": true } }';
const EXPECTED_FINDINGS = 2;

const config = (entry: string, extra = ""): string =>
  `export default { msch: { publish: { installSize: "1 MB" } }, pack: { entry: ${entry}${extra} } };\n`;

const manifest = (fields: readonly string[]): string => {
  const lines = ['"name": "pkg"', '"private": false', ...fields];
  return `{\n  ${Arr.join(lines, ",\n  ")}\n}\n`;
};

const sources = {
  "libs/pkg/src/index.ts":
    'export { first } from "./first.ts";\nexport { second } from "./second.ts";\n',
  "libs/pkg/src/first.ts":
    'import { one } from "dep-one";\nexport const first = (): number => one();\n',
  "libs/pkg/src/second.ts":
    'import { two } from "dep-two";\nexport const second: number = two();\n',
  "libs/pkg/src/extra.ts":
    'import { extra } from "dep-extra";\nexport { first } from "./first.ts";\nexport { second } from "./second.ts";\nexport const used = (): number => extra();\n',
  "libs/pkg/src/cli.ts": 'import { run } from "dep-cli";\nrun();\n',
};

const findingsFor = Effect.fn("findingsFor")(function* findingsFor(
  files: Readonly<Record<string, string>>,
) {
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith({
    ".gitignore": "node_modules\n",
    "libs/pkg/vite.config.ts": config(PACK_ENTRIES),
    ...sources,
    ...files,
  });
  const problems = yield* checkTreeShaking(root);
  return pipe(
    sortProblems(problems),
    Arr.map(
      (problem) =>
        `${repositoryFiles.relative(root, problem.file)}:${String(problem.line)} ${problem.rule} ${problem.message}`,
    ),
  );
});

const flagsMissingSideEffects = Effect.gen(function* flagsMissingSideEffects() {
  const findings = yield* findingsFor({
    "libs/pkg/package.json": manifest([
      EXPORTS,
      '"dependencies": { "dep-one": "1.0.0", "dep-two": "1.0.0", "dep-extra": "1.0.0" }',
    ]),
  });
  expect(findings).toHaveLength(EXPECTED_FINDINGS);
  expect(findings).toContainEqual(
    expect.stringMatching(
      /^libs\/pkg\/package\.json:4 side-effects importing `first` from `\.` also bundles 2 modules and imports dep-two, which it does not use\./u,
    ),
  );
});

const passesDeclaredPackage = Effect.gen(function* passesDeclaredPackage() {
  const findings = yield* findingsFor({
    "libs/pkg/package.json": manifest(['"sideEffects": false', EXPORTS, DEPENDENCIES, EXTRA_PEER]),
  });
  expect(findings).toStrictEqual([]);
});

const flagsDependencyOfSomeEntries = Effect.gen(function* flagsDependencyOfSomeEntries() {
  const findings = yield* findingsFor({
    "libs/pkg/package.json": manifest([
      '"sideEffects": false',
      EXPORTS,
      '"dependencies": { "dep-one": "1.0.0", "dep-two": "1.0.0", "dep-extra": "1.0.0" }',
    ]),
  });
  expect(findings).toStrictEqual([
    "libs/pkg/package.json:6 optional-peer dep-extra is imported only from `./extra`, so installing the other entries must not require it. Move it to peerDependencies, mark it optional in peerDependenciesMeta and keep it in devDependencies.",
  ]);
});

const keepsDependencyOfBin = Effect.gen(function* keepsDependencyOfBin() {
  const findings = yield* findingsFor({
    "libs/pkg/package.json": manifest([
      '"sideEffects": false',
      EXPORTS,
      '"bin": { "pkg": "./src/cli.ts" }',
      '"dependencies": { "dep-one": "1.0.0", "dep-two": "1.0.0", "dep-cli": "1.0.0" }',
      EXTRA_PEER,
    ]),
  });
  expect(findings).toStrictEqual([]);
});

const keepsEntriesListedAsSideEffects = Effect.gen(function* keepsEntriesListedAsSideEffects() {
  const findings = yield* findingsFor({
    "libs/pkg/vite.config.ts": config(
      '{ index: "src/index.ts", extra: "src/extra.ts", setup: "src/setup.ts" }',
    ),
    "libs/pkg/src/setup.ts":
      'import { register } from "dep-setup";\nimport { one } from "dep-one";\nimport { two } from "dep-two";\nregister(one, two);\n',
    "libs/pkg/package.json": manifest([
      '"sideEffects": ["./dist/setup.mjs"]',
      '"exports": { ".": "./src/index.ts", "./extra": "./src/extra.ts", "./setup": "./src/setup.ts" }',
      DEPENDENCIES,
      '"peerDependencies": { "dep-extra": "1.0.0", "dep-setup": "1.0.0" },\n  "peerDependenciesMeta": { "dep-extra": { "optional": true }, "dep-setup": { "optional": true } }',
    ]),
  });
  expect(findings).toStrictEqual([]);
});

const flagsEffectsThatSideEffectsDrops = Effect.gen(function* flagsEffectsThatSideEffectsDrops() {
  const findings = yield* findingsFor({
    "libs/pkg/src/first.ts":
      'import { one } from "dep-one";\nimport "dep-two";\none();\nexport const first = (): number => one();\n',
    "libs/pkg/package.json": manifest(['"sideEffects": false', EXPORTS, DEPENDENCIES, EXTRA_PEER]),
  });
  expect(findings).toStrictEqual([
    "libs/pkg/src/first.ts:2 top-level-effect imports a module only for its effect, but sideEffects in package.json does not list this file, so a bundler drops the import. Import what the module exports, or list the entry that exists for its effect in sideEffects.",
    "libs/pkg/src/first.ts:3 top-level-effect runs a statement at the top level for its effect, but sideEffects in package.json does not list this file, so a bundler drops the module when nothing it exports is used. Move the statement into a function that the caller runs, or list the entry that exists for its effect in sideEffects.",
  ]);
});

const skipsPrivatePackages = Effect.gen(function* skipsPrivatePackages() {
  const findings = yield* findingsFor({
    "libs/pkg/package.json":
      '{ "name": "pkg", "private": true, "dependencies": { "dep-extra": "1.0.0" } }\n',
  });
  expect(findings).toStrictEqual([]);
});

const bundlesPrivateWorkspacePackages = Effect.gen(function* bundlesPrivateWorkspacePackages() {
  const findings = yield* findingsFor({
    "libs/pkg/vite.config.ts": config(PACK_ENTRIES, ', deps: { alwaysBundle: ["host"] }'),
    "libs/pkg/src/first.ts":
      'import { one } from "host";\nexport const first = (): number => one();\n',
    "libs/pkg/node_modules/host/package.json": '{ "name": "host", "exports": "./index.ts" }\n',
    "libs/pkg/node_modules/host/index.ts":
      'import { hosted } from "dep-hosted";\nexport const one = (): number => hosted();\n',
    "libs/pkg/package.json": manifest([
      '"sideEffects": false',
      EXPORTS,
      '"dependencies": { "dep-hosted": "1.0.0", "dep-two": "1.0.0" }',
      EXTRA_PEER,
    ]),
  });
  expect(findings).toStrictEqual([]);
});

layer(fixtureLayer)("tree shaking of published packages", (it) => {
  it.effect(
    "flags a package whose single export bundles modules and packages it does not use",
    () => flagsMissingSideEffects,
  );
  it.effect("passes a package that declares sideEffects false", () => passesDeclaredPackage);
  it.effect(
    "flags a dependency imported from only some entries that is not an optional peer",
    () => flagsDependencyOfSomeEntries,
  );
  it.effect("keeps a dependency that only a bin needs", () => keepsDependencyOfBin);
  it.effect(
    "does not flag an entry that sideEffects lists, because it exists for its effect",
    () => keepsEntriesListedAsSideEffects,
  );
  it.effect(
    "flags a top-level statement that sideEffects tells a bundler to drop",
    () => flagsEffectsThatSideEffectsDrops,
  );
  it.effect("skips a private package", () => skipsPrivatePackages);
  it.effect(
    "counts the packages of workspace packages that the pack bundles",
    () => bundlesPrivateWorkspacePackages,
  );
});
