import { stripVTControlCharacters } from "node:util";

import { Array as Arr, Option, Predicate, String as Str, pipe } from "effect";

const ERROR_LINE = /\[[A-Z_]+\]/u;
const SHOWN_ERRORS = 3;
const HEADER = "Build failed";
const NO_DETAIL = "Run the bundle to see the error.";

const linesOf = (error: unknown): readonly string[] =>
  pipe(
    Option.liftPredicate(error, Predicate.isError),
    Option.map(({ message }) => message),
    Option.getOrElse(() => String(error)),
    stripVTControlCharacters,
    Str.split("\n"),
    Arr.map(Str.trim),
    Arr.filter(Str.isNonEmpty),
  );

export const bundleErrorDetail = (error: unknown): string => {
  const lines = linesOf(error);
  return pipe(
    lines,
    Arr.filter((line) => ERROR_LINE.test(line)),
    Arr.take(SHOWN_ERRORS),
    Arr.match({
      onEmpty: () =>
        pipe(
          lines,
          Arr.findFirst((line) => !Str.startsWith(HEADER)(line)),
          Option.getOrElse(() => NO_DETAIL),
        ),
      onNonEmpty: Arr.join(" "),
    }),
  );
};
