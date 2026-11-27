import { arch, platform } from "node:os";

import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";

import type { CompatManifest } from "./compat-manifest.ts";
import { writeNative } from "./native-package.ts";
import { pack } from "./pack.ts";

type Entry = readonly [string, string];

interface Built {
  readonly directory: string;
  readonly manifest: CompatManifest;
  readonly binary: string;
  readonly target: string;
}

const HOST_PREFIX = `${platform()}-${arch()}-`;

const builtOf = (directory: string, manifest: CompatManifest): Option.Option<Built> =>
  pipe(
    Option.fromUndefinedOr(manifest.native),
    Option.flatMap(({ binary, targets }) =>
      pipe(
        targets,
        Arr.findFirst(Str.startsWith(HOST_PREFIX)),
        Option.map((target): Built => ({ directory, manifest, binary, target })),
      ),
    ),
  );

const packedNative = Effect.fn("compat.packedNative")(function* packedNative({
  directory,
  manifest,
  binary,
  target,
}: Built) {
  const written = yield* writeNative(directory, {
    name: manifest.name,
    version: manifest.version,
    binary,
    target,
  });
  const tarball = yield* pack(written);
  const entries: readonly Entry[] = [[`${manifest.name}-${target}`, tarball]];
  return entries;
});

/** @internal */
export const nativeTarballs = Effect.fn("compat.native")(function* nativeTarballs(
  directory: string,
  manifest: CompatManifest,
) {
  const none: readonly Entry[] = [];
  return yield* pipe(
    builtOf(directory, manifest),
    Option.match({ onNone: () => Effect.succeed(none), onSome: packedNative }),
  );
});
