import { Array as Arr, Effect, Option, pipe } from "effect";

import { isBinEntry } from "#/entities/package/index.ts";
import type { PublicEntry } from "#/entities/package/index.ts";

import { always, keptIn } from "./consumer-bundle.ts";
import type { BundleInput, BundleScope } from "./consumer-bundle.ts";
import type { Declared } from "./manifest.ts";

export interface Used {
  readonly entry: PublicEntry;
  readonly packages: readonly string[];
  readonly modules: readonly string[];
}

const inputOf = (entry: PublicEntry): BundleInput => {
  if (isBinEntry(entry)) {
    return { kind: "program", file: entry.source };
  }
  return {
    kind: "consumer",
    consumer: { entry: entry.source, member: Option.none<string>() },
  };
};

export const usedBy = Effect.fn("usedBy")(function* usedBy(scope: BundleScope, entry: PublicEntry) {
  const kept = yield* keptIn(scope, inputOf(entry), always);
  return { entry, packages: kept.packages, modules: kept.modules } satisfies Used;
});

export interface Scan {
  readonly used: readonly Used[];
  readonly declared: Declared;
}

export const modulesToScan = ({ used, declared }: Scan): readonly string[] =>
  pipe(
    used,
    Arr.filter(({ entry }) => !isBinEntry(entry)),
    Arr.flatMap(({ modules }) => modules),
    Arr.dedupe,
    Arr.filter((module) => !declared.entries.has(module)),
  );
