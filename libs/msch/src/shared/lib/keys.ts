import { Option, Record as Rec, pipe } from "effect";

/** @internal */
export const keysOf = (map: Readonly<Record<string, string>> | undefined): readonly string[] =>
  pipe(
    Option.fromUndefinedOr(map),
    Option.map(Rec.keys),
    Option.getOrElse((): readonly string[] => []),
  );
