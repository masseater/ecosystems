import { it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { expect } from "vite-plus/test";

import { whileParentAlive } from "./parent-process.ts";

const MISSING_PID = "2147483646";
const OWN_PID = Option.some(globalThis.String(globalThis.process.pid));

it.effect("a program with no parent pid runs to its end", () =>
  Effect.gen(function* noParent() {
    const result = yield* Effect.succeed("done").pipe(whileParentAlive(Option.none()));
    expect(result).toBeUndefined();
  }),
);

it.effect("a program stops when its parent pid no longer exists", () =>
  Effect.gen(function* deadParent() {
    const result = yield* Effect.never.pipe(whileParentAlive(Option.some(MISSING_PID)));
    expect(result).toBeUndefined();
  }),
);

it.effect("a program keeps running while its parent is alive", () =>
  Effect.gen(function* aliveParent() {
    const result = yield* Effect.succeed("done").pipe(whileParentAlive(OWN_PID));
    expect(result).toBeUndefined();
  }),
);
