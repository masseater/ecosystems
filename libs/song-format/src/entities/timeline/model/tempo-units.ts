import type { From } from "#/shared/lib/from.ts";

const MICROSECONDS_PER_MINUTE = 60_000_000;

export const bpmOf: From<number, number> = (microseconds) => MICROSECONDS_PER_MINUTE / microseconds;

export const microsecondsOf: From<number, number> = (bpm) =>
  Math.round(MICROSECONDS_PER_MINUTE / bpm);
