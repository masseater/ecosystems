import { Option } from "effect";
import { expect, test } from "vite-plus/test";

import { nameLiteral, quoted, renderSegments, text } from "./segment.ts";

test("a name without a span is quoted as text", () => {
  expect(nameLiteral({ name: "a b", span: Option.none() })).toStrictEqual([text('"a b"')]);
});

test("a plain name keeps the original characters between quotes", () => {
  const segments = nameLiteral({ name: "abc", span: Option.some({ start: 2, end: 5 }) });
  expect(renderSegments({ content: "--abc--", segments })).toBe('"abc"');
  expect(segments).toMatchObject([{ kind: "text" }, { kind: "verbatim" }, { kind: "text" }]);
});

test("a name that needs escaping becomes an alias of the original span", () => {
  const segments = nameLiteral({ name: 'a"b', span: Option.some({ start: 0, end: 3 }) });
  expect(segments).toStrictEqual([{ kind: "alias", text: String.raw`"a\"b"`, start: 0, end: 3 }]);
});

test("quoting escapes quotes and backslashes", () => {
  expect(quoted(String.raw`a"\b`)).toBe(String.raw`"a\"\\b"`);
});

test("rendering joins text, verbatim, alias and atom in order", () => {
  const rendered = renderSegments({
    content: "0123456789",
    segments: [
      text("<"),
      { kind: "verbatim", start: 1, end: 3 },
      { kind: "alias", text: "X", start: 4, end: 5 },
      { kind: "atom", text: "Y", start: 6, end: 7 },
      text(">"),
    ],
  });
  expect(rendered).toBe("<12XY>");
});
