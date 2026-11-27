import { Predicate } from "effect";

import type { Position } from "#/shared/config/index.ts";

export interface Sink {
  readonly error: (at: Position, message: string) => void;
}

export const reportMissing =
  (sink: Sink) =>
  (value: unknown, at: Position, message: string): void => {
    if (Predicate.isUndefined(value)) {
      sink.error(at, message);
    }
  };
