import { writeOutputs } from "@r_masseater/github-workflow";
import { Array as Arr, Effect, Schema } from "effect";

import { compatCasesOf, compatManifestIn } from "./compat-manifest.ts";
import { goesToNpm } from "./manifest.ts";
import { graphTasks, workspacesOf } from "./plan.ts";

const Directories = Schema.fromJsonString(Schema.Array(Schema.String));

const isChecked = Effect.fn("compat.isChecked")(function* isChecked(directory: string) {
  const manifest = yield* compatManifestIn(directory);
  return goesToNpm(manifest) && !Arr.isReadonlyArrayEmpty(compatCasesOf(manifest));
});

/** @internal */
export const writeCompatPlan = Effect.fn("publish.compatPlan")(function* writeCompatPlan() {
  const graph = yield* graphTasks;
  const checked = yield* Effect.filter(workspacesOf(graph), isChecked, { concurrency: 1 });
  const encoded = yield* Schema.encodeEffect(Directories)(checked);
  yield* Effect.logInfo(encoded);
  yield* writeOutputs({ directories: encoded });
});
