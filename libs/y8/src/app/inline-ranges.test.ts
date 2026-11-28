import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import { Array as Arr, Effect, ManagedRuntime, Option, String as Str, pipe } from "effect";
import { afterAll, expect, test } from "vite-plus/test";

import { lintFiles } from "./lint.test.support.ts";

const services = ManagedRuntime.make(nodeServices);
afterAll(() => services.dispose());

const THIRD_SENTENCE_LINE = 2;
const FIRST_COLUMN = 0;

const SENTENCES =
  "# Title\n\nFirst * a * sentence. <!-- y8-disable MD037 -->Second * b * sentence.<!-- y8-enable MD037 --> Third * c * sentence.\n";

const columnOfThird = pipe(
  SENTENCES,
  Str.split("\n"),
  Arr.get(THIRD_SENTENCE_LINE),
  Option.flatMap(Str.indexOf("Third")),
  Option.getOrElse(() => FIRST_COLUMN),
);

test("a y8 comment stops the rule only between its two comments", () =>
  Effect.gen(function* ranged() {
    const diagnostics = yield* lintFiles(
      { "doc.md": SENTENCES },
      { rules: { "markdownlint/MD013": "off" } },
    );
    expect(
      pipe(
        diagnostics,
        Arr.map(
          ({ rule, column }) => `${rule} ${String((column ?? FIRST_COLUMN) > columnOfThird)}`,
        ),
      ),
    ).toStrictEqual([
      "markdownlint/MD037 false",
      "markdownlint/MD037 false",
      "markdownlint/MD037 true",
      "markdownlint/MD037 true",
    ]);
  }).pipe(services.runPromise));

test("reportUnusedDirectives reports a y8 comment that stops nothing", () =>
  Effect.gen(function* unused() {
    const files = { "doc.md": "# Title\n\n<!-- y8-disable-next-line MD009 -->\nClean line.\n" };
    const quiet = yield* lintFiles(files, {});
    expect(quiet).toStrictEqual([]);
    const reported = yield* lintFiles(files, { reportUnusedDirectives: true });
    expect(
      pipe(
        reported,
        Arr.map(({ path, rule }) => `${path} ${rule}`),
      ),
    ).toStrictEqual(["doc.md y8/unused-directive"]);
  }).pipe(services.runPromise));
