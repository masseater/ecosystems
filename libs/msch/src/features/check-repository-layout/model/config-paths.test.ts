import { layer } from "@effect/vitest";
import { Array as Arr, Effect, String as Str, pipe } from "effect";
import { expect } from "vite-plus/test";

import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkConfigPaths } from "./config-paths.ts";

const SEPARATOR_LENGTH = 1;

const CARGO = `[workspace]
members = ["crates/app", "crates/gone", "crates/*"]
exclude = ["patches/absent", "patches/present"]

[workspace.dependencies]
shared = { path = "crates/missing-shared" }

[patch.crates-io]
fork = { path = "patches/present" }
absent-fork = { path = "patches/absent-fork" }
`;

const TSCONFIG = `{
  // comments and trailing commas are valid in tsconfig
  "extends": ["../base", "../absent-base.json", "@tsconfig/node"],
  "include": ["src", "bin", "src/**/*.ts", "gone/**/*.ts", "**/*.d.ts", ".output/**"],
  "references": [{ "path": "../app" }, { "path": "../absent" }],
}
`;

const problemsFor = Effect.fn("problemsFor")(function* problemsFor(
  files: Readonly<Record<string, string>>,
) {
  const root = yield* gitRepositoryWith(files);
  const problems = yield* checkConfigPaths(root);
  return pipe(
    problems,
    Arr.map(({ file, line, message }) => {
      const field = Arr.headNonEmpty(Str.split(message, ","));
      return `${Str.slice(root.length + SEPARATOR_LENGTH)(file)}:${line} ${field}`;
    }),
  );
});

const reportsMissingPaths = Effect.gen(function* reportsMissingPaths() {
  const found = yield* problemsFor({
    "Cargo.toml": CARGO,
    "crates/app/Cargo.toml": '[package]\nname = "app"\n',
    "patches/present/Cargo.toml": '[package]\nname = "fork"\n',
    ".gitignore": ".output/\n",
    "pnpm-workspace.yaml": "packages:\n  - apps/*\n  - tools/*\n  - '!tools/skip'\n",
    "apps/web/package.json": "{}",
    "apps/web/tsconfig.json": TSCONFIG,
    "apps/web/src/index.ts": "",
    "apps/base.json": "{}",
    "apps/app/tsconfig.json": "{}",
  });
  expect(found).toStrictEqual([
    "Cargo.toml:2 workspace.members names crates/gone",
    "Cargo.toml:3 workspace.exclude names patches/absent",
    "Cargo.toml:6 workspace.dependencies.shared.path names crates/missing-shared",
    "Cargo.toml:10 patch.crates-io.absent-fork.path names patches/absent-fork",
    "apps/web/tsconfig.json:3 extends names ../absent-base.json",
    "apps/web/tsconfig.json:4 include names bin",
    "apps/web/tsconfig.json:4 include names gone/**/*.ts",
    "apps/web/tsconfig.json:5 references names ../absent",
    "pnpm-workspace.yaml:3 packages lists tools/*",
  ]);
});

const acceptsExistingPaths = Effect.gen(function* acceptsExistingPaths() {
  const found = yield* problemsFor({
    "Cargo.toml": '[workspace]\nmembers = ["crates/*", "crates/app"]\n',
    "crates/app/Cargo.toml": '[package]\nname = "app"\n',
    "pnpm-workspace.yaml": "packages:\n  - apps/*\n",
    "apps/web/package.json": "{}",
    "apps/web/tsconfig.json": '{ "extends": "../base.json", "include": ["src", "**/*.ts"] }',
    "apps/base.json": "{}",
    "apps/web/src/index.ts": "",
  });
  expect(found).toStrictEqual([]);
});

layer(fixtureLayer)("config paths", (it) => {
  it.effect(
    "reports Cargo members, excludes and dependency paths, tsconfig references, extends and include, and pnpm patterns that name nothing",
    () => reportsMissingPaths,
  );
  it.effect("accepts configs whose paths all exist", () => acceptsExistingPaths);
});
