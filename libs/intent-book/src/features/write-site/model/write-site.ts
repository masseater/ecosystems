import { Boolean as Bool, Effect, FileSystem, Path, Schema, Array as Arr } from "effect";

import type { SiteFile } from "#/shared/lib/site-file.ts";

const taggedError = Schema.TaggedError;

export class SiteWriteError extends taggedError<
  SiteWriteError,
  { readonly brand: unique symbol }
>()("SiteWriteError", {
  directory: Schema.String,
  reason: Schema.String,
}) {}

const MARKER = ".intent-book";
const FILE_CONCURRENCY = 16;

const clearOld = Effect.fn("clearOld")(function* clearOld(directory: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const owned = yield* fileSystem.exists(path.join(directory, MARKER));
  const entries = yield* fileSystem.readDirectory(directory);
  const writable = owned || Arr.isReadonlyArrayEmpty(entries);
  yield* Bool.match(writable, {
    onTrue: () => fileSystem.remove(directory, { recursive: true }),
    onFalse: () =>
      SiteWriteError.make({
        directory,
        reason: `not empty and not created by intent-book (no ${MARKER} file)`,
      }),
  });
});

const writeFile = Effect.fn("writeFile")(function* writeFile(directory: string, file: SiteFile) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const target = path.join(directory, file.path);
  yield* fileSystem.makeDirectory(path.dirname(target), { recursive: true });
  yield* fileSystem.writeFileString(target, file.content);
});

/** @internal */
export const writeSite = Effect.fn("writeSite")(function* writeSite(
  directory: string,
  files: readonly SiteFile[],
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const present = yield* fileSystem.exists(directory);
  yield* Bool.match(present, {
    onTrue: () => clearOld(directory),
    onFalse: () => Effect.void,
  });
  yield* writeFile(directory, { path: MARKER, content: "" });
  yield* Effect.forEach(files, (file) => writeFile(directory, file), {
    concurrency: FILE_CONCURRENCY,
  });
});
