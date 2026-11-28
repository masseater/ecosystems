import { Array as Arr, Effect, HashMap, Option, pipe } from "effect";

import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

import { linksIn, markdownTexts, referenceOf } from "./reference-links.ts";
import { describeReference } from "./reference.ts";
import type { Reference } from "./reference.ts";
import { resolveReference } from "./resolve-reference.ts";
import type { Outcome } from "./resolve-reference.ts";

const LOOKUP_CONCURRENCY = 4;

/** @internal */
export interface UnresolvedReference {
  readonly file: string;
  readonly line: number;
  readonly reference: string;
  readonly outcome: "broken" | "unchecked";
  readonly reason: string;
}

interface Occurrence {
  readonly file: string;
  readonly line: number;
  readonly reference: Reference;
}

const occurrencesIn = (file: string, source: string): readonly Occurrence[] =>
  pipe(
    linksIn(source),
    Arr.flatMap(({ destination, index }) =>
      pipe(
        referenceOf(destination),
        Option.map((reference): Occurrence => ({
          file,
          line: positionOf(source)(index).line,
          reference,
        })),
        Option.toArray,
      ),
    ),
  );

interface Place {
  readonly file: string;
  readonly line: number;
  readonly reference: string;
}

const unresolvedAt =
  (place: Place) =>
  (outcome: Outcome): Option.Option<UnresolvedReference> => {
    if (outcome.kind === "found") {
      return Option.none();
    }
    return Option.some({ ...place, outcome: outcome.kind, reason: outcome.reason });
  };

const unresolvedOf =
  (outcomes: HashMap.HashMap<string, Outcome>) =>
  ({ file, line, reference }: Occurrence): readonly UnresolvedReference[] => {
    const described = describeReference(reference);
    return pipe(
      outcomes,
      HashMap.get(described),
      Option.flatMap(unresolvedAt({ file, line, reference: described })),
      Option.toArray,
    );
  };

/** @internal */
export const unresolvedReferences = Effect.fn("unresolvedReferences")(
  function* unresolvedReferences(root: string) {
    const files = yield* RepositoryFiles;
    const texts = yield* markdownTexts(root);
    const occurrences = pipe(
      texts,
      Arr.flatMap(({ file, source }) => occurrencesIn(files.relative(root, file), source)),
    );
    const distinct = pipe(
      occurrences,
      Arr.dedupeWith(
        (left, right) => describeReference(left.reference) === describeReference(right.reference),
      ),
      Arr.map(({ reference }) => reference),
    );
    const resolved = yield* Effect.forEach(
      distinct,
      (reference) =>
        Effect.map(
          resolveReference(reference),
          (outcome) => [describeReference(reference), outcome] as const,
        ),
      { concurrency: LOOKUP_CONCURRENCY },
    );
    const outcomes = HashMap.fromIterable(resolved);
    return pipe(occurrences, Arr.flatMap(unresolvedOf(outcomes)));
  },
);
