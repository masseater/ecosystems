import { Array as Arr, Effect, FileSystem, Option, Order, Path, String as Str, pipe } from "effect";
import type { PlatformError } from "effect";

import { checksFailed } from "#/shared/lib/errors.ts";
import type { VpToolsError } from "#/shared/lib/errors.ts";

const WINDOWS_EXTENSION = ".exe";
const SEPARATORS = /[\\/]/u;

const fileNameOf = (name: string): string => {
  if (process.platform === "win32") {
    return `${name}${WINDOWS_EXTENSION}`;
  }
  return name;
};

const depthOf = (entry: string): number => Arr.length(Str.split(SEPARATORS)(entry));

const byDepth = Order.mapInput(Order.Number, depthOf);

/** @internal */
export const findExecutable =
  (directory: string) =>
  (
    name: string,
  ): Effect.Effect<
    string,
    VpToolsError | PlatformError.PlatformError,
    FileSystem.FileSystem | Path.Path
  > =>
    Effect.gen(function* find() {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const entries = yield* fs.readDirectory(directory, { recursive: true });
      const wanted = fileNameOf(name);
      return yield* pipe(
        entries,
        Arr.filter((entry) => path.basename(entry) === wanted),
        Arr.sortBy(byDepth),
        Arr.head,
        Option.map((entry) => path.join(directory, entry)),
        Effect.fromOption,
        Effect.mapError(() =>
          checksFailed(`${wanted} is not in the archive unpacked at ${directory}`),
        ),
      );
    });
