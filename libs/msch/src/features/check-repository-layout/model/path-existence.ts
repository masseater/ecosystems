import { Array as Arr, Effect, Option, String as Str } from "effect";

import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

const WILDCARD = /[*?[]/u;
const SEPARATOR = "/";
const FIRST = 0;

/** @internal */
export const existsAt = Effect.fn("existsAt")(function* existsAt(root: string, path: string) {
  const files = yield* RepositoryFiles;
  return yield* files.exists(files.join(root, path));
});

/** @internal */
export const isDirectoryAt = Effect.fn("isDirectoryAt")(function* isDirectoryAt(
  root: string,
  path: string,
) {
  const files = yield* RepositoryFiles;
  const directory = yield* files.isDirectory(files.join(root, path));
  return Option.getOrElse(directory, () => false);
});

/** @internal */
export const staticPrefix = (path: string): string => {
  const prefix = Arr.headNonEmpty(Str.split(path, WILDCARD));
  if (Str.endsWith(SEPARATOR)(prefix)) {
    return Str.slice(FIRST, -SEPARATOR.length)(prefix);
  }
  return prefix;
};

/** @internal */
export const isIgnored = Effect.fn("isIgnored")(function* isIgnored(root: string, path: string) {
  const prefix = staticPrefix(path);
  if (Str.isEmpty(prefix)) {
    return false;
  }
  const files = yield* RepositoryFiles;
  const ignored = yield* files.ignoredPaths(root, [prefix, `${prefix}${SEPARATOR}`]);
  return Arr.isReadonlyArrayNonEmpty(ignored);
});
