import { layer } from "@effect/vitest";
import { Array as Arr, Effect, Option, Record as Rec, pipe } from "effect";
import { expect } from "vite-plus/test";

import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { fixUncatalogedDependencies } from "./fix-uncataloged.ts";
import { uncatalogedDependencies } from "./uncataloged-dependencies.ts";

const CLASHING = 1;
const lines = (text: readonly string[]): string => pipe([...text, ""], Arr.join("\n"));

const FIXTURE = {
  "pnpm-workspace.yaml": lines(["packages:", "  - libs/*", "catalog:", "  held: 1.0.0"]),
  "package.json": lines(["{", '  "devDependencies": { "fresh": "2.0.0" }', "}"]),
  "libs/a/package.json": lines([
    "{",
    '  "dependencies": { "held": "1.0.0", "fresh": "2.0.0", "clash": "3.0.0" }',
    "}",
  ]),
  "libs/b/package.json": lines(["{", '  "dependencies": { "clash": "4.0.0" }', "}"]),
};

const NAMES = ["package.json", "libs/a/package.json", "libs/b/package.json", "pnpm-workspace.yaml"];

const readAll = (root: string): Effect.Effect<Record<string, string>, never, RepositoryFiles> =>
  Effect.gen(function* readAll_() {
    const files = yield* RepositoryFiles;
    const texts = yield* Effect.forEach(
      NAMES,
      (name) => files.readFile(files.join(root, name)).pipe(Effect.map(Option.getOrElse(() => ""))),
      { concurrency: 1 },
    );
    return Rec.fromEntries(Arr.zip(NAMES, texts));
  });

const movesVersionsIntoTheCatalog = Effect.gen(function* movesVersionsIntoTheCatalog() {
  const root = yield* gitRepositoryWith(FIXTURE);
  const report = yield* fixUncatalogedDependencies(root);
  const texts = yield* readAll(root);
  expect(texts["package.json"]).toContain('"fresh": "catalog:"');
  expect(texts["libs/a/package.json"]).toContain('"held": "catalog:"');
  expect(texts["libs/b/package.json"]).toContain('"clash": "4.0.0"');
  expect(texts["pnpm-workspace.yaml"]).toContain("clash: 3.0.0");
  expect(report).toContain(
    "libs/b/package.json: `clash` `4.0.0` differs from the catalog's `3.0.0`. Align the versions by hand.",
  );
  const remaining = yield* uncatalogedDependencies(root);
  expect(remaining).toHaveLength(CLASHING);
});

layer(fixtureLayer)("fix uncataloged dependencies", (it) => {
  it.effect(
    "moves versions into the catalog and leaves conflicting versions to the owner",
    () => movesVersionsIntoTheCatalog,
  );
});
