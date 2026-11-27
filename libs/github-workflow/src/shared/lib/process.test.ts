import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import { Effect } from "effect";
import { expect, test } from "vite-plus/test";

import { CommandFailed, finished, mustSucceed, outputOf, succeeds } from "./process.ts";

const node = (script: string) => ({ command: "node", args: ["-e", script] });

test("a command that exits with 0 succeeds", () =>
  succeeds(node("process.exit(0)")).pipe(
    Effect.provide(nodeServices),
    Effect.map((passed) => expect(passed).toBe(true)),
    Effect.runPromise,
  ));

test("a command that exits with 1 does not succeed", () =>
  succeeds(node("process.exit(1)")).pipe(
    Effect.provide(nodeServices),
    Effect.map((passed) => expect(passed).toBe(false)),
    Effect.runPromise,
  ));

test("a command that must succeed fails with CommandFailed", () =>
  mustSucceed(node("process.exit(2)")).pipe(
    Effect.flip,
    Effect.provide(nodeServices),
    Effect.map((error) => {
      expect(error).toBeInstanceOf(CommandFailed);
      expect(error.message).toContain("failed");
    }),
    Effect.runPromise,
  ));

test("the output of a command is trimmed", () =>
  outputOf(node("console.log('  hello  ')")).pipe(
    Effect.provide(nodeServices),
    Effect.map((output) => expect(output).toBe("hello")),
    Effect.runPromise,
  ));

test("a finished command reports its output and exit code without failing", () =>
  finished(node("console.log('out'); process.exit(3)")).pipe(
    Effect.provide(nodeServices),
    Effect.map((result) => expect(result).toStrictEqual({ output: "out\n", code: 3 })),
    Effect.runPromise,
  ));
