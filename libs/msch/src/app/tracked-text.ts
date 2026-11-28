import { Array as Arr, Effect } from "effect";

import { checkComments } from "#/features/ban-comments/index.ts";
import { checkDocker, checkPython } from "#/features/ban-tools/index.ts";
import { checkCatalogEntries } from "#/features/check-catalog-entries/index.ts";
import { checkGitSubpath, checkPackageRegistry } from "#/features/check-overrides/index.ts";
import {
  checkDowngrades,
  checkRenovateSettings,
} from "#/features/check-version-downgrades/index.ts";
import { checkHiddenUnicode } from "#/features/find-invisible-characters/index.ts";
import {
  checkAppliedPackages,
  checkReplacedTools,
  checkUnneededFiles,
} from "#/features/find-unneeded-files/index.ts";

import { checkDocuments } from "./document-checks.ts";
import { checkManifests } from "./manifest-checks.ts";

/** @internal */
export const checkTrackedText = Effect.fn("checkTrackedText")(function* checkTrackedText(
  root: string,
) {
  const found = yield* Effect.all(
    [
      checkHiddenUnicode(root),
      checkPython(root),
      checkDocker(root),
      checkUnneededFiles(root),
      checkReplacedTools(root),
      checkManifests(root),
      checkDocuments(root),
      checkComments(root),
      checkAppliedPackages(root),
      checkGitSubpath(root),
      checkDowngrades(root),
      checkRenovateSettings(root),
      checkCatalogEntries(root),
      checkPackageRegistry(root),
    ],
    { concurrency: "unbounded" },
  );
  return Arr.flatten(found);
});
