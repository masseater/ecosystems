import { Effect, Option } from "effect";
import { expect, test } from "vite-plus/test";

import { whileParentAlive } from "./parent-process.ts";

const MISSING_PID = "2147483646";

test("a program with no parent pid runs to its end", () =>
  Effect.gen(function* noParent() {
    const result = yield* Effect.succeed("done").pipe(
      Effect.tap((value) => Effect.sync(() => expect(value).toBe("done"))),
      whileParentAlive(Option.none()),
    );
    expect(result).toBeUndefined();
  }).pipe(Effect.runPromise));

test("a program stops when its parent pid no longer exists", () =>
  Effect.gen(function* deadParent() {
    const result = yield* Effect.never.pipe(whileParentAlive(Option.some(MISSING_PID)));
    expect(result).toBeUndefined();
  }).pipe(Effect.runPromise));

test("a program keeps running while its parent is alive", () =>
  Effect.gen(function* aliveParent() {
    const result = yield* Effect.succeed("done").pipe(
      whileParentAlive(Option.some(globalThis.String(globalThis.process.pid))),
    );
    expect(result).toBeUndefined();
  }).pipe(Effect.runPromise));
