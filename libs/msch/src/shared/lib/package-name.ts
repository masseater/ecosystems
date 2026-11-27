import { Array as Arr, String as Str, pipe } from "effect";

const SCOPE = "@";
const SEPARATOR = "/";
const SCOPED_SEGMENTS = 2;
const PLAIN_SEGMENTS = 1;

const segmentCount = (specifier: string): number => {
  if (Str.startsWith(SCOPE)(specifier)) {
    return SCOPED_SEGMENTS;
  }
  return PLAIN_SEGMENTS;
};

export const packageNameOf = (specifier: string): string =>
  pipe(Str.split(specifier, SEPARATOR), Arr.take(segmentCount(specifier)), Arr.join(SEPARATOR));
