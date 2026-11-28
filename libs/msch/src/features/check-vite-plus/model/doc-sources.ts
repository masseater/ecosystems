import { groupOf } from "@masseater.dev/lint-host/collections";
import { Array as Arr, Option, String as Str, pipe } from "effect";

import { positionOf } from "#/shared/lib/text-position.ts";

import type { CommandSource } from "./command-sources.ts";

const FENCE = /^(?<open>```(?:sh|bash|shell|console|zsh)?[ \t]*\n)(?<body>[\s\S]*?)^```[ \t]*$/gmu;
const INLINE_CODE = /(?<open>(?<!`)`)(?<body>[^`\n]+)`(?!`)/gu;

interface CodeSpan {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

const codeIn =
  (pattern: RegExp) =>
  (source: string): readonly CodeSpan[] =>
    pipe(
      Arr.fromIterable(Str.matchAll(pattern)(source)),
      Arr.flatMap((match) =>
        pipe(
          Option.all({
            open: groupOf("open")(match),
            text: groupOf("body")(match),
            whole: Arr.head(match),
            index: Option.fromUndefinedOr(match.index),
          }),
          Option.map(({ open, text, whole, index }) => ({
            text,
            start: index + open.length,
            end: index + whole.length,
          })),
          Option.toArray,
        ),
      ),
    );

const outside =
  (fences: readonly CodeSpan[]) =>
  (span: CodeSpan): boolean =>
    !pipe(
      fences,
      Arr.some((fence) => span.start >= fence.start && span.start < fence.end),
    );

export const docSources =
  (file: string) =>
  (source: string): readonly CommandSource[] => {
    const fences = codeIn(FENCE)(source);
    const inline = pipe(codeIn(INLINE_CODE)(source), Arr.filter(outside(fences)));
    return pipe(
      [...fences, ...inline],
      Arr.map(({ text, start }): CommandSource => ({
        kind: "doc",
        file,
        position: positionOf(source)(start),
        name: "code",
        text,
      })),
    );
  };
