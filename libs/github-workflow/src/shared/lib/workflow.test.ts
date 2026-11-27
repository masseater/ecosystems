import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import { ConfigProvider, Console, Effect, FileSystem } from "effect";
import { expect, test } from "vite-plus/test";

import { WorkflowFailed, fail, mask, setEnv, warn, writeOutputs } from "./workflow.ts";

const inTemporaryFile = <Success, Failure>(
  use: (path: string) => Effect.Effect<Success, Failure, FileSystem.FileSystem>,
) =>
  Effect.gen(function* withFile() {
    const fs = yield* FileSystem.FileSystem;
    const directory = yield* fs.makeTempDirectoryScoped();
    return yield* use(`${directory}/file`);
  }).pipe(Effect.scoped, Effect.provide(nodeServices));

const capturedLines = Effect.fn("capturedLines")(function* capturedLines(
  effect: Effect.Effect<unknown, unknown>,
) {
  const lines: string[] = [];
  yield* effect.pipe(
    Effect.catch(() => Effect.void),
    Effect.provideService(Console.Console, {
      ...globalThis.console,
      log: (...parts: readonly unknown[]) => {
        lines.push(parts.join(" "));
      },
    } as unknown as Console.Console),
  );
  return lines;
});

test("outputs are appended to the file named by GITHUB_OUTPUT", () =>
  inTemporaryFile((path) =>
    Effect.gen(function* appended() {
      const fs = yield* FileSystem.FileSystem;
      yield* writeOutputs({ changed: "true", count: "2" }).pipe(
        Effect.provide(ConfigProvider.layer(ConfigProvider.fromUnknown({ GITHUB_OUTPUT: path }))),
      );
      yield* setEnv({ TARGET: "main" }).pipe(
        Effect.provide(ConfigProvider.layer(ConfigProvider.fromUnknown({ GITHUB_ENV: path }))),
      );
      const content = yield* fs.readFileString(path);
      expect(content).toBe("changed=true\ncount=2\nTARGET=main\n");
    }),
  ).pipe(Effect.runPromise));

test("annotations are printed as workflow commands", () =>
  Effect.gen(function* annotations() {
    const lines = yield* capturedLines(
      Effect.gen(function* all() {
        yield* warn("careful");
        yield* mask("secret");
        yield* fail("broken");
      }),
    );
    expect(lines).toStrictEqual(["::warning::careful", "::add-mask::secret", "::error::broken"]);
  }).pipe(Effect.runPromise));

test("failing carries the message in WorkflowFailed", () =>
  fail("broken").pipe(
    Effect.flip,
    Effect.map((error) => {
      expect(error).toBeInstanceOf(WorkflowFailed);
      expect(error.message).toBe("broken");
    }),
    Effect.runPromise,
  ));
