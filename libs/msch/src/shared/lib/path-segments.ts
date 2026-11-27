import { Array as Arr, Option, String as Str, pipe } from "effect";

export const SEPARATOR = "/";

const ROOT = ".";

export const baseName = (path: string): string =>
  pipe(
    Str.split(path, SEPARATOR),
    Arr.last,
    Option.getOrElse(() => path),
  );

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
