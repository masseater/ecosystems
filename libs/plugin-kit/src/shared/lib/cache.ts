import { Array as Arr, Config, Effect, Option, Schema, pipe } from "effect";

const taggedError = Schema.TaggedError;

export class CacheRootError extends taggedError<
  CacheRootError,
  { readonly brand: unique symbol }
>()("CacheRootError", { message: Schema.String }) {}

const SEPARATOR = "/";
const HOME_CACHE = ".cache";

const variable = (name: string): Effect.Effect<Option.Option<string>> =>
  Config.option(Config.NonEmptyString(name)).pipe(Effect.orElseSucceed(Option.none));

const baseDirectory: Effect.Effect<Option.Option<string>> = Effect.gen(function* baseDirectory() {
  const cacheHome = yield* variable("XDG_CACHE_HOME");
  const home = yield* variable("HOME");
  const profile = yield* variable("USERPROFILE");
  return pipe(
    cacheHome,
    Option.orElse(() =>
      pipe(
        Option.orElse(home, () => profile),
        Option.map((directory) => `${directory}${SEPARATOR}${HOME_CACHE}`),
      ),
    ),
  );
});

export const cacheRootEffect = (
  segments: readonly string[],
): Effect.Effect<string, CacheRootError> =>
  baseDirectory.pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.fail(CacheRootError.make({ message: "set XDG_CACHE_HOME or HOME" })),
        onSome: (base) => Effect.succeed(pipe([base, ...segments], Arr.join(SEPARATOR))),
      }),
    ),
  );

export const cacheRootOf = (segments: readonly string[]): Promise<string> =>
  Effect.runPromise(cacheRootEffect(segments));
