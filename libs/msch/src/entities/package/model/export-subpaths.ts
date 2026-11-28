import { Array as Arr, Predicate, Record as Rec, String as Str, pipe } from "effect";

import { ROOT_SUBPATH } from "./import-specifier.ts";

/** @internal */
export const exportEntriesOf = (exportsField: unknown): readonly (readonly [string, unknown])[] => {
  if (!Predicate.isObject(exportsField)) {
    return [[ROOT_SUBPATH, exportsField]];
  }
  const entries = Rec.toEntries(exportsField);
  if (
    pipe(
      entries,
      Arr.every(([subpath]) => Str.startsWith(ROOT_SUBPATH)(subpath)),
    )
  ) {
    return entries;
  }
  return [[ROOT_SUBPATH, exportsField]];
};
