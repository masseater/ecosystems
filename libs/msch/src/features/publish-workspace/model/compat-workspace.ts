import { mustSucceed } from "@r_masseater/github-workflow";
import {
  Array as Arr,
  Effect,
  FileSystem,
  Option,
  Path,
  Predicate,
  Record as Rec,
  pipe,
} from "effect";

import { compatManifestIn } from "./compat-manifest.ts";
import type { CompatManifest } from "./compat-manifest.ts";
import { nativeTarballs } from "./compat-native.ts";
import { pack } from "./pack.ts";

interface Workspace {
  readonly directory: string;
  readonly manifest: CompatManifest;
}

/** @internal */
export type Tarballs = Readonly<Record<string, string>>;

const dependencyNamesOf = (manifest: CompatManifest): readonly string[] =>
  pipe(
    [manifest.dependencies, manifest.peerDependencies, manifest.optionalDependencies],
    Arr.flatMap((declared) => Rec.keys(declared ?? {})),
  );

const closureOf = (
  known: Readonly<Record<string, Workspace>>,
  names: readonly string[],
  seen: readonly Workspace[],
): readonly Workspace[] => {
  const [name, ...rest] = names;
  if (Predicate.isUndefined(name)) {
    return seen;
  }
  const found = Rec.get(known, name);
  const reached = pipe(
    seen,
    Arr.some((item) => item.manifest.name === name),
  );
  if (Option.isNone(found) || reached) {
    return closureOf(known, rest, seen);
  }
  const inner = closureOf(known, dependencyNamesOf(found.value.manifest), [...seen, found.value]);
  return closureOf(known, rest, inner);
};

const workspacesBeside = Effect.fn("compat.workspaces")(function* workspacesBeside(
  directory: string,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const parent = path.dirname(path.resolve(directory));
  const entries = yield* fileSystem.readDirectory(parent);
  const found = yield* Effect.forEach(
    entries,
    (entry) =>
      compatManifestIn(path.join(parent, entry)).pipe(
        Effect.map((manifest): readonly Workspace[] => [
          { directory: path.join(parent, entry), manifest },
        ]),
        Effect.orElseSucceed((): readonly Workspace[] => []),
      ),
    { concurrency: 1 },
  );
  return pipe(
    Arr.flatten(found),
    Arr.map((workspace): readonly [string, Workspace] => [workspace.manifest.name, workspace]),
    Rec.fromEntries,
  );
});

type Entry = readonly [string, string];

const builtTarball = Effect.fn("compat.pack")(function* builtTarball(directory: string) {
  yield* mustSucceed({ command: "vp", args: ["run", "build"], cwd: directory });
  return yield* pack(directory);
});

const tarballsOf = Effect.fn("compat.tarballs")(function* tarballsOf({
  directory,
  manifest,
}: Workspace) {
  const tarball = yield* builtTarball(directory);
  const natives = yield* nativeTarballs(directory, manifest);
  const own: readonly Entry[] = [[manifest.name, tarball]];
  return [...own, ...natives];
});

/** @internal */
export const workspaceTarballs = Effect.fn("compat.local")(function* workspaceTarballs(
  directory: string,
  manifest: CompatManifest,
) {
  const known = yield* workspacesBeside(directory);
  const reached = closureOf(known, dependencyNamesOf(manifest), [{ directory, manifest }]);
  const packed = yield* Effect.forEach(reached, tarballsOf, { concurrency: 1 });
  return Rec.fromEntries(Arr.flatten(packed));
});
