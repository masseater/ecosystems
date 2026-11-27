import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { Effect, FileSystem, Path } from "effect";
import { expect } from "vite-plus/test";

import { SiteWriteError, writeSite } from "./write-site.ts";

const PAGES = [
  { path: "index.html", content: "<p>root</p>" },
  { path: "a/b/index.html", content: "<p>deep</p>" },
];

const OLD_PAGES = [...PAGES, { path: "old.html", content: "old" }];

const tempDirectory = Effect.gen(function* tempDirectory() {
  const fileSystem = yield* FileSystem.FileSystem;
  return yield* fileSystem.makeTempDirectoryScoped();
});

const writesEveryPage = Effect.gen(function* writesEveryPage() {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const root = yield* tempDirectory;
  const out = path.join(root, "site");
  yield* writeSite(out, PAGES);
  const deep = yield* fileSystem.readFileString(path.join(out, "a/b/index.html"));
  expect(deep).toBe("<p>deep</p>");
}).pipe(Effect.scoped);

const clearsEarlierBuild = Effect.gen(function* clearsEarlierBuild() {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const root = yield* tempDirectory;
  const out = path.join(root, "site");
  yield* writeSite(out, OLD_PAGES);
  yield* writeSite(out, PAGES);
  const old = yield* fileSystem.exists(path.join(out, "old.html"));
  const current = yield* fileSystem.exists(path.join(out, "index.html"));
  expect(old).toBe(false);
  expect(current).toBe(true);
}).pipe(Effect.scoped);

const refusesForeignDirectory = Effect.gen(function* refusesForeignDirectory() {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const root = yield* tempDirectory;
  const precious = path.join(root, "precious.txt");
  yield* fileSystem.writeFileString(precious, "keep");
  const failure = yield* writeSite(root, PAGES).pipe(Effect.flip);
  const kept = yield* fileSystem.readFileString(precious);
  expect(failure).toBeInstanceOf(SiteWriteError);
  expect(kept).toBe("keep");
}).pipe(Effect.scoped);

layer(nodeServices)("writeSite", (it) => {
  it.effect("writes every page under the output directory", () => writesEveryPage);
  it.effect(
    "removes files of an earlier build but nothing it did not write",
    () => clearsEarlierBuild,
  );
  it.effect(
    "refuses a non-empty directory that an earlier build did not create",
    () => refusesForeignDirectory,
  );
});
