#!/usr/bin/env node
import { Array as Arr, Effect, pipe } from "effect";

import { fixManifests } from "#/app/fix-manifests.ts";
import { writeStdout } from "#/app/output.ts";
import { runCli } from "#/app/runtime.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

const mschFix = Effect.gen(function* mschFix() {
  const files = yield* RepositoryFiles;
  const lines = yield* fixManifests(files.resolve("."));
  yield* writeStdout(
    pipe(
      lines,
      Arr.map((line) => `${line}\n`),
      Arr.join(""),
    ),
  );
});

runCli(mschFix);
