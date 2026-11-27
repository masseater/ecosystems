import { Effect, Layer, Schema, Stream } from "effect";
import { ChildProcess } from "effect/process";
import type { ChildProcessSpawner } from "effect/process";

import { mschPlugin } from "#/features/report-problems/index.ts";
import { JSON_FLAG } from "#/shared/lib/cli-contract.ts";
import { ProblemList } from "#/shared/lib/problem.ts";
import type { Problem } from "#/shared/lib/problem.ts";
import { nodeServicesLayer } from "#/shared/lib/repository-files.ts";

const CLI_PATH = new URL(import.meta.resolve("@r_masseater/msch/cli")).pathname;
const decodeProblems = Schema.decodeUnknownEffect(Schema.fromJsonString(ProblemList));

const findProblems = (
  cwd: string,
): Effect.Effect<readonly Problem[], never, ChildProcessSpawner.ChildProcessSpawner> =>
  Effect.gen(function* runChecks() {
    const handle = yield* ChildProcess.make(process.execPath, [CLI_PATH, JSON_FLAG], {
      cwd,
      stdin: "ignore",
    });
    const text = yield* handle.stdout.pipe(Stream.decodeText(), Stream.mkString);
    yield* handle.exitCode;
    return yield* decodeProblems(text);
  }).pipe(Effect.scoped, Effect.orDie);

const withServices = <Value>(
  program: Effect.Effect<Value, never, ChildProcessSpawner.ChildProcessSpawner>,
): Effect.Effect<Value> =>
  Layer.build(nodeServicesLayer).pipe(
    Effect.flatMap((context) => Effect.provideContext(program, context)),
    Effect.scoped,
  );

const lookup = findProblems(process.cwd()).pipe(withServices);

const problems = await Effect.runPromise(lookup);

export default mschPlugin(() => problems);
