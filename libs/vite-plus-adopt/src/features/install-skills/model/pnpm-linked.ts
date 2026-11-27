import { Array as Arr, Effect, FileSystem, Path, String as Str, pipe } from "effect";

/** @internal */
export const PNPM_IGNORE = ".gitignore";

const OPEN = "# pnpm";
const CLOSE = "# pnpm end";
const ROOT = "/";
const AFTER_MARKER = 1;

const namesIn = (text: string): readonly string[] =>
  pipe(
    Str.split("\n")(text),
    Arr.map(Str.trim),
    Arr.dropWhile((line) => line !== OPEN),
    Arr.drop(AFTER_MARKER),
    Arr.takeWhile((line) => line !== CLOSE),
    Arr.filter(Str.startsWith(ROOT)),
    Arr.map(Str.slice(ROOT.length)),
  );

/** @internal */
export const pnpmLinkedNames = (
  skills: string,
): Effect.Effect<readonly string[], never, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* readBlock() {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const text = yield* fs.readFileString(path.join(skills, PNPM_IGNORE));
    return namesIn(text);
  }).pipe(Effect.orElseSucceed((): readonly string[] => []));
