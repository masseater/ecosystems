import { readWantedLockfile } from "@pnpm/lockfile.fs";
import { Effect, Option, Record as Rec } from "effect";

import { LockfileUnreadable } from "./lockfile-unreadable.ts";

export type WantedLockfile = NonNullable<Awaited<ReturnType<typeof readWantedLockfile>>>;

const readLockfile =
  <Selected>(select: (lockfile: WantedLockfile) => Option.Option<Selected>) =>
  (root: string): Effect.Effect<Option.Option<Selected>, LockfileUnreadable> =>
    Effect.tryPromise({
      try: () => readWantedLockfile(root, { ignoreIncompatible: false }),
      catch: (cause) => LockfileUnreadable.make({ root, reason: String(cause) }),
    }).pipe(Effect.map(Option.fromNullishOr), Effect.map(Option.flatMap(select)));

/** @internal */
export const wantedLockfile = readLockfile(Option.some);

/** @internal */
export const lockedPackages = readLockfile(({ packages }) =>
  Option.map(Option.fromUndefinedOr(packages), Rec.keys),
);
