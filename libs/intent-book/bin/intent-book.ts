import manifest from "@r_masseater/intent-book/package.json" with { type: "json" };
import { runMain } from "@r_masseater/node-main";
import { Array as Arr, Boolean as Bool, Console, Effect, Path } from "effect";
import { Argument, Command, Flag } from "effect/cli";

import { buildSite } from "#/features/build-site/index.ts";
import { readBook } from "#/features/read-book/index.ts";
import { writeSite } from "#/features/write-site/index.ts";

const CURRENT_DIRECTORY = ".";
const READ_CONCURRENCY = 4;

const directoriesOf = (given: readonly string[]): readonly string[] =>
  Bool.match(Arr.isReadonlyArrayEmpty(given), {
    onTrue: () => [CURRENT_DIRECTORY],
    onFalse: () => given,
  });

const build = Effect.fn("build")(function* build(input: {
  readonly directories: readonly string[];
  readonly out: string;
  readonly base: string;
}) {
  const path = yield* Path.Path;
  const books = yield* Effect.forEach(
    directoriesOf(input.directories),
    (directory) => readBook(path.resolve(directory)),
    { concurrency: READ_CONCURRENCY },
  );
  const files = yield* buildSite({ books, base: input.base });
  yield* writeSite(path.resolve(input.out), files);
  yield* Console.log(`${books.length} package(s), ${files.length} files -> ${input.out}`);
});

const command = Command.make(
  "intent-book",
  {
    directories: Argument.String("package").pipe(
      Argument.withDescription("Directory of an npm package that ships skills/ (default: .)"),
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
  },
  build,
);

runMain("intent-book")(Command.run(command, { version: manifest.version }));
