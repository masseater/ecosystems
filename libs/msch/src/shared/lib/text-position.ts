import { Array as Arr, Option, String as Str, pipe } from "effect";

import { problemAtPosition } from "./problem.ts";
import type { Problem, RuleName } from "./problem.ts";

const START = 0;
const FIRST_COLUMN = 1;

export const positionOf =
  (source: string) =>
  (index: number): Pick<Problem, "line" | "column"> => {
    const before = pipe(source, Str.slice(START, index), Str.split("\n"));
    return {
      line: before.length,
      column: pipe(
        Arr.last(before),
        Option.match({ onNone: () => FIRST_COLUMN, onSome: (last) => last.length + FIRST_COLUMN }),
      ),
    };
  };

export const problemAtIndex =
  (rule: RuleName) =>
  (file: string, source: string) =>
  (index: number, message: string): Problem =>
    problemAtPosition(rule)(file, positionOf(source)(index), message);
