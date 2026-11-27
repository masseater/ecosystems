import { Array as Arr, Option, String as Str, pipe } from "effect";

export const baseName = (path: string): string =>
  pipe(
    Str.split("/")(path),
    Arr.filter(Str.isNonEmpty),
    Arr.last,
    Option.getOrElse(() => ""),
  );
