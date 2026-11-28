import { Array as Arr, Option, Predicate, Record as Rec, pipe } from "effect";

import { mergeAll } from "./merge.ts";
import { ANY, BOOL, NULL, NUMBER, STRING, arrayOf, strict } from "./types.ts";
import type { ExprType } from "./types.ts";

const SCALARS: Readonly<Record<string, ExprType>> = {
  boolean: BOOL,
  number: NUMBER,
  string: STRING,
};

export const ofJson = (value: unknown): ExprType => {
  if (value === null) {
    return NULL;
  }
  if (Arr.isArray(value)) {
    const items: readonly unknown[] = value;
    const types = pipe(
      items,
      Arr.map((item) => ofJson(item)),
    );
    return arrayOf(mergeAll(types));
  }
  if (Predicate.isObject(value)) {
    return strict(
      pipe(
        value,
        Rec.map((prop) => ofJson(prop)),
      ),
    );
  }
  return Option.getOrElse(Rec.get(SCALARS, typeof value), () => ANY);
};
