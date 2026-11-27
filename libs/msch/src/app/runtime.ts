import { runMainWith } from "@r_masseater/node-main";
import { Cause, Effect, Option, Schema, Stdio, Stream } from "effect";
import type { FileSystem, Path } from "effect";
import type { HttpClient } from "effect/http";
import type { ChildProcessSpawner } from "effect/process";

import { nodeRepositoryFiles } from "#/shared/lib/repository-files.ts";
import type { RepositoryFiles } from "#/shared/lib/repository-files.ts";

import { ProblemsFound } from "./output.ts";

const reportFailure = <Failure>(
  cause: Cause.Cause<Failure>,
): Effect.Effect<void, never, Stdio.Stdio> =>
  Effect.gen(function* report() {
    const stdio = yield* Stdio.Stdio;
    const failed = Cause.findErrorOption(cause).pipe(Option.exists(Schema.is(ProblemsFound)));
    if (failed) {
      return;
    }
    yield* Stream.make(`${Cause.pretty(cause)}\n`).pipe(Stream.run(stdio.stderr()), Effect.orDie);
  });

/** @internal */
export const runCli = <Value, Failure>(
  program: Effect.Effect<
    Value,
    Failure,
    | RepositoryFiles
    | Stdio.Stdio
    | FileSystem.FileSystem
    | Path.Path
    | ChildProcessSpawner.ChildProcessSpawner
    | HttpClient.HttpClient
  >,
): void => {
  runMainWith({
    serviceName: "msch",
    services: nodeRepositoryFiles,
    onFailure: reportFailure,
  })(program);
};
