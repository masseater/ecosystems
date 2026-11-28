import {
  Array as Arr,
  Effect,
  FileSystem,
  Order,
  Path,
  Record as Rec,
  Schema,
  String as Str,
  pipe,
} from "effect";
import type { PlatformError } from "effect";

import { toJson } from "#/shared/lib/json.ts";

/** @internal */
export const LOCK_FILE = "vpa-lock.json";

/** @internal */
export type Lock = Readonly<Record<string, string>>;

const Sha256 = Schema.String.check(Schema.isPattern(/^[0-9a-f]{64}$/u));

const LockFile = Schema.Record(Schema.String, Sha256).pipe(Schema.fromJsonString);

const byUrl = Order.mapInput(Str.Order, ([url]: readonly [string, string]) => url);

const entryLine = ([url, sha256]: readonly [string, string]): string =>
  `  ${toJson(url)}: ${toJson(sha256)}`;

const render = (lock: Lock): string =>
  pipe(
    Rec.toEntries(lock),
    Arr.sortBy(byUrl),
    Arr.map(entryLine),
    Arr.join(",\n"),
    (body) => `{\n${body}\n}\n`,
  );

/** @internal */
export const readLock = (
  root: string,
): Effect.Effect<Lock, never, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* read() {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const text = yield* fs.readFileString(path.join(root, LOCK_FILE));
    return yield* Schema.decodeEffect(LockFile)(text);
  }).pipe(Effect.orElseSucceed((): Lock => ({})));

/** @internal */
export const writeLock =
  (root: string) =>
  (
    lock: Lock,
  ): Effect.Effect<void, PlatformError.PlatformError, FileSystem.FileSystem | Path.Path> =>
    Effect.gen(function* write() {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      yield* fs.writeFileString(path.join(root, LOCK_FILE), render(lock));
    });
