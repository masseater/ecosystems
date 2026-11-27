import { Array as Arr, String as Str, pipe } from "effect";
import { Minimatch } from "minimatch";

const NEGATION = "!";

export type Matcher = (path: string) => boolean;

export const matcher = (patterns: readonly string[]): Matcher => {
  const compiled = pipe(
    patterns,
    Arr.map((pattern) => new Minimatch(pattern, { dot: true })),
  );
  return (path) =>
    pipe(
      compiled,
      Arr.some((glob) => glob.match(path)),
    );
};

const isNegated = Str.startsWith(NEGATION);

const isIncluded = (pattern: string): boolean => !isNegated(pattern);

const withoutNegation = Str.slice(NEGATION.length);

export const selects = (patterns: readonly string[]): Matcher => {
  const included = pipe(patterns, Arr.filter(isIncluded), matcher);
  const excluded = pipe(patterns, Arr.filter(isNegated), Arr.map(withoutNegation), matcher);
  return (path) => included(path) && !excluded(path);
};
