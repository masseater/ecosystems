import { Config, Effect, FileSystem, Path } from "effect";
import type { PlatformError } from "effect";
import type { ChildProcessSpawner } from "effect/process";

import { toolFailed } from "#/shared/lib/errors.ts";
import type { VpToolsError } from "#/shared/lib/errors.ts";
import { placeAtomically } from "#/shared/lib/place.ts";
import { runCaptured } from "#/shared/lib/process.ts";

/** @internal */
export type ExtractServices =
  | FileSystem.FileSystem
  | Path.Path
  | ChildProcessSpawner.ChildProcessSpawner;

/** @internal */
export type ExtractError = VpToolsError | PlatformError.PlatformError;

const ARCHIVE_SUFFIX = ".archive";
const DEFAULT_SYSTEM_ROOT = String.raw`C:\Windows`;

const tarFile: Effect.Effect<string, never, Path.Path> = Effect.gen(function* tarFile() {
  if (process.platform !== "win32") {
    return "tar";
  }
  const path = yield* Path.Path;
  const systemRoot = yield* Config.NonEmptyString("SystemRoot").pipe(
    Effect.orElseSucceed(() => DEFAULT_SYSTEM_ROOT),
  );
  return path.join(systemRoot, "System32", "tar.exe");
});

const untar = (
  archive: string,
  directory: string,
): Effect.Effect<void, ExtractError, ExtractServices> =>
  Effect.gen(function* run() {
    const file = yield* tarFile;
    const report = yield* runCaptured({
      root: directory,
      file,
      args: ["-xf", archive, "-C", directory],
    });
    yield* Effect.filterOrFail(
      Effect.succeed(report),
      ({ valid }) => valid,
      ({ output }) => toolFailed("tar")(output),
    );
  });

/** @internal */
export const unpackArchive =
  (target: string) =>
  (bytes: Uint8Array): Effect.Effect<void, ExtractError, ExtractServices> =>
    placeAtomically(target, (staging) =>
      Effect.gen(function* unpack() {
        const fs = yield* FileSystem.FileSystem;
        const archive = `${staging}${ARCHIVE_SUFFIX}`;
        yield* fs.writeFile(archive, bytes);
        yield* untar(archive, staging);
        yield* fs.remove(archive);
      }),
    );
