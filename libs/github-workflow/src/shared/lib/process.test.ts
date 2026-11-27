import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { Effect } from "effect";
import { expect } from "vite-plus/test";

import type { Command } from "./process.ts";
import { CommandFailed, finished, mustSucceed, outputOf, succeeds } from "./process.ts";

const node = (script: string): Command => ({ command: "node", args: ["-e", script] });

layer(nodeServices)("commands", (it) => {
  it.effect("a command that exits with 0 succeeds", () =>
    Effect.gen(function* passes() {
      const passed = yield* succeeds(node("process.exit(0)"));
      expect(passed).toBe(true);
    }),
  );

  it.effect("a command that exits with 1 does not succeed", () =>
    Effect.gen(function* fails() {
      const passed = yield* succeeds(node("process.exit(1)"));
      expect(passed).toBe(false);
    }),
  );

  it.effect("a command that must succeed fails with CommandFailed", () =>
    Effect.gen(function* mustPass() {
      const error = yield* Effect.flip(mustSucceed(node("process.exit(2)")));
      expect(error).toBeInstanceOf(CommandFailed);
      expect(error.message).toContain("failed");
    }),
  );

  it.effect("the output of a command is trimmed", () =>
    Effect.gen(function* trimmed() {
      const output = yield* outputOf(node("console.log('  hello  ')"));
      expect(output).toBe("hello");
    }),
  );

  it.effect("a finished command reports its output and exit code without failing", () =>
    Effect.gen(function* reported() {
      const result = yield* finished(node("console.log('out'); process.exit(3)"));
      expect(result).toStrictEqual({ output: "out\n", code: 3 });
    }),
  );
});
