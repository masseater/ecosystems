import { TextlintKernelDescriptor } from "@textlint/kernel";
import type { TextlintMessage } from "@textlint/types";
import { Array as Arr, Effect, pipe } from "effect";
import { createLinter } from "textlint";
import { loadBuiltinPlugins } from "textlint/lib/src/loader/TextlintrcLoader.js";
import { describe, expect, test } from "vite-plus/test";

import { noNiAruFile } from "./no-ni-aru-file.ts";

const MARKDOWN = "doc.md";
const SECOND_PARAGRAPH_LINE = 3;
const linter = Effect.map(Effect.promise(loadBuiltinPlugins), (builtIn) =>
  createLinter({
    descriptor: new TextlintKernelDescriptor({
      rules: [{ ruleId: "no-ni-aru-file", rule: noNiAruFile, options: true }],
      filterRules: [],
      plugins: builtIn.toKernelOptions().plugins ?? [],
    }),
  }),
);

const messagesOf = (text: string): Effect.Effect<readonly TextlintMessage[]> =>
  linter.pipe(
    Effect.flatMap((loaded) => Effect.promise(() => loaded.lintText(text, MARKDOWN))),
    Effect.map((result) => result.messages),
  );

const check = <Value>(found: Effect.Effect<Value>, assert: (value: Value) => void): Promise<void> =>
  Effect.runPromise(found.pipe(Effect.map(assert)));

const textsOf = (text: string): Effect.Effect<readonly string[]> =>
  messagesOf(text).pipe(
    Effect.map((messages) =>
      pipe(
        messages,
        Arr.map((message) => message.message),
      ),
    ),
  );

const FLAGGED = [
  ["詳細は [foo.md](references/foo.md) にある。\n"],
  ["詳細は[`foo`](../references/foo.md)にある。\n"],
  ["設定は `config/app.json` にある。\n"],
  ["詳細は README.md にある。\n"],
  ["- 有料機能を外すときの前提は [paid-features.md](references/paid-features.md) にある。\n"],
  [
    "色の使い方は [palette.md](palette.md)、各系統の描き方は [schematic.md](schematic.md) にある。\n",
  ],
  ["理由は `made-refine.md` にあります。\n"],
  ["描き方は [a.md](a.md)、[b.md](b.md)、[c.md](c.md) にある。\n"],
  ["図は [a.md](a.md) と [b.md](b.md) にある。\n"],
  ["手順は [setup.md](setup.md) にある\n"],
] as const;

const ALLOWED = [
  ["詳細は [foo.md](references/foo.md) に書いてある。\n"],
  ["詳細は [foo.md](references/foo.md) を読む。\n"],
  ["`settings.json` は `~/.claude/` にある。\n"],
  ["`foo.ts` の定義は `bar.ts` にある。\n"],
  ["ソースは `src/` にある。\n"],
  ["ドメインは `masseater.dev` にある。\n"],
  ["公式の説明は [npm trust](https://docs.npmjs.com/cli/v11/commands/npm-trust) にある。\n"],
  ["`foo.ts` にある関数を呼ぶ。\n"],
  ["詳細は [foo.md](foo.md) にあるものを使う。\n"],
  ["[foo.md](foo.md) にある。\n"],
  ["```\n詳細は foo.md にある。\n```\n"],
] as const;

describe("no-ni-aru-file", () => {
  test.each(FLAGGED)("flags %j", (text) =>
    check(textsOf(text), (messages) => {
      expect(messages).toStrictEqual([expect.stringContaining("にある")]);
    }),
  );

  test.each(ALLOWED)("leaves %j alone", (text) =>
    check(textsOf(text), (messages) => {
      expect(messages).toStrictEqual([]);
    }),
  );

  test("suggests a natural phrasing", () =>
    check(textsOf("詳細は [foo.md](foo.md) にある。\n"), (messages) => {
      expect(messages).toStrictEqual([expect.stringContaining("に書いてある")]);
    }));

  test("reports the line of the sentence", () =>
    check(messagesOf("最初の文はここで終わる。\n\n詳細は foo.md にある。\n"), (messages) => {
      expect(
        pipe(
          messages,
          Arr.map((message) => message.loc.start.line),
        ),
      ).toStrictEqual([SECOND_PARAGRAPH_LINE]);
    }));
});
