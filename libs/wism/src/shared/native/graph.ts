import { STRING_WORDS, WORD, spanText, wordAt } from "@masseater.dev/lint-host";
import { Array as Arr, Option, String as Str, pipe } from "effect";

import type { GraphEdge, ImportTarget } from "#/shared/config/index.ts";

const HEADER_WORDS = 3;
const EDGE_WORDS = 7;
const UTF8 = "utf8";
const BYTE = 1;
const HEADER = { edges: 0, strings: 1 } as const;
const FIELD = {
  from: 0,
  kind: 1,
  target: 2,
  specifier: 3,
  line: 4,
  column: 5,
  wildcard: 6,
} as const;
const MODULE = 1;
const WILDCARD = 1;
const MODULE_SEPARATOR = "::";

const stringsOf = (words: Uint32Array): ((index: number) => string) => {
  const spans = HEADER_WORDS + wordAt(words)(HEADER.edges) * EDGE_WORDS;
  const blob = new Uint8Array(
    words.buffer,
    words.byteOffset + (spans + wordAt(words)(HEADER.strings) * STRING_WORDS) * WORD,
  );
  return spanText(words)(blob, UTF8)(spans, BYTE);
};

const targetOf = (kind: number, value: string): ImportTarget => {
  if (kind === MODULE) {
    return { type: "module", value: Str.split(value, MODULE_SEPARATOR) };
  }
  return { type: "file", value };
};

export const decodeGraph =
  (files: readonly string[]) =>
  (words: Uint32Array): readonly GraphEdge[] => {
    const text = stringsOf(words);
    const field = (base: number, name: keyof typeof FIELD): number =>
      wordAt(words)(base + FIELD[name]);
    const count = wordAt(words)(HEADER.edges);
    return pipe(
      Arr.makeBy(count, (index) => HEADER_WORDS + index * EDGE_WORDS),
      Arr.take(count),
      Arr.map((base): GraphEdge => ({
        from: Option.getOrElse(Arr.get(files, field(base, "from")), () => ""),
        specifier: text(field(base, "specifier")),
        target: targetOf(field(base, "kind"), text(field(base, "target"))),
        line: field(base, "line"),
        column: field(base, "column"),
        wildcard: field(base, "wildcard") === WILDCARD,
      })),
    );
  };
