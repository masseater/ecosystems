import { Array as Arr, Option, Record as Rec, Schema, String as Str, pipe } from "effect";
import { getStaticTOMLValue, parseTOML } from "toml-eslint-parser";

import { indexOfText } from "./path-mention.ts";
import type { PathMention } from "./path-mention.ts";

const MEMBER_LISTS = ["members", "exclude", "default-members"];
const DEPENDENCY_TABLES = ["dependencies", "dev-dependencies", "build-dependencies"];
const WORKSPACE = "workspace";
const PATCH = "patch";
const PATCH_DEPTH = 2;
const WORKSPACE_DEPTH = 1;
const START = 0;
const WILDCARD = /[*?[]/u;
const KEY_SEPARATOR = ".";

const decodeTable = Schema.decodeUnknownOption(Schema.Record(Schema.String, Schema.Unknown));
const decodeStrings = Schema.decodeUnknownOption(Schema.Array(Schema.String));
const decodePath = Schema.decodeUnknownOption(Schema.Struct({ path: Schema.String }));

interface NamedPath {
  readonly field: string;
  readonly target: string;
}

const declaresPath = (trail: readonly string[]): boolean =>
  pipe(
    Arr.last(trail),
    Option.exists((name) => Arr.contains(DEPENDENCY_TABLES, name)),
  ) ||
  (trail.length === PATCH_DEPTH &&
    Arr.get(trail, START).pipe(Option.exists((name) => name === PATCH)));

const listsMembers = (trail: readonly string[], key: string): boolean =>
  trail.length === WORKSPACE_DEPTH &&
  Arr.get(trail, START).pipe(Option.exists((name) => name === WORKSPACE)) &&
  Arr.contains(MEMBER_LISTS, key);

const namedPaths = (
  trail: readonly string[],
  key: string,
  value: unknown,
): readonly NamedPath[] => {
  const field = Arr.join([...trail, key], KEY_SEPARATOR);
  if (listsMembers(trail, key)) {
    return pipe(
      decodeStrings(value),
      Option.getOrElse((): readonly string[] => []),
      Arr.filter((member) => !WILDCARD.test(member)),
      Arr.map((member) => ({ field, target: member })),
    );
  }
  if (declaresPath(trail)) {
    return pipe(
      decodePath(value),
      Option.toArray,
      Arr.map(({ path }) => ({ field: `${field}${KEY_SEPARATOR}path`, target: path })),
    );
  }
  return [];
};

const pathsIn =
  (trail: readonly string[]) =>
  (value: unknown): readonly NamedPath[] =>
    pipe(
      decodeTable(value),
      Option.map(Rec.toEntries),
      Option.getOrElse((): readonly (readonly [string, unknown])[] => []),
      Arr.flatMap(([key, child]) => [
        ...namedPaths(trail, key, child),
        ...pathsIn([...trail, key])(child),
      ]),
    );

/** @internal */
export const cargoMentions = (source: string): readonly PathMention[] =>
  pipe(
    Option.liftThrowable(() => getStaticTOMLValue(parseTOML(source)))(),
    Option.toArray,
    Arr.flatMap(pathsIn([])),
    Arr.filter(({ target }) => Str.isNonEmpty(target)),
    Arr.map(({ field, target }) => ({
      field,
      text: target,
      candidates: [target],
      index: indexOfText(source)(target),
    })),
  );
