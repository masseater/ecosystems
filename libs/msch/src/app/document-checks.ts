import { Array as Arr, Effect } from "effect";

import { checkReferenceLinks } from "#/features/check-references/index.ts";
import {
  checkPublishedSkills,
  checkSkillEntry,
  checkSkillFiles,
} from "#/features/check-skills/index.ts";

/** @internal */
export const checkDocuments = Effect.fn("checkDocuments")(function* checkDocuments(root: string) {
  const found = yield* Effect.all(
    [
      checkSkillFiles(root),
      checkSkillEntry(root),
      checkPublishedSkills(root),
      checkReferenceLinks(root),
    ],
    { concurrency: "unbounded" },
  );
  return Arr.flatten(found);
});
