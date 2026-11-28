import { Effect, FileSystem, Path } from "effect";
import type { PlatformError } from "effect";

const BIN_DIRECTORY = ["node_modules", ".bin"];

const launcher = (target: string): string => `@"${target}" %*\r\n`;

/** @internal */
export interface Executable {
  readonly name: string;
  readonly target: string;
}

/** @internal */
export const linkExecutable =
  (root: string) =>
  ({
    name,
    target,
  }: Executable): Effect.Effect<
    void,
    PlatformError.PlatformError,
    FileSystem.FileSystem | Path.Path
  > =>
    Effect.gen(function* linkOne() {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const directory = path.join(root, ...BIN_DIRECTORY);
      yield* fs.makeDirectory(directory, { recursive: true });
      if (process.platform === "win32") {
        return yield* fs.writeFileString(path.join(directory, `${name}.cmd`), launcher(target));
      }
      const entry = path.join(directory, name);
      yield* fs.remove(entry, { force: true });
      return yield* fs.symlink(target, entry);
    });
