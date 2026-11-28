import { Array as Arr, Option, Order, String as Str, pipe } from "effect";

export interface PathMention {
  readonly field: string;
  readonly text: string;
  readonly candidates: readonly string[];
  readonly index: number;
}

const START = 0;
const QUOTES = ['"', "'"];

const firstIndex = (source: string, needles: readonly string[]): Option.Option<number> => {
  const found = pipe(
    needles,
    Arr.flatMap((needle) => Option.toArray(Str.indexOf(needle)(source))),
  );
  return Arr.head(Arr.sort(found, Order.Number));
};

const quoted = (text: string): readonly string[] =>
  pipe(
    QUOTES,
    Arr.map((quote) => `${quote}${text}${quote}`),
  );

export const indexOfText =
  (source: string) =>
  (text: string): number =>
    pipe(
      firstIndex(source, quoted(text)),
      Option.orElse(() => firstIndex(source, [text])),
      Option.getOrElse(() => START),
    );
