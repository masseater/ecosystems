import { Array as Arr, Effect, FileSystem, Path, Record as Rec, Schema, pipe } from "effect";

import { nativeFields, nativeFileOf, nativeReadme } from "./platforms.ts";
import type { NativePackage } from "./platforms.ts";

const NPM_DIR = "npm";
const NATIVE_DIR = "native";
const MANIFEST_FILE = "package.json";
const KEPT_FIELDS: readonly string[] = ["license", "repository", "homepage", "bugs", "engines"];

/** @internal */
export const PackageJson = Schema.fromJsonString(Schema.Record(Schema.String, Schema.Unknown));

const keptFields = Effect.fn("publish.keptFields")(function* keptFields(directory: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const text = yield* fileSystem.readFileString(path.join(directory, MANIFEST_FILE));
  const raw = yield* Schema.decodeEffect(PackageJson)(text);
  return pipe(
    raw,
    Rec.filter((_value, key) => Arr.contains(KEPT_FIELDS, key)),
  );
});

/** @internal */
export const writeNative = Effect.fn("publish.writeNative")(function* writeNative(
  directory: string,
  native: NativePackage,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const kept = yield* keptFields(directory);
  const target = path.resolve(directory, NPM_DIR, native.target);
  const file = nativeFileOf(native);
  yield* fileSystem.makeDirectory(target, { recursive: true });
  yield* fileSystem.copyFile(path.join(directory, NATIVE_DIR, file), path.join(target, file));
  const text = yield* Schema.encodeEffect(PackageJson)({ ...kept, ...nativeFields(native) });
  yield* Effect.all(
    [
      fileSystem.writeFileString(path.join(target, MANIFEST_FILE), text),
      fileSystem.writeFileString(path.join(target, "README.md"), nativeReadme(native)),
    ],
    { concurrency: "unbounded" },
  );
  return target;
});
