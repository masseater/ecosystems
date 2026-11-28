import { Array as Arr, Effect, Option, Predicate, String as Str, pipe } from "effect";
import { parse } from "vite-plus";

import { childrenOf, propertyValue, stringsIn } from "#/entities/workspace/index.ts";
import type { FoundString } from "#/entities/workspace/index.ts";

import type { PathMention } from "./path-mention.ts";

const WRAP_OFFSET = 1;
const WILDCARD = /[*?[{]/u;
const SEPARATOR = "/";
const RELATIVE = ".";
const JSON_EXTENSION = ".json";

const isObject = (node: unknown): boolean =>
  Predicate.isReadonlyObject(node) && node["type"] === "ObjectExpression";

const firstObject = (node: unknown): Option.Option<unknown> => {
  if (isObject(node)) {
    return Option.some(node);
  }
  return pipe(childrenOf(node), Arr.findFirst(firstObject));
};

const leadingDirectory = (pattern: string): string =>
  pipe(
    Str.split(pattern, SEPARATOR),
    Arr.takeWhile((segment) => !WILDCARD.test(segment)),
    Arr.join(SEPARATOR),
  );

const listed =
  (root: unknown) =>
  (
    name: string,
    candidatesOf: (text: string) => readonly string[],
    valuesOf: (value: unknown) => readonly FoundString[] = stringsIn,
  ): readonly PathMention[] =>
    pipe(
      propertyValue(name)(root),
      Option.toArray,
      Arr.flatMap(valuesOf),
      Arr.map(({ text, start }: FoundString): PathMention => ({
        field: name,
        text,
        candidates: candidatesOf(text),
        index: start - WRAP_OFFSET,
      })),
      Arr.filter(({ candidates }) => Arr.isReadonlyArrayNonEmpty(candidates)),
    );

const objectsIn = (node: unknown): readonly unknown[] => [
  ...Arr.filter([node], isObject),
  ...pipe(childrenOf(node), Arr.flatMap(objectsIn)),
];

const referencedPaths = (references: unknown): readonly FoundString[] =>
  pipe(
    objectsIn(references),
    Arr.flatMap((reference) => Option.toArray(propertyValue("path")(reference))),
    Arr.flatMap(stringsIn),
  );

const exactly = (text: string): readonly string[] => [text];
const relativeConfig = (text: string): readonly string[] => {
  if (Str.startsWith(RELATIVE)(text)) {
    return [text, `${text}${JSON_EXTENSION}`];
  }
  return [];
};
const patternRoot = (text: string): readonly string[] =>
  pipe([leadingDirectory(text)], Arr.filter(Str.isNonEmpty));

/** @internal */
export const tsconfigMentions = Effect.fn("tsconfigMentions")(function* tsconfigMentions(
  file: string,
  source: string,
) {
  const parsed = yield* Effect.promise(() => parse(`${file}.ts`, `(${source})`, { lang: "ts" }));
  const program: unknown = parsed.program;
  const root = firstObject(program);
  return pipe(
    root,
    Option.toArray,
    Arr.flatMap((object) =>
      Arr.flatten([
        listed(object)("references", exactly, referencedPaths),
        listed(object)("extends", relativeConfig),
        listed(object)("files", exactly),
        listed(object)("include", patternRoot),
      ]),
    ),
  );
});
