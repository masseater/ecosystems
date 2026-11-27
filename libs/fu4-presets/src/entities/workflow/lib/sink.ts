import type { Position } from "@r_masseater/fu4";
import { Predicate } from "effect";

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
