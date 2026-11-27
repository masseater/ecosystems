import { Array as Arr, Option, String as Str, pipe } from "effect";

export const SEPARATOR = "/";

const ROOT = ".";
const EXTENSION = ".";
const BACKSLASH = "\\";
const NONE = 0;
const ONE = 1;

export const toPosix = Str.replaceAll(BACKSLASH, SEPARATOR);

export const segments = (path: string): Arr.NonEmptyReadonlyArray<string> =>
  Str.split(path, SEPARATOR);

export const joinAll = (parts: readonly string[]): string => Arr.join(parts, SEPARATOR);

export const join =
  (directory: string) =>
  (name: string): string =>
    Arr.join(Arr.filter([directory, name], Str.isNonEmpty), SEPARATOR);

export const parent = (path: string): string => joinAll(Arr.dropRight(segments(path), ONE));

export const ancestors = (path: string): readonly string[] => {
  const parts = Arr.dropRight(segments(path), ONE);
  return pipe(
    Arr.range(NONE, parts.length),
    Arr.reverse,
    Arr.map((count) => joinAll(Arr.take(parts, count))),
  );
};

export const baseName = (path: string): string =>
  pipe(
    segments(path),
    Arr.filter(Str.isNonEmpty),
    Arr.last,
    Option.getOrElse(() => ""),
  );

export const stem = (name: string): string =>
  pipe(
    Str.split(name, EXTENSION),
    Arr.head,
    Option.getOrElse(() => name),
  );

export const afterPrefix =
  (prefix: string) =>
  (text: string): Option.Option<string> =>
    pipe(Option.liftPredicate(text, Str.startsWith(prefix)), Option.map(Str.slice(prefix.length)));

export const isWithin =
  (directory: string) =>
  (path: string): boolean =>
    Str.isEmpty(directory) ||
    path === directory ||
    Str.startsWith(`${directory}${SEPARATOR}`)(path);

export const isInside =
  (directory: string) =>
  (path: string): boolean =>
    path !== directory && (directory === ROOT || isWithin(directory)(path));

export const below =
  (directory: string) =>
  (path: string): Option.Option<string> =>
    pipe(
      Option.liftPredicate(path, () => Str.isEmpty(directory)),
      Option.orElse(() => afterPrefix(`${directory}${SEPARATOR}`)(path)),
    );

export const relativeTo =
  (root: string) =>
  (file: string): Option.Option<string> =>
    below(toPosix(root))(toPosix(file));
