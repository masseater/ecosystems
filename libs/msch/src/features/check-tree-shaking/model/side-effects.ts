import { Array as Arr, Effect, Option, Order, String as Str, pipe } from "effect";

import type { PublicEntry } from "#/entities/package/index.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

import { exportNamesOf, keptIn, never } from "./consumer-bundle.ts";
import type { BundleScope, Effectful, Kept } from "./consumer-bundle.ts";

const RULE: RuleName = "side-effects";
const BUNDLE_CONCURRENCY = 4;
const START = 0;
const FIRST = 1;
const LISTED_PACKAGES = 4;
const SIDE_EFFECTS_KEY = '"sideEffects"';
const EXPORTS_KEY = '"exports"';

export interface Subject {
  readonly scope: BundleScope;
  readonly effectful: Effectful;
  readonly entry: PublicEntry;
}

export interface Excess {
  readonly label: string;
  readonly member: string;
  readonly modules: number;
  readonly packages: readonly string[];
}

const beyond = (kept: Kept, ideal: Kept): Pick<Excess, "modules" | "packages"> => ({
  modules: Arr.difference(kept.modules, ideal.modules).length,
  packages: Arr.difference(kept.packages, ideal.packages),
});

const memberExcess = Effect.fn("memberExcess")(function* memberExcess(
  { scope, effectful, entry }: Subject,
  member: string,
) {
  const consumer = { entry: entry.source, member: Option.some(member) };
  const input = { kind: "consumer", consumer } as const;
  const kept = yield* keptIn(scope, input, effectful);
  const ideal = yield* keptIn(scope, input, never);
  const extra = beyond(kept, ideal);
  return Option.liftPredicate(
    { label: entry.label, member, ...extra },
    ({ modules }) => modules > START,
  );
});

export const excessOf = Effect.fn("excessOf")(function* excessOf(subject: Subject) {
  const names = yield* exportNamesOf(subject.scope, subject.entry.source);
  const found = yield* Effect.forEach(names, (name) => memberExcess(subject, name), {
    concurrency: BUNDLE_CONCURRENCY,
  });
  return Arr.getSomes(found);
});

const listed = (names: readonly string[]): string => {
  const shown = pipe(names, Arr.take(LISTED_PACKAGES), Arr.join(", "));
  if (names.length > LISTED_PACKAGES) {
    return `${shown} and more`;
  }
  return shown;
};

const importsOf = (packages: readonly string[]): string =>
  Arr.match(packages, {
    onEmpty: () => "",
    onNonEmpty: (names) => ` and imports ${listed(names)}`,
  });

const othersOf = (total: number): string => {
  if (total <= FIRST) {
    return "";
  }
  return ` The same happens for ${String(total - FIRST)} other exports.`;
};

const messageOf = (worst: Excess, total: number): string =>
  `importing \`${worst.member}\` from \`${worst.label}\` also bundles ${String(worst.modules)} modules${importsOf(worst.packages)}, which it does not use.${othersOf(total)} Declare "sideEffects": false in package.json so that a bundler drops what nothing imports, and keep a module that must run for its effect out of the package.`;

const largest = Order.mapInput(Order.flip(Order.Number), (excess: Excess) => excess.modules);

const keyIndex = (source: string): number =>
  pipe(
    Str.indexOf(SIDE_EFFECTS_KEY)(source),
    Option.orElse(() => Str.indexOf(EXPORTS_KEY)(source)),
    Option.getOrElse(() => START),
  );

export interface ExcessReport {
  readonly file: string;
  readonly source: string;
  readonly excesses: readonly Excess[];
}

export const sideEffectProblems = ({ file, source, excesses }: ExcessReport): readonly Problem[] =>
  pipe(
    excesses,
    Arr.sortBy(largest),
    Arr.head,
    Option.map((worst): Problem => ({
      file,
      ...positionOf(source)(keyIndex(source)),
      rule: RULE,
      message: messageOf(worst, excesses.length),
    })),
    Option.toArray,
  );
