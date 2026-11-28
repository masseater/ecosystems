import { describeReference, linksIn, referenceOf } from "@r_masseater/y8";
import type { LinkAt, Reference } from "@r_masseater/y8";
import { Array as Arr, Effect, HashMap, Option, pipe } from "effect";

import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

import { markdownTexts } from "./markdown-texts.ts";
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

const occurrencesIn = (links: readonly LinkAt[]): readonly Occurrence[] =>
  Arr.flatMap(links, ({ path, line, destination }) =>
    pipe(
      referenceOf(destination),
      Option.map((reference): Occurrence => ({ file: path, line, reference })),
      Option.toArray,
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
    const links = yield* linksIn(
      Arr.map(texts, ({ file, source }) => ({ path: files.relative(root, file), text: source })),
    );
    const occurrences = occurrencesIn(links);
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
