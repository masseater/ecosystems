import { Array as Arr, Boolean as Bool, Effect, FileSystem, pipe } from "effect";

const CHECK_CONCURRENCY = 4;

const matchingDirectories = Effect.fn("matchingDirectories")(function* matchingDirectories(
  pattern: string,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const found = yield* fileSystem.glob(pattern);
  const kept = yield* Effect.filter(
    found,
    (candidate) =>
      fileSystem.stat(candidate).pipe(
        Effect.map((info) => info.type === "Directory"),
        Effect.orElseSucceed(() => false),
      ),
    { concurrency: CHECK_CONCURRENCY },
  );
  return Bool.match(Arr.isArrayNonEmpty(kept), {
    onTrue: () => kept,
    onFalse: () => [pattern],
  });
});

/** @internal */
export const expandDirectories = Effect.fn("expandDirectories")(function* expandDirectories(
  patterns: readonly string[],
) {
  const expanded = yield* Effect.forEach(
    patterns,
    (pattern) => matchingDirectories(pattern).pipe(Effect.orElseSucceed(() => [pattern])),
    { concurrency: 1 },
  );
  return pipe(expanded, Arr.flatten, Arr.dedupe);
});
