import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { Effect, FileSystem, Path } from "effect";
import { expect } from "vite-plus/test";

import { expandDirectories } from "./expand-directories.ts";

const tempRoot = Effect.gen(function* tempRoot() {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const root = yield* fileSystem.makeTempDirectoryScoped();
  yield* fileSystem.makeDirectory(path.join(root, "scope/a"), { recursive: true });
  yield* fileSystem.makeDirectory(path.join(root, "scope/b"), { recursive: true });
  yield* fileSystem.writeFileString(path.join(root, "scope/file.txt"), "not a directory");
  return root;
});

const expandsPatternToDirectories = Effect.gen(function* expandsPatternToDirectories() {
  const root = yield* tempRoot;
  const found = yield* expandDirectories([`${root}/scope/*`]);
  expect(found).toStrictEqual([`${root}/scope/a`, `${root}/scope/b`]);
}).pipe(Effect.scoped);

const keepsPlainDirectories = Effect.gen(function* keepsPlainDirectories() {
  const root = yield* tempRoot;
  const found = yield* expandDirectories([`${root}/scope/b`, `${root}/scope/a`]);
  expect(found).toStrictEqual([`${root}/scope/b`, `${root}/scope/a`]);
}).pipe(Effect.scoped);

const keepsUnmatchedPattern = Effect.gen(function* keepsUnmatchedPattern() {
  const root = yield* tempRoot;
  const found = yield* expandDirectories([`${root}/missing/*`]);
  expect(found).toStrictEqual([`${root}/missing/*`]);
}).pipe(Effect.scoped);

const dropsDuplicates = Effect.gen(function* dropsDuplicates() {
  const root = yield* tempRoot;
  const found = yield* expandDirectories([`${root}/scope/a`, `${root}/scope/*`]);
  expect(found).toStrictEqual([`${root}/scope/a`, `${root}/scope/b`]);
}).pipe(Effect.scoped);

layer(nodeServices)("expandDirectories", (it) => {
  it.effect(
    "expands a pattern to the directories it matches, in order",
    () => expandsPatternToDirectories,
  );
  it.effect("keeps a plain directory as given", () => keepsPlainDirectories);
  it.effect(
    "keeps a pattern that matches nothing so the read reports it",
    () => keepsUnmatchedPattern,
  );
  it.effect("lists a directory once", () => dropsDuplicates);
});
