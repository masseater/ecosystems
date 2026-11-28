#!/usr/bin/env node
import { Effect, Schema, Stdio } from "effect";

import { runCli } from "#/app/runtime.ts";
import {
  checkCompat,
  planOf,
  prepublish,
  publishRelease,
  publishToNpm,
  writeCompatPlan,
  writePlan,
} from "#/features/publish-workspace/index.ts";

const Arguments = Schema.Tuple([
  Schema.Literals(["plan", "npm", "release", "compat", "compat-plan", "prepublish"]),
  Schema.String,
]);

const taggedError = Schema.TaggedError;

class UsageError extends taggedError<UsageError, { readonly brand: unique symbol }>()(
  "UsageError",
  { message: Schema.String },
) {}

const USAGE =
  "usage: msch-publish <plan|npm|release|compat|compat-plan|prepublish> <workspace directory>";

const steps = {
  plan: Effect.fn("plan")(function* plan(directory: string) {
    return yield* planOf(directory).pipe(Effect.flatMap(writePlan));
  }),
  npm: publishToNpm,
  prepublish,
  release: publishRelease,
  compat: checkCompat,
  "compat-plan": Effect.fn("compat-plan")(function* compatPlan() {
    return yield* writeCompatPlan();
  }),
};

const publish = Effect.gen(function* publish() {
  const stdio = yield* Stdio.Stdio;
  const args = yield* stdio.args;
  const [step, directory] = yield* Schema.decodeUnknownEffect(Arguments)(args).pipe(
    Effect.mapError(() => UsageError.make({ message: USAGE })),
  );
  return yield* steps[step](directory);
});

runCli(publish);
