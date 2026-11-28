import { Effect, FileSystem, Function as Fn, Path, Record as Rec } from "effect";
import type { PlatformError } from "effect/PlatformError";

import { lint } from "./index.ts";
import type { Diagnostic, Y8Config, Y8Error } from "./index.ts";

const DATA_FIRST_ARITY = 2;

/** @internal */
export const lintFiles: {
  (
    config: Y8Config,
  ): (
    files: Readonly<Record<string, string>>,
  ) => Effect.Effect<
    readonly Diagnostic[],
    Y8Error | PlatformError,
    FileSystem.FileSystem | Path.Path
  >;
  (
    files: Readonly<Record<string, string>>,
    config: Y8Config,
  ): Effect.Effect<
    readonly Diagnostic[],
    Y8Error | PlatformError,
    FileSystem.FileSystem | Path.Path
  >;
} = Fn.dual(
  DATA_FIRST_ARITY,
  (
    files: Readonly<Record<string, string>>,
    config: Y8Config,
  ): Effect.Effect<
    readonly Diagnostic[],
    Y8Error | PlatformError,
    FileSystem.FileSystem | Path.Path
  > =>
    Effect.gen(function* fixture() {
      const fileSystem = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const root = yield* fileSystem.makeTempDirectoryScoped();
      for (const [name, text] of Rec.toEntries(files)) {
        yield* fileSystem.makeDirectory(path.dirname(path.join(root, name)), { recursive: true });
        yield* fileSystem.writeFileString(path.join(root, name), text);
      }
      return yield* lint({ root, files: Rec.keys(files), config });
    }).pipe(Effect.scoped),
);
