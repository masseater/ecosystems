import { Array as Arr, Effect, Option, Record as Rec, pipe } from "effect";
import type { FileSystem, Path } from "effect";

import { loadViteConfig } from "#/entities/vite-config/index.ts";
import { vpaCacheDirectory } from "#/shared/lib/cache.ts";

import { findExecutable } from "./find-executable.ts";
import { installOne } from "./install-one.ts";
import type { InstallError, InstallServices, Installed } from "./install-one.ts";
import { linkExecutable } from "./link-bin.ts";
import type { Executable } from "./link-bin.ts";
import { readLock, writeLock } from "./lock.ts";
import type { Lock } from "./lock.ts";
import { planTools } from "./plan.ts";
import type { Planned } from "./plan.ts";
import { decodeSection, toolsEnabled } from "./section.ts";

const CONCURRENCY = 4;

const executablesOf = ({
  planned,
  directory,
}: Installed): Effect.Effect<
  readonly Executable[],
  InstallError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.forEach(
    planned.bins,
    (name) =>
      findExecutable(directory)(name).pipe(Effect.map((target): Executable => ({ name, target }))),
    { concurrency: 1 },
  );

const record =
  (root: string, lock: Lock) =>
  (
    installed: readonly Installed[],
  ): Effect.Effect<void, InstallError, FileSystem.FileSystem | Path.Path> => {
    const recorded = pipe(
      installed,
      Arr.flatMap(({ recorded: entry }) => Option.toArray(entry)),
    );
    if (Arr.isReadonlyArrayEmpty(recorded)) {
      return Effect.void;
    }
    return writeLock(root)({ ...lock, ...Rec.fromEntries(recorded) });
  };

const plannedTools = (
  root: string,
): Effect.Effect<
  Option.Option<readonly Planned[]>,
  InstallError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* plan() {
    const config = yield* loadViteConfig(root);
    const enabled = yield* toolsEnabled;
    const raw = Option.fromNullishOr(config.tools);
    if (Option.isNone(raw) || !enabled) {
      return Option.none();
    }
    const section = yield* decodeSection(raw.value);
    const planned = yield* planTools(section, `${process.platform}-${process.arch}`);
    return Option.some(planned);
  });

const installAll = (
  root: string,
  planned: readonly Planned[],
): Effect.Effect<number, InstallError, InstallServices> =>
  Effect.gen(function* installPlanned() {
    const lock = yield* readLock(root);
    const cache = yield* vpaCacheDirectory("tools");
    const installed = yield* Effect.forEach(planned, (tool) => installOne(cache, lock, tool), {
      concurrency: CONCURRENCY,
    });
    yield* record(root, lock)(installed);
    const found = yield* Effect.forEach(installed, executablesOf, { concurrency: CONCURRENCY });
    const executables = Arr.flatten(found);
    yield* Effect.forEach(executables, linkExecutable(root), { concurrency: 1, discard: true });
    return Arr.length(executables);
  });

/** @internal */
export const installTools = (
  root: string,
): Effect.Effect<Option.Option<number>, InstallError, InstallServices> =>
  plannedTools(root).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.succeedNone,
        onSome: (planned) => installAll(root, planned).pipe(Effect.asSome),
      }),
    ),
  );
