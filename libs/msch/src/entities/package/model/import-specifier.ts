import { String as Str, Function as Fn } from "effect";

const DATA_FIRST_ARITY = 2;

/** @internal */
export const ROOT_SUBPATH = ".";

/** @internal */
export const SUBPATH_PREFIX = "./";

/** @internal */
export const importSpecifierOf: {
  (subpath: string): (importName: string) => string;
  (importName: string, subpath: string): string;
} = Fn.dual(DATA_FIRST_ARITY, (importName: string, subpath: string): string => {
  if (subpath === ROOT_SUBPATH) {
    return importName;
  }
  return `${importName}/${Str.slice(SUBPATH_PREFIX.length)(subpath)}`;
});
