import manifest from "@r_masseater/intent-book/package.json" with { type: "json" };
import { runMain } from "@r_masseater/node-main";
import { Array as Arr, Boolean as Bool, Console, Effect, Path, pipe } from "effect";
import { Argument, Command, Flag } from "effect/cli";

import { buildSite } from "#/features/build-site/index.ts";
import { readBooks } from "#/features/read-book/index.ts";
import { writeSite } from "#/features/write-site/index.ts";
import { expandDirectories } from "#/shared/lib/expand-directories.ts";

const CURRENT_DIRECTORY = ".";

const directoriesOf = (given: readonly string[]): readonly string[] =>
  Bool.match(Arr.isReadonlyArrayEmpty(given), {
    onTrue: () => [CURRENT_DIRECTORY],
    onFalse: () => given,
  });

const build = Effect.fn("build")(function* build(input: {
  readonly directories: readonly string[];
  readonly out: string;
  readonly base: string;
  readonly landing: boolean;
}) {
  const path = yield* Path.Path;
  const directories = yield* expandDirectories(directoriesOf(input.directories));
  const resolved = pipe(
    directories,
    Arr.map((directory) => path.resolve(directory)),
  );
  const { books, skipped } = yield* readBooks(resolved);
  const files = yield* buildSite({ books, base: input.base, landing: input.landing });
  yield* Bool.match(Arr.isReadonlyArrayNonEmpty(skipped), {
    onTrue: () => Console.log(`skipped (no skills): ${Arr.join(skipped, ", ")}`),
    onFalse: () => Effect.void,
  });
  yield* writeSite(path.resolve(input.out), files);
  yield* Console.log(`${books.length} package(s), ${files.length} files -> ${input.out}`);
});

const command = Command.make(
  "intent-book",
  {
    directories: Argument.String("package").pipe(
      Argument.withDescription(
        "Directory of an npm package that ships skills/, or a glob pattern for several (default: .)",
      ),
      Argument.variadic(),
    ),
    out: Flag.String("out").pipe(
      Flag.withDescription("Directory to write the site to"),
      Flag.withDefault("book"),
    ),
    base: Flag.String("base").pipe(
      Flag.withDescription("Path the site is served under, with a leading and trailing slash"),
      Flag.withDefault("/"),
    ),
    noLanding: Flag.Boolean("no-landing").pipe(
      Flag.withDescription(
        "Do not write index.html at the root, for a site that lives inside another site",
      ),
    ),
  },
  (input) =>
    build({
      directories: input.directories,
      out: input.out,
      base: input.base,
      landing: !input.noLanding,
    }),
);

runMain("intent-book")(Command.run(command, { version: manifest.version }));
