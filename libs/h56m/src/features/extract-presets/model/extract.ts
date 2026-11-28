import { readWorkspaceManifest } from "@pnpm/workspace.workspace-manifest-reader";
import {
  Array as Arr,
  Effect,
  FileSystem,
  Option,
  Path,
  Schema,
  String as Str,
  pipe,
} from "effect";

import { ExtractFailed } from "./errors.ts";

const PRESET = ["config", "betterleaks.toml"];
const LICENSE = "LICENSE";
const SOURCE = ["node_modules", "betterleaks"];

const WORKSPACE = ["..", ".."];

const Workspace = Schema.Struct({ catalog: Schema.Struct({ betterleaks: Schema.String }) });

const failedWith = (cause: { readonly message: string }): ExtractFailed =>
  ExtractFailed.make({ message: cause.message });

/** @internal */
export const extractPresets = Effect.fn("h56m-presets.extract")(function* extractPresets(
  output: string,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const workspace = yield* Effect.tryPromise({
    try: () => readWorkspaceManifest(path.join(output, ...WORKSPACE)),
    catch: (cause) => ExtractFailed.make({ message: String(cause) }),
  }).pipe(Effect.flatMap(Schema.decodeUnknownEffect(Workspace)), Effect.mapError(failedWith));
  const revision = pipe(
    workspace.catalog.betterleaks,
    Str.split("#"),
    Arr.last,
    Option.getOrElse(() => ""),
  );
  const source = path.join(output, ...SOURCE);
  const preset = yield* fileSystem
    .readFileString(path.join(source, ...PRESET))
    .pipe(Effect.mapError(failedWith));
  const license = yield* fileSystem
    .readFileString(path.join(source, LICENSE))
    .pipe(Effect.mapError(failedWith));
  yield* fileSystem
    .makeDirectory(path.join(output, "presets"), { recursive: true })
    .pipe(Effect.mapError(failedWith));
  yield* fileSystem
    .writeFileString(path.join(output, "presets", "betterleaks.toml"), preset)
    .pipe(Effect.mapError(failedWith));
  yield* fileSystem
    .writeFileString(
      path.join(output, "THIRD-PARTY-NOTICES.txt"),
      `Betterleaks (MIT)\nhttps://github.com/betterleaks/betterleaks/blob/${revision}/LICENSE\n\n${license}`,
    )
    .pipe(Effect.mapError(failedWith));
});
