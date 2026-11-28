import {
  Effect,
  FileSystem,
  Function as Fn,
  Option,
  Path,
  Record as Rec,
  String as Str,
} from "effect";
import type { PlatformError } from "effect";
import type { HttpClient } from "effect/http";
import type { ChildProcessSpawner } from "effect/process";

import type { VpToolsError } from "#/shared/lib/errors.ts";

import { downloadAsset } from "./download.ts";
import { unpackArchive } from "./extract.ts";
import type { Lock } from "./lock.ts";
import type { Planned } from "./plan.ts";

/** @internal */
export type InstallServices =
  | FileSystem.FileSystem
  | Path.Path
  | HttpClient.HttpClient
  | ChildProcessSpawner.ChildProcessSpawner;

/** @internal */
export type InstallError = VpToolsError | PlatformError.PlatformError;

/** @internal */
export interface Installed {
  readonly planned: Planned;
  readonly directory: string;
  readonly recorded: Option.Option<readonly [string, string]>;
}

const SHORT_HASH = 12;
const DATA_FIRST_ARITY = 3;
const START = 0;
const SEPARATOR = "/";

const directoryFor = (
  cache: string,
  { name, version, platform }: Planned,
  sha256: string,
): Effect.Effect<string, never, Path.Path> =>
  Effect.gen(function* directory() {
    const path = yield* Path.Path;
    return path.join(
      cache,
      ...Str.split(SEPARATOR)(name),
      `${version}-${platform}-${Str.slice(START, SHORT_HASH)(sha256)}`,
    );
  });

const alreadyInstalled = (
  cache: string,
  planned: Planned,
  locked: Option.Option<string>,
): Effect.Effect<Option.Option<string>, never, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* lookup() {
    const fs = yield* FileSystem.FileSystem;
    if (Option.isNone(locked)) {
      return Option.none();
    }
    const directory = yield* directoryFor(cache, planned, locked.value);
    const present = yield* fs.exists(directory).pipe(Effect.orElseSucceed(() => false));
    return Option.liftPredicate(directory, () => present);
  });

/** @internal */
export const installOne: {
  (
    cache: string,
    lock: Lock,
  ): (planned: Planned) => Effect.Effect<Installed, InstallError, InstallServices>;
  (
    cache: string,
    lock: Lock,
    planned: Planned,
  ): Effect.Effect<Installed, InstallError, InstallServices>;
} = Fn.dual(
  DATA_FIRST_ARITY,
  (
    cache: string,
    lock: Lock,
    planned: Planned,
  ): Effect.Effect<Installed, InstallError, InstallServices> =>
    Effect.gen(function* install() {
      const locked = Rec.get(lock, planned.url);
      const cached = yield* alreadyInstalled(cache, planned, locked);
      if (Option.isSome(cached)) {
        return { planned, directory: cached.value, recorded: Option.none() };
      }
      const { bytes, sha256 } = yield* downloadAsset(locked)(planned);
      const directory = yield* directoryFor(cache, planned, sha256);
      yield* unpackArchive(directory)(bytes);
      const recorded = Option.liftPredicate([planned.url, sha256] as const, () =>
        Option.isNone(locked),
      );
      return { planned, directory, recorded };
    }),
);
