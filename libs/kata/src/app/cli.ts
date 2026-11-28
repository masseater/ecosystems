import { parseArgs } from "node:util";

import { runMain } from "@effect/platform-node/NodeRuntime";
import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import { Array as Arr, Console, Effect, FileSystem, Option, Path, Schema } from "effect";

import { FormatSchema, ThemeSchema } from "#/entities/figure/index.ts";
import type { Format, Theme } from "#/entities/figure/index.ts";
import { RenderError, failWith } from "#/shared/lib/errors.ts";

import { renderFigure } from "./render.ts";

const ARGUMENTS_START = 2;
const FILE_POSITION = 1;
const SUBCOMMAND = "render";
const DEFAULT_FORMAT: Format = "svg";
const SEQUENTIAL = { concurrency: 1 } as const;
const ALL_THEMES: readonly Theme[] = ["light", "dark"];
const USAGE = "usage: kata render <file.typ> [--theme light|dark] [--format svg|pdf]";

const Flags = Schema.Struct({
  theme: Schema.optional(ThemeSchema),
  format: Schema.optional(FormatSchema),
});

const usageFailure = (reason: string): RenderError =>
  RenderError.make({ message: `${reason}\n${USAGE}` });

const parseFlags = (
  argv: readonly string[],
): Effect.Effect<
  { readonly positionals: readonly string[]; readonly flags: typeof Flags.Type },
  RenderError
> =>
  Effect.try({
    try: () =>
      parseArgs({
        args: [...argv],
        allowPositionals: true,
        options: { theme: { type: "string" }, format: { type: "string" } },
      }),
    catch: failWith,
  }).pipe(
    Effect.flatMap(({ positionals, values }) =>
      Schema.decodeUnknownEffect(Flags)(values).pipe(
        Effect.mapBoth({
          onSuccess: (flags) => ({ positionals, flags }),
          onFailure: () => usageFailure("theme is light or dark and format is svg or pdf"),
        }),
      ),
    ),
  );

const program = Effect.gen(function* runProgram() {
  const path = yield* Path.Path;
  const fileSystem = yield* FileSystem.FileSystem;
  const { positionals, flags } = yield* parseFlags(process.argv.slice(ARGUMENTS_START));
  const file = yield* Arr.get(positionals, FILE_POSITION).pipe(
    Effect.fromOption,
    Effect.mapError(() => usageFailure("missing file")),
  );
  yield* Effect.filterOrFail(
    Effect.succeed(Arr.head(positionals)),
    Option.contains(SUBCOMMAND),
    () => usageFailure("unknown command"),
  );
  const format = Option.getOrElse(Option.fromNullishOr(flags.format), () => DEFAULT_FORMAT);
  const themes = Option.match(Option.fromNullishOr(flags.theme), {
    onNone: () => ALL_THEMES,
    onSome: (theme) => [theme],
  });
  const stem = path.join(path.dirname(file), path.basename(file, path.extname(file)));
  yield* Effect.forEach(
    themes,
    (theme) =>
      Effect.gen(function* writeFigure() {
        const output = yield* Effect.tryPromise({
          try: () => renderFigure({ file, theme, format }),
          catch: failWith,
        });
        const target = `${stem}.${theme}.${format}`;
        yield* fileSystem.writeFile(target, output);
        yield* Console.log(target);
      }),
    SEQUENTIAL,
  );
}).pipe(Effect.catchTag("RenderError", (failure) => Console.error(failure.message)));

export const runCli = (): void => {
  runMain(program.pipe(Effect.provide(nodeServices)));
};
