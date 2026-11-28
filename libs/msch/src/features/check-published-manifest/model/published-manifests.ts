import { Effect } from "effect";

import { scanPublishedManifests } from "#/entities/package/index.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

import { homepageProblems } from "./package-homepage.ts";
import { scopeProblems } from "./package-scope.ts";

/** @internal */
export const checkPublishedManifests = Effect.fn("checkPublishedManifests")(
  function* checkPublishedManifests(root: string) {
    const files = yield* RepositoryFiles;
    const homepage = homepageProblems(files.dirname);
    return yield* scanPublishedManifests(root, (found) => [
      ...scopeProblems(found),
      ...homepage(found),
    ]);
  },
);
