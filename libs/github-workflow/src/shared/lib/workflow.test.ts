import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { Array as Arr, ConfigProvider, Console, Effect, FileSystem } from "effect";
import { expect } from "vite-plus/test";

import { WorkflowFailed, fail, mask, setEnv, warn, writeOutputs } from "./workflow.ts";

const configOf = (values: Readonly<Record<string, string>>): ConfigProvider.ConfigProvider =>
  ConfigProvider.fromUnknown(values);

const printedBy = Effect.fn("printedBy")(function* printedBy(
  effect: Effect.Effect<void, WorkflowFailed>,
) {
  const lines: string[] = [];
  const recording: Console.Console = {
    ...globalThis.console,
    log: (...parts: readonly string[]): void => {
      lines.push(Arr.join(parts, " "));
    },
  };
  yield* Effect.ignore(effect.pipe(Effect.provideService(Console.Console, recording)));
  return lines;
});

layer(nodeServices)("workflow commands", (it) => {
  it.effect("outputs are appended to the file named by GITHUB_OUTPUT", () =>
    Effect.gen(function* appended() {
      const fs = yield* FileSystem.FileSystem;
      const path = `${yield* fs.makeTempDirectoryScoped()}/file`;
      yield* writeOutputs({ changed: "true", count: "2" }).pipe(
        Effect.provideService(ConfigProvider.ConfigProvider, configOf({ GITHUB_OUTPUT: path })),
      );
      yield* setEnv({ TARGET: "main" }).pipe(
        Effect.provideService(ConfigProvider.ConfigProvider, configOf({ GITHUB_ENV: path })),
      );
      const content = yield* fs.readFileString(path);
      expect(content).toBe("changed=true\ncount=2\nTARGET=main\n");
    }),
  );

  it.effect("annotations are printed as workflow commands", () =>
    Effect.gen(function* annotations() {
      const lines = yield* printedBy(
        Effect.gen(function* all() {
          yield* warn("careful");
          yield* mask("secret");
          return yield* fail("broken");
        }),
      );
      expect(lines).toStrictEqual(["::warning::careful", "::add-mask::secret", "::error::broken"]);
    }),
  );

  it.effect("failing carries the message in WorkflowFailed", () =>
    Effect.gen(function* failing() {
      const error = yield* Effect.flip(fail("broken"));
      expect(error).toBeInstanceOf(WorkflowFailed);
      expect(error.message).toBe("broken");
    }),
  );
});
