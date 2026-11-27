import { writeOutputs } from "@r_masseater/github-workflow";
import { Array as Arr, Effect, FileSystem, Path, Schema } from "effect";

import { CompatManifestJson, compatCasesOf } from "./compat-manifest.ts";
import { goesToNpm } from "./manifest.ts";
import { graphTasks, workspacesOf } from "./plan.ts";

const MANIFEST_FILE = "package.json";

const Directories = Schema.fromJsonString(Schema.Array(Schema.String));

const isChecked = Effect.fn("compat.isChecked")(function* isChecked(directory: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const manifest = yield* fileSystem
    .readFileString(path.join(directory, MANIFEST_FILE))
    .pipe(Effect.flatMap(Schema.decodeEffect(CompatManifestJson)));
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
