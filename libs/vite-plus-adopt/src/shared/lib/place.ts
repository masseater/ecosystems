import { Effect, Exit, FileSystem, Function as Fn, Path } from "effect";
import type { PlatformError } from "effect";

const renameOrKeep = (
  staging: string,
  target: string,
): Effect.Effect<void, PlatformError.PlatformError, FileSystem.FileSystem> =>
  Effect.gen(function* renameOrKeepPlaced() {
    const fs = yield* FileSystem.FileSystem;
    const renamed = yield* Effect.exit(fs.rename(staging, target));
    if (Exit.isSuccess(renamed) || !(yield* fs.exists(target))) {
      return yield* renamed;
    }
    return yield* fs.remove(staging, { recursive: true });
  });

const DATA_FIRST_ARITY = 2;

/** @internal */
export const placeAtomically: {
  <Failure, Requirements>(
    write: (staging: string) => Effect.Effect<void, Failure, Requirements>,
  ): (
    target: string,
  ) => Effect.Effect<
    void,
    Failure | PlatformError.PlatformError,
    FileSystem.FileSystem | Path.Path | Requirements
  >;
  <Failure, Requirements>(
    target: string,
    write: (staging: string) => Effect.Effect<void, Failure, Requirements>,
  ): Effect.Effect<
    void,
    Failure | PlatformError.PlatformError,
    FileSystem.FileSystem | Path.Path | Requirements
  >;
} = Fn.dual(
  DATA_FIRST_ARITY,
  <Failure, Requirements>(
    target: string,
    write: (staging: string) => Effect.Effect<void, Failure, Requirements>,
  ): Effect.Effect<
    void,
    Failure | PlatformError.PlatformError,
    FileSystem.FileSystem | Path.Path | Requirements
  > =>
    Effect.gen(function* place() {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      yield* fs.makeDirectory(path.dirname(target), { recursive: true });
      const staging = yield* fs.makeTempDirectory({
        directory: path.dirname(target),
        prefix: ".partial-",
      });
      yield* write(staging);
      yield* renameOrKeep(staging, target);
    }),
);
