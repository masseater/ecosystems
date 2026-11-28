import { Array as Arr, Effect, Option, Predicate, Schema, pipe } from "effect";

import type { Problem } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { scanText } from "#/shared/lib/scanned-files.ts";
import type { Listed } from "#/shared/lib/scanned-files.ts";

import { MANIFEST_FILE } from "./dependencies.ts";

const EXCLUDED: readonly string[] = [
  ":(exclude,attr:linguist-vendored)",
  ":(exclude,attr:linguist-generated)",
];

const PublishedManifestSchema = Schema.Struct({
  name: Schema.optional(Schema.String),
  private: Schema.optional(Schema.Boolean),
  publishConfig: Schema.optional(Schema.Unknown),
  homepage: Schema.optional(Schema.Unknown),
  repository: Schema.optional(Schema.Unknown),
});

export type PublishedManifest = typeof PublishedManifestSchema.Type;

export interface PublishedFile {
  readonly entry: Listed;
  readonly source: string;
  readonly manifest: PublishedManifest;
}

export interface PublishedFile {
  readonly entry: Listed;
  readonly source: string;
  readonly manifest: PublishedManifest;
}

const decodePublishedManifest = Schema.decodeUnknownOption(
  Schema.fromJsonString(PublishedManifestSchema),
);

const isPublished = (manifest: PublishedManifest): boolean =>
  manifest.private !== true && Predicate.isNotUndefined(manifest.publishConfig);

export const publishedManifestOf = (
  source: Option.Option<string>,
): Option.Option<PublishedManifest> =>
  pipe(source, Option.flatMap(decodePublishedManifest), Option.filter(isPublished));

/** @internal */
export const scanPublishedManifests = Effect.fn("scanPublishedManifests")(
  function* scanPublishedManifests(
    root: string,
    problemsIn: (found: PublishedFile) => readonly Problem[],
  ) {
    const files = yield* RepositoryFiles;
    const manifests = yield* files.matchingFiles(root, [`:(glob)**/${MANIFEST_FILE}`, ...EXCLUDED]);
    return yield* scanText(
      pipe(
        manifests,
        Arr.map((name): Listed => ({ name, file: files.join(root, name) })),
      ),
      (entry, source) =>
        pipe(
          publishedManifestOf(Option.some(source)),
          Option.map((manifest) => problemsIn({ entry, source, manifest })),
          Option.getOrElse((): readonly Problem[] => []),
        ),
    );
  },
);
